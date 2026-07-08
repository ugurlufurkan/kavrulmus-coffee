// server.js
require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { eq, and, desc, asc, ne, gt, sql } = require('drizzle-orm');

const { db, pool } = require('./db');
const {
    users,
    products,
    orders,
    favorites,
    reviews,
    passwordResetTokens,
    contactMessages,
} = require('./db/schema');
const { runMigrations } = require('./db/migrate');

let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch {
    rateLimit = null;
}

const app = express();

// Render/Heroku gibi tek reverse-proxy arkasında çalışırken şart.
// Olmazsa: production'da "X-Forwarded-For" header'ı geldiğinde
// express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR hatası fırlatır
// ve TÜM /api/ istekleri 500 döner. Yerelde (localhost) bu header
// gelmediği için fark edilmez, sadece prod'da ortaya çıkar.
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

if (!JWT_SECRET || !ADMIN_PASSWORD) {
    console.warn('⚠️  JWT_SECRET ve ADMIN_PASSWORD .env dosyasında tanımlı olmalı.');
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Production ortamında zorunlu env değişkenleri eksik.');
        process.exit(1);
    }
}

app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

if (rateLimit) {
    app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { mesaj: 'Çok fazla istek. Lütfen bekleyin.' } }));
    app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { mesaj: 'Çok fazla giriş denemesi.' } }));
    app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { mesaj: 'Çok fazla kayıt denemesi.' } }));
    app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: { mesaj: 'Çok fazla şifre sıfırlama isteği.' } }));
    app.use('/api/iletisim', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { mesaj: 'Çok fazla mesaj gönderdiniz.' } }));
}

app.use((req, res, next) => {
    const blocked = ['/.env', '/node_modules', '/.git'];
    if (blocked.some(p => req.path === p || req.path.startsWith(p + '/'))) {
        return res.status(404).end();
    }
    next();
});

