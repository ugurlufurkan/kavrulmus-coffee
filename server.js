// server.js
require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch {
    rateLimit = null;
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(express.json({ limit: '100kb' }));

// Güvenlik başlıkları
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Rate limit
if (rateLimit) {
    app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { mesaj: 'Çok fazla istek. Lütfen bekleyin.' } }));
    app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { mesaj: 'Çok fazla giriş denemesi.' } }));
    app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { mesaj: 'Çok fazla kayıt denemesi.' } }));
    app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: { mesaj: 'Çok fazla şifre sıfırlama isteği.' } }));
}

app.use(express.static(__dirname));

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeText(str, maxLen = 500) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLen);
}

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendMailSafe(options) {
    try {
        await transporter.sendMail(options);
    } catch (err) {
        console.error('❌ Mail gönderilemedi:', err.message);
    }
}

async function hosgeldinMailiGonder(kullanici) {
    await sendMailSafe({
        from: `"Kavrulmuş Kahve" <${process.env.EMAIL_USER}>`,
        to: kullanici.email,
        subject: 'Kavrulmuş\'a Hoş Geldiniz! ☕',
        html: `
            <h2>Merhaba ${escapeHtml(kullanici.ad_soyad || 'Kahve Sever')}!</h2>
            <p>Kavrulmuş ailesine katıldığınız için teşekkür ederiz.</p>
            <p>Artık sipariş verebilir, favorilerinizi kaydedebilir ve ürünlere yorum yapabilirsiniz.</p>
            <p><a href="${APP_URL}/urunler.html">Alışverişe Başla →</a></p>
        `
    });
}

async function sifreSifirlamaMailiGonder(email, token) {
    const link = `${APP_URL}/sifre-sifirla.html?token=${token}`;
    await sendMailSafe({
        from: `"Kavrulmuş Kahve" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Şifre Sıfırlama — Kavrulmuş',
        html: `
            <h2>Şifre Sıfırlama</h2>
            <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın (1 saat geçerlidir):</p>
            <p><a href="${link}">${link}</a></p>
            <p>Bu isteği siz yapmadıysanız bu e-postayı yok sayın.</p>
        `
    });
}

async function siparisMailleriGonder(siparis) {
    const urunListesiHtml = siparis.sepet.map(u =>
        `<li>${u.quantity}x ${escapeHtml(u.title)} — ${escapeHtml(String(u.price))} TL</li>`
    ).join('');

    if (siparis.userEmail && siparis.userEmail !== 'Misafir') {
        await sendMailSafe({
            from: `"Kavrulmuş Kahve" <${process.env.EMAIL_USER}>`,
            to: siparis.userEmail,
            subject: `Siparişiniz Alındı — #${siparis.takipNo}`,
            html: `
                <h2>Siparişiniz için teşekkürler, ${escapeHtml(siparis.musteriAd)}!</h2>
                <p>Takip numaranız: <strong>#${escapeHtml(siparis.takipNo)}</strong></p>
                <ul>${urunListesiHtml}</ul>
                <p><strong>Toplam: ${escapeHtml(String(siparis.toplamTutar))} TL</strong></p>
                <p>Teslimat Adresi: ${escapeHtml(siparis.adres)}</p>
            `
        });
    }

    await sendMailSafe({
        from: `"Kavrulmuş Sipariş Sistemi" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🔔 Yeni Sipariş! — #${siparis.takipNo}`,
        html: `
            <h2>Yeni bir sipariş geldi!</h2>
            <p><strong>Müşteri:</strong> ${escapeHtml(siparis.musteriAd)} (${escapeHtml(siparis.telefon)})</p>
            <ul>${urunListesiHtml}</ul>
            <p><strong>Toplam: ${escapeHtml(String(siparis.toplamTutar))} TL</strong></p>
        `
    });
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
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id)
            );
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                user_id INT REFERENCES users(id) ON DELETE SET NULL,
                kullanici_ad VARCHAR(255) NOT NULL,
                puan INT NOT NULL CHECK (puan >= 1 AND puan <= 5),
                yorum TEXT NOT NULL,
                tarih TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE
            );
        `);
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS ad_soyad VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS telefon VARCHAR(30);
        `);
        console.log('📦 SQL Veritabanı tabloları kontrol edildi/oluşturuldu.');
    } catch (err) {
        console.error('❌ Veritabanı tabloları oluşturulurken hata:', err);
    }
};
initDB();

function verifyCustomer(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ mesaj: 'Oturum bulunamadı. Lütfen giriş yapın.' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'customer') return res.status(403).json({ mesaj: 'Bu işlem için giriş yapmanız gerekiyor.' });
        req.user = decoded;
        next();
    });
}

