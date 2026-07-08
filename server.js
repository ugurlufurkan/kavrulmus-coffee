// server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.use(express.static(__dirname));
app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// --- MAIL GÖNDERİCİ (GMAIL) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function siparisMailleriGonder(siparis) {
    const urunListesiHtml = siparis.sepet.map(u =>
        `<li>${u.quantity}x ${u.title} — ${u.price} TL</li>`
    ).join('');

    if (siparis.userEmail && siparis.userEmail !== 'Misafir') {
        try {
            await transporter.sendMail({
                from: `"Kavrulmuş Kahve" <${process.env.EMAIL_USER}>`,
                to: siparis.userEmail,
                subject: `Siparişiniz Alındı — #${siparis.takipNo}`,
                html: `
                    <h2>Siparişiniz için teşekkürler, ${siparis.musteriAd}!</h2>
                    <p>Takip numaranız: <strong>#${siparis.takipNo}</strong></p>
                    <ul>${urunListesiHtml}</ul>
                    <p><strong>Toplam: ${siparis.toplamTutar} TL</strong></p>
                    <p>Teslimat Adresi: ${siparis.adres}</p>
                    <p>Ödeme Yöntemi: ${siparis.odemeYontemi === 'card' ? 'Kredi/Banka Kartı' : 'Kapıda Ödeme'}</p>
                `
            });
        } catch (err) {
            console.error("❌ Müşteri maili gönderilemedi:", err.message);
        }
    }

    try {
        await transporter.sendMail({
            from: `"Kavrulmuş Sipariş Sistemi" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: `🔔 Yeni Sipariş! — #${siparis.takipNo}`,
            html: `
                <h2>Yeni bir sipariş geldi!</h2>
                <p><strong>Müşteri:</strong> ${siparis.musteriAd} (${siparis.telefon})</p>
                <p><strong>Ödeme:</strong> ${siparis.odemeYontemi === 'card' ? 'Kredi/Banka Kartı' : 'Kapıda Ödeme'}</p>
                <ul>${urunListesiHtml}</ul>
                <p><strong>Toplam: ${siparis.toplamTutar} TL</strong></p>
                <p><strong>Adres:</strong> ${siparis.adres}</p>
            `
        });
    } catch (err) {
        console.error("❌ Admin maili gönderilemedi:", err.message);
    }
}

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            ad_soyad VARCHAR(255),
            telefon VARCHAR(30),
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            kayit_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
            
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                baslik VARCHAR(255) NOT NULL,
                tur VARCHAR(255) NOT NULL,
                fiyat NUMERIC NOT NULL,
                resim TEXT,
                stok INT DEFAULT 10
            );

            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(50) PRIMARY KEY,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                musteri_ad VARCHAR(255),
                telefon VARCHAR(50),
                adres TEXT,
                odeme_yontemi VARCHAR(50),
                user_email VARCHAR(255),
                urunler JSONB,
                toplam_tutar NUMERIC,
                durum VARCHAR(50) DEFAULT 'Hazırlanıyor'
            );
        `);

        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_soyad VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS telefon VARCHAR(30);
        `);

        console.log("📦 SQL Veritabanı tabloları kontrol edildi/oluşturuldu.");
    } catch (err) {
        console.error("❌ Veritabanı tabloları oluşturulurken hata:", err);
    }
};
initDB();

// --- MÜŞTERİ YETKİ KONTROLÜ (MIDDLEWARE) ---
function verifyCustomer(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mesaj: 'Oturum bulunamadı. Lütfen giriş yapın.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'customer') {
            return res.status(403).json({ mesaj: 'Bu işlem için giriş yapmanız gerekiyor.' });
        }
        req.user = decoded;
        next();
    });
}

// --- ADMIN YETKİ KONTROLÜ (MIDDLEWARE) ---
function verifyAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mesaj: "Yetkisiz erişim: Token bulunamadı." });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'admin') {
            return res.status(403).json({ mesaj: "Yetkisiz erişim: Bu işlem için admin yetkisi gerekli." });
        }
        req.admin = decoded;
        next();
    });
}