app.use(express.static(__dirname, {
    dotfiles: 'deny',
    index: false
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', async (req, res) => {
    try {
        await db.execute(sql`SELECT 1`);
        res.json({ ok: true, uptime: process.uptime() });
    } catch {
        res.status(503).json({ ok: false, mesaj: 'Veritabanı bağlantısı yok' });
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

function isMailConfigured() {
    return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

async function verifyMailOnStartup() {
    if (!isMailConfigured()) {
        console.warn('📭 E-posta devre dışı — .env dosyasına EMAIL_USER ve EMAIL_PASS (Gmail uygulama şifresi) ekleyin.');
        return;
    }
    try {
        await transporter.verify();
        console.log('📧 Gmail SMTP bağlantısı hazır.');
    } catch (err) {
        console.warn('⚠️  Gmail SMTP doğrulanamadı:', err.message);
        console.warn('   Google Hesap > Güvenlik > Uygulama şifreleri ile yeni şifre oluşturun.');
    }
}
verifyMailOnStartup();

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
    if (!isMailConfigured()) {
        return false;
    }
    try {
        await transporter.sendMail({
            ...options,
            from: options.from || `"Kavrulmuş Kahve" <${process.env.EMAIL_USER}>`
        });
        return true;
    } catch (err) {
        console.error('❌ Mail gönderilemedi:', err.message);
        return false;
    }
}

async function hosgeldinMailiGonder(kullanici) {
    return sendMailSafe({
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
    return sendMailSafe({
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
        { id: user.id, name: user.ad_soyad || user.adSoyad, phone: user.telefon, email: user.email, role: 'customer' },
        JWT_SECRET,
        { expiresIn: '2h' }
    );
}

function mapOrderRow(row) {
    return {
        id: row.id,
        tarih: row.tarih,
        musteriAd: row.musteriAd,
        telefon: row.telefon,
        adres: row.adres,
        odemeYontemi: row.odemeYontemi,
        userEmail: row.userEmail,
        urunler: row.urunler,
        toplamTutar: row.toplamTutar,
        durum: row.durum,
    };
}

// --- ADMIN ---
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (!password || password !== ADMIN_PASSWORD) return res.status(401).json({ mesaj: 'Hatalı admin şifresi!' });
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ mesaj: 'Admin girişi başarılı!', token });
});

app.get('/api/admin/verify', verifyAdmin, (req, res) => {
    res.json({ mesaj: 'Admin oturumu geçerli.' });
});

// --- ÜRÜNLER ---
app.get('/api/urunler', async (req, res) => {
    try {
        const rows = await db.select().from(products).orderBy(asc(products.id));
        res.json(rows);
    } catch (err) {
        console.error('GET /api/urunler hatası:', err.message);
        res.status(500).json({ mesaj: 'Ürünler okuma hatası' });
    }
});

app.get('/api/urunler/:id/yorumlar', async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ mesaj: 'Geçersiz ürün id.' });
    const productId = parseInt(id, 10);
    try {
        const yorumlar = await db
            .select({
                id: reviews.id,
                kullanici_ad: reviews.kullaniciAd,
                puan: reviews.puan,
                yorum: reviews.yorum,
                tarih: reviews.tarih,
            })
            .from(reviews)
            .where(eq(reviews.productId, productId))
            .orderBy(desc(reviews.tarih));

        const [avg] = await db
            .select({
                ortalama: sql`COALESCE(AVG(${reviews.puan}), 0)`.mapWith(String),
                toplam: sql`COUNT(*)`.mapWith(Number),
            })
            .from(reviews)
            .where(eq(reviews.productId, productId));

        res.json({
            yorumlar,
            ortalama: Math.round(Number(avg.ortalama) * 10) / 10,
            toplam: avg.toplam,
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
    const productId = parseInt(id, 10);
    if (!puan || puan < 1 || puan > 5) return res.status(400).json({ mesaj: 'Puan 1-5 arası olmalı.' });
    if (!yorum) return res.status(400).json({ mesaj: 'Yorum boş olamaz.' });
    try {
        const [urun] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
        if (!urun) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
        const ad = req.user.name || req.user.email.split('@')[0];
        await db.insert(reviews).values({
            productId,
            userId: req.user.id,
            kullaniciAd: sanitizeText(ad, 100),
            puan,
            yorum,
        });
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
        const [row] = await db.select().from(products).where(eq(products.id, parseInt(id, 10)));
        if (!row) return res.status(404).json({ mesaj: 'Ürün bulunamadı' });
        res.json(row);
    } catch {
        res.status(500).json({ mesaj: 'Ürün okuma hatası' });
    }
});

app.post('/api/urunler', verifyAdmin, async (req, res) => {
    const { baslik, tur, fiyat, resimUrl, stok } = req.body;
    try {
        const [urun] = await db
            .insert(products)
            .values({
                baslik: sanitizeText(baslik, 255) || 'İsimsiz Kahve',
                tur: sanitizeText(tur, 255) || 'Standart',
                fiyat: String(fiyat || 0),
                resim: resimUrl,
                stok: parseInt(stok, 10) || 10,
            })
            .returning();
        res.status(201).json({ mesaj: 'Ürün başarıyla vitrine eklendi!', urun });
    } catch {
        res.status(500).json({ mesaj: 'Ürün kaydedilemedi' });
    }
});

app.put('/api/urunler/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ mesaj: 'Geçersiz ürün id.' });
    const { baslik, tur, fiyat, resimUrl, stok } = req.body;
    try {
        const [urun] = await db
            .update(products)
            .set({
                baslik: sanitizeText(baslik, 255) || 'İsimsiz Kahve',
                tur: sanitizeText(tur, 255) || 'Standart',
                fiyat: String(parseFloat(fiyat) || 0),
                resim: resimUrl || '',
                stok: parseInt(stok, 10) || 0,
            })
            .where(eq(products.id, parseInt(id, 10)))
            .returning();
        if (!urun) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
        res.json({ mesaj: 'Ürün güncellendi.', urun });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Ürün güncellenemedi.' });
    }
});

app.delete('/api/urunler/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ mesaj: 'Geçersiz ürün id.' });
    try {
        const deleted = await db
            .delete(products)
            .where(eq(products.id, parseInt(id, 10)))
            .returning({ id: products.id });
        if (!deleted.length) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
        res.json({ mesaj: 'Ürün silindi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Ürün silinemedi.' });
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
        const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
        if (existing) return res.status(400).json({ mesaj: 'Bu e-posta zaten kullanımda!' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const [yeniKullanici] = await db
            .insert(users)
            .values({ adSoyad, telefon, email, password: hashedPassword })
            .returning({
                id: users.id,
                ad_soyad: users.adSoyad,
                telefon: users.telefon,
                email: users.email,
            });
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
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ mesaj: 'Hatalı e-posta veya şifre!' });
        }
        const token = signCustomerToken({
            id: user.id,
            ad_soyad: user.adSoyad,
            telefon: user.telefon,
            email: user.email,
        });
        res.json({
            mesaj: 'Giriş başarılı, hoş geldin!',
            token,
            user: { name: user.adSoyad, phone: user.telefon, email: user.email }
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
        const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 60 * 60 * 1000);
            await db.insert(passwordResetTokens).values({
                userId: user.id,
                token,
                expiresAt: expires,
            });
            const mailOk = await sifreSifirlamaMailiGonder(email, token);
            if (!mailOk && !isMailConfigured()) {
                return res.json({
                    mesaj: 'Şifre sıfırlama kaydı oluşturuldu ancak e-posta gönderilemedi. Sunucu yöneticisi EMAIL_USER/EMAIL_PASS ayarlamalı.',
                    mailGonderildi: false
                });
            }
        }
        res.json({ mesaj: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi (varsa).', mailGonderildi: isMailConfigured() });
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
        const [row] = await db
            .select()
            .from(passwordResetTokens)
            .where(and(
                eq(passwordResetTokens.token, token),
                eq(passwordResetTokens.used, false),
                gt(passwordResetTokens.expiresAt, sql`NOW()`)
            ));
        if (!row) return res.status(400).json({ mesaj: 'Geçersiz veya süresi dolmuş bağlantı.' });
        const hashed = await bcrypt.hash(yeniSifre, 10);
        await db.update(users).set({ password: hashed }).where(eq(users.id, row.userId));
        await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, row.id));
        res.json({ mesaj: 'Şifreniz güncellendi. Giriş yapabilirsiniz.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Şifre güncellenemedi.' });
    }
});