function verifyAdmin(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ mesaj: 'Yetkisiz erişim: Token bulunamadı.' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'admin') return res.status(403).json({ mesaj: 'Yetkisiz erişim: Admin yetkisi gerekli.' });
        req.admin = decoded;
        next();
    });
}

function signCustomerToken(user) {
    return jwt.sign(
        { id: user.id, name: user.ad_soyad, phone: user.telefon, email: user.email, role: 'customer' },
        JWT_SECRET,
        { expiresIn: '2h' }
    );
}

// --- ADMIN ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ mesaj: 'Hatalı admin şifresi!' });
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '4h' });
    res.json({ mesaj: 'Admin girişi başarılı!', token });
});

app.get('/api/admin/verify', verifyAdmin, (req, res) => {
    res.json({ mesaj: 'Admin oturumu geçerli.' });
});

// --- ÜRÜNLER ---
app.get('/api/urunler', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
        res.json(result.rows);
    } catch {
        res.status(500).json({ mesaj: 'Ürünler okuma hatası' });
    }
});

app.get('/api/urunler/:id/yorumlar', async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ mesaj: 'Geçersiz ürün id.' });
    try {
        const result = await pool.query(
            'SELECT id, kullanici_ad, puan, yorum, tarih FROM reviews WHERE product_id = $1 ORDER BY tarih DESC',
            [id]
        );
        const avg = await pool.query(
            'SELECT COALESCE(AVG(puan), 0) AS ortalama, COUNT(*) AS toplam FROM reviews WHERE product_id = $1',
            [id]
        );
        res.json({
            yorumlar: result.rows,
            ortalama: Math.round(Number(avg.rows[0].ortalama) * 10) / 10,
            toplam: Number(avg.rows[0].toplam)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Yorumlar okunamadı.' });
    }
});

app.post('/api/urunler/:id/yorumlar', verifyCustomer, async (req, res) => {
    const { id } = req.params;
    const puan = parseInt(req.body.puan, 10);
    const yorum = sanitizeText(req.body.yorum, 1000);
    if (!/^\d+$/.test(id)) return res.status(400).json({ mesaj: 'Geçersiz ürün id.' });
    if (!puan || puan < 1 || puan > 5) return res.status(400).json({ mesaj: 'Puan 1-5 arası olmalı.' });
    if (!yorum) return res.status(400).json({ mesaj: 'Yorum boş olamaz.' });
    try {
        const urun = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
        if (!urun.rows.length) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
        const ad = req.user.name || req.user.email.split('@')[0];
        await pool.query(
            'INSERT INTO reviews (product_id, user_id, kullanici_ad, puan, yorum) VALUES ($1, $2, $3, $4, $5)',
            [id, req.user.id, sanitizeText(ad, 100), puan, yorum]
        );
        res.status(201).json({ mesaj: 'Yorumunuz eklendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Yorum eklenemedi.' });
    }
});

app.get('/api/urunler/:id', async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ mesaj: "Geçersiz ürün id'si" });
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (!result.rows.length) return res.status(404).json({ mesaj: 'Ürün bulunamadı' });
        res.json(result.rows[0]);
    } catch {
        res.status(500).json({ mesaj: 'Ürün okuma hatası' });
    }
});

app.post('/api/urunler', verifyAdmin, async (req, res) => {
    const { baslik, tur, fiyat, resimUrl, stok } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO products (baslik, tur, fiyat, resim, stok) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [sanitizeText(baslik, 255) || 'İsimsiz Kahve', sanitizeText(tur, 255) || 'Standart', fiyat || 0, resimUrl, parseInt(stok, 10) || 10]
        );
        res.status(201).json({ mesaj: 'Ürün başarıyla vitrine eklendi!', urun: result.rows[0] });
    } catch {
        res.status(500).json({ mesaj: 'Ürün kaydedilemedi' });
    }
});