// --- ADMIN GİRİŞ API'SI ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (!password || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ mesaj: "Hatalı admin şifresi!" });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '4h' });
    res.status(200).json({ mesaj: "Admin girişi başarılı!", token });
});

// 1. API: Ürünleri Çek
app.get('/api/urunler', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ mesaj: "Ürünler okuma hatası" });
    }
});

// 1b. API: TEK BİR ÜRÜNÜ ID İLE ÇEK
app.get('/api/urunler/:id', async (req, res) => {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
        return res.status(400).json({ mesaj: "Geçersiz ürün id'si" });
    }

    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ mesaj: "Ürün bulunamadı" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ mesaj: "Ürün okuma hatası" });
    }
});

// 2. API: YENİ ÜRÜN EKLE (KORUMALI)
app.post('/api/urunler', verifyAdmin, async (req, res) => {
    const { baslik, tur, fiyat, resimUrl, stok } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (baslik, tur, fiyat, resim, stok) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [baslik || "İsimsiz Kahve", tur || "Standart", fiyat || 0, resimUrl, parseInt(stok) || 10]
        );
        res.status(201).json({ mesaj: "Ürün başarıyla vitrine eklendi!", urun: result.rows[0] });
    } catch (err) {
        res.status(500).json({ mesaj: "Ürün kaydedilemedi" });
    }
});