app.get('/api/auth/me', verifyCustomer, async (req, res) => {
    try {
        const [user] = await db
            .select({
                id: users.id,
                ad_soyad: users.adSoyad,
                telefon: users.telefon,
                email: users.email,
                kayit_tarihi: users.kayitTarihi,
            })
            .from(users)
            .where(eq(users.id, req.user.id));
        if (!user) return res.status(404).json({ mesaj: 'Kullanıcı bulunamadı.' });
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
        const [emailCheck] = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.email, email), ne(users.id, req.user.id)));
        if (emailCheck) return res.status(400).json({ mesaj: 'Bu e-posta başka bir hesapta kullanılıyor.' });
        const [user] = await db
            .update(users)
            .set({ adSoyad, telefon: telefon || null, email })
            .where(eq(users.id, req.user.id))
            .returning({
                id: users.id,
                ad_soyad: users.adSoyad,
                telefon: users.telefon,
                email: users.email,
            });
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
        const [user] = await db.select({ password: users.password }).from(users).where(eq(users.id, req.user.id));
        if (!user || !(await bcrypt.compare(mevcutSifre, user.password))) {
            return res.status(401).json({ mesaj: 'Mevcut şifre hatalı.' });
        }
        const hashed = await bcrypt.hash(yeniSifre, 10);
        await db.update(users).set({ password: hashed }).where(eq(users.id, req.user.id));
        res.json({ mesaj: 'Şifreniz başarıyla güncellendi.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Şifre güncellenemedi.' });
    }
});