// --- AUTH ---
app.post('/api/auth/register', async (req, res) => {
    const adSoyad = sanitizeText(req.body.adSoyad, 255);
    const telefon = sanitizeText(req.body.telefon, 30);
    const email = sanitizeText(req.body.email, 255).toLowerCase();
    const password = req.body.password;
    if (!adSoyad || !isValidEmail(email) || !password || password.length < 6) {
        return res.status(400).json({ mesaj: 'Geçerli ad, e-posta ve en az 6 karakter şifre gerekli.' });
    }
    try {
        const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length) return res.status(400).json({ mesaj: 'Bu e-posta zaten kullanımda!' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (ad_soyad, telefon, email, password) VALUES ($1, $2, $3, $4) RETURNING id, ad_soyad, telefon, email',
            [adSoyad, telefon, email, hashedPassword]
        );
        const yeniKullanici = result.rows[0];
        hosgeldinMailiGonder(yeniKullanici).catch(() => {});
        const token = signCustomerToken(yeniKullanici);
        res.status(201).json({
            mesaj: 'Kayıt başarıyla tamamlandı!',
            token,
            user: { name: yeniKullanici.ad_soyad, phone: yeniKullanici.telefon, email: yeniKullanici.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Kayıt başarısız' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const email = sanitizeText(req.body.email, 255).toLowerCase();
    const password = req.body.password;
    if (!isValidEmail(email) || !password) return res.status(400).json({ mesaj: 'E-posta ve şifre gerekli.' });
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ mesaj: 'Hatalı e-posta veya şifre!' });
        }
        const token = signCustomerToken(user);
        res.json({
            mesaj: 'Giriş başarılı, hoş geldin!',
            token,
            user: { name: user.ad_soyad, phone: user.telefon, email: user.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Giriş yapılırken sunucu hatası' });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const email = sanitizeText(req.body.email, 255).toLowerCase();
    if (!isValidEmail(email)) return res.status(400).json({ mesaj: 'Geçerli e-posta girin.' });
    try {
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (result.rows.length) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000);
            await pool.query(
                'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [result.rows[0].id, token, expires]
            );
            sifreSifirlamaMailiGonder(email, token).catch(() => {});
        }
        res.json({ mesaj: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi (varsa).' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'İşlem başarısız.' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    const token = sanitizeText(req.body.token, 255);
    const yeniSifre = req.body.yeniSifre;
    if (!token || !yeniSifre || yeniSifre.length < 6) {
        return res.status(400).json({ mesaj: 'Geçerli token ve en az 6 karakter şifre gerekli.' });
    }
    try {
        const result = await pool.query(
            `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
            [token]
        );
        if (!result.rows.length) return res.status(400).json({ mesaj: 'Geçersiz veya süresi dolmuş bağlantı.' });
        const row = result.rows[0];
        const hashed = await bcrypt.hash(yeniSifre, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, row.user_id]);
        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [row.id]);
        res.json({ mesaj: 'Şifreniz güncellendi. Giriş yapabilirsiniz.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Şifre güncellenemedi.' });
    }
});

app.get('/api/auth/me', verifyCustomer, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, ad_soyad, telefon, email, kayit_tarihi FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ mesaj: 'Kullanıcı bulunamadı.' });
        const user = result.rows[0];
        res.json({ id: user.id, name: user.ad_soyad, phone: user.telefon, email: user.email, kayitTarihi: user.kayit_tarihi });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Profil bilgileri alınamadı.' });
    }
});

app.put('/api/auth/profile', verifyCustomer, async (req, res) => {
    const adSoyad = sanitizeText(req.body.adSoyad, 255);
    const telefon = sanitizeText(req.body.telefon, 30);
    const email = sanitizeText(req.body.email, 255).toLowerCase();
    if (!adSoyad || !isValidEmail(email)) return res.status(400).json({ mesaj: 'Ad soyad ve geçerli e-posta zorunludur.' });
    try {
        const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
        if (emailCheck.rows.length) return res.status(400).json({ mesaj: 'Bu e-posta başka bir hesapta kullanılıyor.' });
        const result = await pool.query(
            'UPDATE users SET ad_soyad = $1, telefon = $2, email = $3 WHERE id = $4 RETURNING id, ad_soyad, telefon, email',
            [adSoyad, telefon || null, email, req.user.id]
        );
        const user = result.rows[0];
        res.json({ mesaj: 'Profil bilgileriniz güncellendi.', user: { name: user.ad_soyad, phone: user.telefon, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Profil güncellenemedi.' });
    }
});

app.put('/api/auth/password', verifyCustomer, async (req, res) => {
    const { mevcutSifre, yeniSifre } = req.body;
    if (!mevcutSifre || !yeniSifre || yeniSifre.length < 6) {
        return res.status(400).json({ mesaj: 'Mevcut ve yeni şifre (min 6 karakter) zorunludur.' });
    }
    try {
        const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (!result.rows.length || !(await bcrypt.compare(mevcutSifre, result.rows[0].password))) {
            return res.status(401).json({ mesaj: 'Mevcut şifre hatalı.' });
        }
        const hashed = await bcrypt.hash(yeniSifre, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
        res.json({ mesaj: 'Şifreniz başarıyla güncellendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Şifre güncellenemedi.' });
    }
});

// --- FAVORİLER (DB) ---
app.get('/api/favoriler', verifyCustomer, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT product_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows.map(r => r.product_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Favoriler okunamadı.' });
    }
});

app.post('/api/favoriler/:productId', verifyCustomer, async (req, res) => {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ mesaj: 'Geçersiz ürün.' });
    try {
        const urun = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);
        if (!urun.rows.length) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
        const existing = await pool.query(
            'SELECT id FROM favorites WHERE user_id = $1 AND product_id = $2',
            [req.user.id, productId]
        );
        if (existing.rows.length) {
            await pool.query('DELETE FROM favorites WHERE user_id = $1 AND product_id = $2', [req.user.id, productId]);
            return res.json({ mesaj: 'Favorilerden kaldırıldı.', favoride: false });
        }
        await pool.query('INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)', [req.user.id, productId]);
        res.json({ mesaj: 'Favorilere eklendi.', favoride: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Favori işlemi başarısız.' });
    }
});

app.post('/api/favoriler/sync', verifyCustomer, async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    try {
        for (const pid of ids) {
            await pool.query(
                'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING',
                [req.user.id, pid]
            );
        }
        const result = await pool.query('SELECT product_id FROM favorites WHERE user_id = $1', [req.user.id]);
        res.json(result.rows.map(r => r.product_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Senkronizasyon başarısız.' });
    }
});

// --- SİPARİŞLER ---
app.get('/api/siparislerim', verifyCustomer, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE user_email = $1 ORDER BY tarih DESC', [req.user.email]);
        res.json(result.rows.map(row => ({
            id: row.id, tarih: row.tarih, musteriAd: row.musteri_ad, telefon: row.telefon,
            adres: row.adres, odemeYontemi: row.odeme_yontemi, urunler: row.urunler,
            toplamTutar: row.toplam_tutar, durum: row.durum
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Siparişler okunamadı.' });
    }
});

app.post('/api/siparis', async (req, res) => {
    const musteriAd = sanitizeText(req.body.musteriAd, 255);
    const telefon = sanitizeText(req.body.telefon, 50);
    const adres = sanitizeText(req.body.adres, 500);
    const odemeYontemi = sanitizeText(req.body.odemeYontemi, 50);
    const { sepet, userEmail } = req.body;

    if (!musteriAd || !telefon || !adres || !odemeYontemi || !Array.isArray(sepet) || !sepet.length) {
        return res.status(400).json({ mesaj: 'Eksik sipariş bilgisi.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const validatedSepet = [];
        let serverTotal = 0;

        for (const item of sepet) {
            const productId = parseInt(item.id, 10);
            const qty = parseInt(item.quantity, 10);
            if (!productId || !qty || qty < 1 || qty > 99) {
                await client.query('ROLLBACK');
                return res.status(400).json({ mesaj: 'Geçersiz sepet ürünü.' });
            }

            const prodResult = await client.query(
                'SELECT id, baslik, fiyat, stok, resim FROM products WHERE id = $1 FOR UPDATE',
                [productId]
            );
            if (!prodResult.rows.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ mesaj: `Ürün bulunamadı (#${productId}).` });
            }

            const prod = prodResult.rows[0];
            if (prod.stok < qty) {
                await client.query('ROLLBACK');
                return res.status(400).json({ mesaj: `"${prod.baslik}" için yeterli stok yok (kalan: ${prod.stok}).` });
            }

            const price = parseFloat(prod.fiyat);
            serverTotal += price * qty;
            validatedSepet.push({
                id: String(prod.id),
                title: prod.baslik,
                price,
                image: prod.resim || item.image || '',
                quantity: qty
            });
        }

        const takipNo = 'KVR-' + Math.floor(1000 + Math.random() * 9000);
        await client.query(
            `INSERT INTO orders (id, musteri_ad, telefon, adres, odeme_yontemi, user_email, urunler, toplam_tutar)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [takipNo, musteriAd, telefon, adres, odemeYontemi, userEmail || 'Misafir', JSON.stringify(validatedSepet), serverTotal]
        );

        for (const item of validatedSepet) {
            await client.query(
                'UPDATE products SET stok = stok - $1 WHERE id = $2',
                [item.quantity, item.id]
            );
        }

        await client.query('COMMIT');
        siparisMailleriGonder({
            musteriAd, telefon, adres, odemeYontemi,
            sepet: validatedSepet, toplamTutar: serverTotal, userEmail, takipNo
        }).catch(() => {});
        res.status(201).json({ mesaj: 'Sipariş başarıyla alındı!', takipNo, toplamTutar: serverTotal });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ mesaj: 'Sipariş kaydedilemedi' });
    } finally {
        client.release();
    }
});

app.get('/api/siparisler', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY tarih DESC');
        res.json(result.rows.map(row => ({
            id: row.id, tarih: row.tarih, musteriAd: row.musteri_ad, telefon: row.telefon,
            adres: row.adres, odemeYontemi: row.odeme_yontemi, userEmail: row.user_email,
            urunler: row.urunler, toplamTutar: row.toplam_tutar, durum: row.durum
        })));
    } catch {
        res.status(500).json({ mesaj: 'Siparişler okunamadı' });
    }
});

app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 KAVRULMUŞ BACKEND AKTİF!');
    console.log(`🌍 Sunucu adresi: ${APP_URL}`);
    console.log('=================================');
});