// 3. API: YENİ ÜYE KAYDI
app.post('/api/auth/register', async (req, res) => {
    console.log("BODY:", req.body);

    const { adSoyad, telefon, email, password } = req.body;
    try {
        const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) return res.status(400).json({ mesaj: "Bu e-posta zaten kullanımda!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO users (ad_soyad, telefon, email, password)
             VALUES ($1, $2, $3, $4)
             RETURNING id, ad_soyad, telefon, email`,
            [adSoyad, telefon, email, hashedPassword]
        );

        const yeniKullanici = result.rows[0];

        const token = jwt.sign(
            {
                id: yeniKullanici.id,
                name: yeniKullanici.ad_soyad,
                email: yeniKullanici.email,
                role: 'customer'
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.status(201).json({
            mesaj: "Kayıt başarıyla tamamlandı!",
            token,
            user: {
                name: yeniKullanici.ad_soyad,
                phone: yeniKullanici.telefon,
                email: yeniKullanici.email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: "Kayıt başarısız" });
    }
});

// 4. API: GİRİŞ YAP
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        console.log("USER:", user);

        if (!user) {
            return res.status(401).json({ mesaj: "Hatalı e-posta veya şifre!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ mesaj: "Hatalı e-posta veya şifre!" });
        }

        const token = jwt.sign(
            {
                id: user.id,
                name: user.ad_soyad,
                phone: user.telefon,
                email: user.email,
                role: 'customer'
            },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.status(200).json({
            mesaj: "Giriş başarılı, hoş geldin!",
            token,
            user: {
                name: user.ad_soyad,
                phone: user.telefon,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: "Giriş yapılırken sunucu hatası" });
    }
});

// 4b. API: PROFİL BİLGİLERİNİ GETİR
app.get('/api/auth/me', verifyCustomer, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, ad_soyad, telefon, email, kayit_tarihi FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mesaj: 'Kullanıcı bulunamadı.' });
        }

        const user = result.rows[0];
        res.json({
            id: user.id,
            name: user.ad_soyad,
            phone: user.telefon,
            email: user.email,
            kayitTarihi: user.kayit_tarihi
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Profil bilgileri alınamadı.' });
    }
});

// 4c. API: PROFİL GÜNCELLE
app.put('/api/auth/profile', verifyCustomer, async (req, res) => {
    const { adSoyad, telefon, email } = req.body;

    if (!adSoyad || !email) {
        return res.status(400).json({ mesaj: 'Ad soyad ve e-posta zorunludur.' });
    }

    try {
        const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, req.user.id]
        );
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ mesaj: 'Bu e-posta başka bir hesapta kullanılıyor.' });
        }

        const result = await pool.query(
            `UPDATE users SET ad_soyad = $1, telefon = $2, email = $3
             WHERE id = $4
             RETURNING id, ad_soyad, telefon, email`,
            [adSoyad, telefon || null, email, req.user.id]
        );

        const user = result.rows[0];
        res.json({
            mesaj: 'Profil bilgileriniz güncellendi.',
            user: {
                name: user.ad_soyad,
                phone: user.telefon,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Profil güncellenemedi.' });
    }
});

// 4d. API: ŞİFRE DEĞİŞTİR
app.put('/api/auth/password', verifyCustomer, async (req, res) => {
    const { mevcutSifre, yeniSifre } = req.body;

    if (!mevcutSifre || !yeniSifre) {
        return res.status(400).json({ mesaj: 'Mevcut ve yeni şifre zorunludur.' });
    }
    if (yeniSifre.length < 6) {
        return res.status(400).json({ mesaj: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ mesaj: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(mevcutSifre, user.password);
        if (!isMatch) {
            return res.status(401).json({ mesaj: 'Mevcut şifre hatalı.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(yeniSifre, salt);

        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
        res.json({ mesaj: 'Şifreniz başarıyla güncellendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Şifre güncellenemedi.' });
    }
});

// 4e. API: KULLANICININ SİPARİŞLERİ
app.get('/api/siparislerim', verifyCustomer, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM orders WHERE user_email = $1 ORDER BY tarih DESC',
            [req.user.email]
        );

        const siparisler = result.rows.map(row => ({
            id: row.id,
            tarih: row.tarih,
            musteriAd: row.musteri_ad,
            telefon: row.telefon,
            adres: row.adres,
            odemeYontemi: row.odeme_yontemi,
            urunler: row.urunler,
            toplamTutar: row.toplam_tutar,
            durum: row.durum
        }));

        res.json(siparisler);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Siparişler okunamadı.' });
    }
});

// 5. API: SİPARİŞİ KAYDET VE STOKLARI DÜŞÜR
app.post('/api/siparis', async (req, res) => {
    const { musteriAd, telefon, adres, odemeYontemi, sepet, toplamTutar, userEmail } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const takipNo = 'KVR-' + Math.floor(1000 + Math.random() * 9000);

        await client.query(
            `INSERT INTO orders (id, musteri_ad, telefon, adres, odeme_yontemi, user_email, urunler, toplam_tutar) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [takipNo, musteriAd, telefon, adres, odemeYontemi, userEmail, JSON.stringify(sepet), toplamTutar]
        );

        for (const item of sepet) {
            await client.query(
                'UPDATE products SET stok = GREATEST(0, stok - $1) WHERE id = $2',
                [item.quantity, item.id]
            );
        }

        await client.query('COMMIT');

        siparisMailleriGonder({
            musteriAd, telefon, adres, odemeYontemi, sepet, toplamTutar, userEmail, takipNo
        }).catch(err => console.error("❌ Mail gönderim hatası:", err.message));

        res.status(201).json({ mesaj: "Sipariş başarıyla alındı!", takipNo });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ mesaj: "Sipariş kaydedilemedi" });
    } finally {
        client.release();
    }
});

// 6. API: SİPARİŞLERİ GETİR (KORUMALI)
app.get('/api/siparisler', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY tarih DESC');

        const formatliSiparisler = result.rows.map(row => ({
            id: row.id,
            tarih: row.tarih,
            musteriAd: row.musteri_ad,
            telefon: row.telefon,
            adres: row.adres,
            odemeYontemi: row.odeme_yontemi,
            userEmail: row.user_email,
            urunler: row.urunler,
            toplamTutar: row.toplam_tutar,
            durum: row.durum
        }));

        res.json(formatliSiparisler);
    } catch (err) {
        res.status(500).json({ mesaj: "Siparişler okunamadı" });
    }
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 KAVRULMUŞ BACKEND (POSTGRESQL + GÜVENLİ ADMIN) AKTİF!`);
    console.log(`🌍 Sunucu adresi: http://localhost:${PORT}`);
    console.log(`=================================`);
});