// --- FAVORİLER ---
app.get('/api/favoriler', verifyCustomer, async (req, res) => {
    try {
        const rows = await db
            .select({ product_id: favorites.productId })
            .from(favorites)
            .where(eq(favorites.userId, req.user.id))
            .orderBy(desc(favorites.createdAt));
        res.json(rows.map(r => r.product_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Favoriler okunamadı.' });
    }
});

app.post('/api/favoriler/:productId', verifyCustomer, async (req, res) => {
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.status(400).json({ mesaj: 'Geçersiz ürün.' });
    try {
        const [urun] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId));
        if (!urun) return res.status(404).json({ mesaj: 'Ürün bulunamadı.' });
        const [existing] = await db
            .select({ id: favorites.id })
            .from(favorites)
            .where(and(eq(favorites.userId, req.user.id), eq(favorites.productId, productId)));
        if (existing) {
            await db
                .delete(favorites)
                .where(and(eq(favorites.userId, req.user.id), eq(favorites.productId, productId)));
            return res.json({ mesaj: 'Favorilerden kaldırıldı.', favoride: false });
        }
        await db.insert(favorites).values({ userId: req.user.id, productId });
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
            await db
                .insert(favorites)
                .values({ userId: req.user.id, productId: pid })
                .onConflictDoNothing({ target: [favorites.userId, favorites.productId] });
        }
        const rows = await db
            .select({ product_id: favorites.productId })
            .from(favorites)
            .where(eq(favorites.userId, req.user.id));
        res.json(rows.map(r => r.product_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Senkronizasyon başarısız.' });
    }
});

// --- SİPARİŞLER ---
app.get('/api/siparislerim', verifyCustomer, async (req, res) => {
    try {
        const rows = await db
            .select()
            .from(orders)
            .where(eq(orders.userEmail, req.user.email))
            .orderBy(desc(orders.tarih));
        res.json(rows.map(row => ({
            id: row.id,
            tarih: row.tarih,
            musteriAd: row.musteriAd,
            telefon: row.telefon,
            adres: row.adres,
            odemeYontemi: row.odemeYontemi,
            urunler: row.urunler,
            toplamTutar: row.toplamTutar,
            durum: row.durum,
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

    try {
        const result = await db.transaction(async (tx) => {
            const validatedSepet = [];
            let serverTotal = 0;

            for (const item of sepet) {
                const productId = parseInt(item.id, 10);
                const qty = parseInt(item.quantity, 10);
                if (!productId || !qty || qty < 1 || qty > 99) {
                    return { error: { status: 400, mesaj: 'Geçersiz sepet ürünü.' } };
                }

                const [prod] = await tx
                    .select({
                        id: products.id,
                        baslik: products.baslik,
                        fiyat: products.fiyat,
                        stok: products.stok,
                        resim: products.resim,
                    })
                    .from(products)
                    .where(eq(products.id, productId))
                    .for('update');

                if (!prod) {
                    return { error: { status: 400, mesaj: `Ürün bulunamadı (#${productId}).` } };
                }
                if (prod.stok < qty) {
                    return { error: { status: 400, mesaj: `"${prod.baslik}" için yeterli stok yok (kalan: ${prod.stok}).` } };
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
            await tx.insert(orders).values({
                id: takipNo,
                musteriAd,
                telefon,
                adres,
                odemeYontemi,
                userEmail: userEmail || 'Misafir',
                urunler: validatedSepet,
                toplamTutar: String(serverTotal),
            });

            for (const item of validatedSepet) {
                await tx
                    .update(products)
                    .set({ stok: sql`${products.stok} - ${item.quantity}` })
                    .where(eq(products.id, parseInt(item.id, 10)));
            }

            return { takipNo, serverTotal, validatedSepet };
        });

        if (result.error) {
            return res.status(result.error.status).json({ mesaj: result.error.mesaj });
        }

        siparisMailleriGonder({
            musteriAd, telefon, adres, odemeYontemi,
            sepet: result.validatedSepet,
            toplamTutar: result.serverTotal,
            userEmail,
            takipNo: result.takipNo
        }).catch(() => {});
        res.status(201).json({ mesaj: 'Sipariş başarıyla alındı!', takipNo: result.takipNo, toplamTutar: result.serverTotal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Sipariş kaydedilemedi' });
    }
});

app.get('/api/siparisler', verifyAdmin, async (req, res) => {
    try {
        const rows = await db.select().from(orders).orderBy(desc(orders.tarih));
        res.json(rows.map(mapOrderRow));
    } catch {
        res.status(500).json({ mesaj: 'Siparişler okunamadı' });
    }
});

app.put('/api/siparisler/:id/durum', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const durum = sanitizeText(req.body.durum, 50);
    const allowed = ['Hazırlanıyor', 'Kargoda', 'Teslim Edildi', 'İptal'];
    if (!durum || !allowed.includes(durum)) {
        return res.status(400).json({ mesaj: 'Geçersiz sipariş durumu.' });
    }
    try {
        const [row] = await db
            .update(orders)
            .set({ durum })
            .where(eq(orders.id, id))
            .returning({ id: orders.id, durum: orders.durum });
        if (!row) return res.status(404).json({ mesaj: 'Sipariş bulunamadı.' });
        res.json({ mesaj: 'Sipariş durumu güncellendi.', durum: row.durum });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Durum güncellenemedi.' });
    }
});

// --- İLETİŞİM ---
app.post('/api/iletisim', async (req, res) => {
    const adSoyad = sanitizeText(req.body.adSoyad, 255);
    const email = sanitizeText(req.body.email, 255).toLowerCase();
    const konu = sanitizeText(req.body.konu, 255);
    const mesaj = sanitizeText(req.body.mesaj, 2000);
    if (!adSoyad || !isValidEmail(email) || !konu || !mesaj) {
        return res.status(400).json({ mesaj: 'Tüm alanları doldurun ve geçerli e-posta girin.' });
    }
    try {
        await db.insert(contactMessages).values({ adSoyad, email, konu, mesaj });
        const mailOk = await sendMailSafe({
            from: `"Kavrulmuş İletişim" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            replyTo: email,
            subject: `İletişim: ${konu}`,
            html: `
                <h2>Yeni iletişim mesajı</h2>
                <p><strong>Gönderen:</strong> ${escapeHtml(adSoyad)} (${escapeHtml(email)})</p>
                <p><strong>Konu:</strong> ${escapeHtml(konu)}</p>
                <p>${escapeHtml(mesaj).replace(/\n/g, '<br>')}</p>
            `
        });
        res.status(201).json({
            mesaj: mailOk
                ? 'Mesajınız alındı. En kısa sürede dönüş yapacağız.'
                : 'Mesajınız kaydedildi. (E-posta bildirimi yapılandırılmamış.)',
            mailGonderildi: mailOk
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Mesaj gönderilemedi.' });
    }
});

app.get('/api/iletisim', verifyAdmin, async (req, res) => {
    try {
        const rows = await db
            .select({
                id: contactMessages.id,
                ad_soyad: contactMessages.adSoyad,
                email: contactMessages.email,
                konu: contactMessages.konu,
                mesaj: contactMessages.mesaj,
                tarih: contactMessages.tarih,
                okundu: contactMessages.okundu,
            })
            .from(contactMessages)
            .orderBy(desc(contactMessages.tarih))
            .limit(100);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Mesajlar okunamadı.' });
    }
});

app.get('/api/siparisler/takip/:id', async (req, res) => {
    const { id } = req.params;
    if (!/^KVR-\d{4}$/.test(id)) {
        return res.status(400).json({ mesaj: 'Geçersiz takip numarası. Örnek: KVR-1234' });
    }
    try {
        const [row] = await db
            .select({
                id: orders.id,
                tarih: orders.tarih,
                urunler: orders.urunler,
                toplamTutar: orders.toplamTutar,
                durum: orders.durum,
            })
            .from(orders)
            .where(eq(orders.id, id));
        if (!row) return res.status(404).json({ mesaj: 'Bu takip numarasıyla sipariş bulunamadı.' });
        res.json({
            id: row.id,
            tarih: row.tarih,
            urunler: row.urunler,
            toplamTutar: row.toplamTutar,
            durum: row.durum
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: 'Sipariş sorgulanamadı.' });
    }
});

app.use('/api', (req, res) => {
    res.status(404).json({ mesaj: 'API endpoint bulunamadı.' });
});

app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ mesaj: 'Bulunamadı' });
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

async function startServer() {
    try {
        await runMigrations();
    } catch (err) {
        console.error('❌ Veritabanı migration hatası:', err.message);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }

    app.listen(PORT, () => {
        console.log('=================================');
        console.log('🚀 KAVRULMUŞ BACKEND AKTİF!');
        console.log(`🌍 Sunucu adresi: ${APP_URL}`);
        console.log('=================================');
    });
}

startServer();

process.on('SIGINT', async () => {
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});