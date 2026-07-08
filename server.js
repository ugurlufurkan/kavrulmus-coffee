// server.js

const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const app = express();
const PORT = 3000;
const JWT_SECRET = 'KAVRULMUS_GIZLI_ANAHTAR_2026'; 

app.use(express.static(__dirname));
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(__dirname, 'data', 'db.json');
const usersDbPath = path.join(__dirname, 'data', 'users.json');
const ordersDbPath = path.join(__dirname, 'data', 'orders.json'); 

// Klasör ve Veritabanı Kontrolü (Fail-Safe)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersDbPath)) fs.writeFileSync(usersDbPath, '[]', 'utf8');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, '[]', 'utf8');
if (!fs.existsSync(ordersDbPath)) fs.writeFileSync(ordersDbPath, '[]', 'utf8'); 

// 1. API: Ürünleri Çek
app.get('/api/urunler', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Ürünler okuma hatası" });
        try { res.json(JSON.parse(data)); } catch (e) { res.json([]); }
    });
});

// 2. API: YENİ ÜRÜN EKLE (ADMIN)
app.post('/api/urunler', (req, res) => {
    const { baslik, tur, fiyat, resimUrl } = req.body;
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Veritabanı hatası" });
        let urunler = [];
        try { urunler = JSON.parse(data); } catch (e) { urunler = []; }

        const yeniUrun = { id: Date.now(), baslik: baslik || "İsimsiz Kahve", tur: tur || "Standart", fiyat: fiyat || "0", resim: resimUrl };
        urunler.push(yeniUrun);

        fs.writeFile(dbPath, JSON.stringify(urunler, null, 2), (err) => {
            if (err) return res.status(500).json({ mesaj: "Ürün kaydedilemedi" });
            res.status(201).json({ mesaj: "Ürün başarıyla vitrine eklendi!", urun: yeniUrun });
        });
    });
});

// 3. API: YENİ ÜYE KAYDI (ŞİFRELİ)
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    fs.readFile(usersDbPath, 'utf8', async (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Veritabanı hatası!" });
        let kullanicilar = [];
        try { kullanicilar = JSON.parse(data); } catch (e) { kullanicilar = []; }
        
        if (kullanicilar.find(u => u.email === email)) return res.status(400).json({ mesaj: "Bu e-posta zaten kullanımda!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const yeniKullanici = { id: Date.now(), email, password: hashedPassword, kayitTarihi: new Date().toISOString() };
        kullanicilar.push(yeniKullanici);

        fs.writeFile(usersDbPath, JSON.stringify(kullanicilar, null, 2), (err) => {
            if (err) return res.status(500).json({ mesaj: "Kayıt başarısız" });
            const token = jwt.sign({ id: yeniKullanici.id, email: yeniKullanici.email }, JWT_SECRET, { expiresIn: '2h' });
            res.status(201).json({ mesaj: "Kayıt başarıyla tamamlandı!", token, user: { email } });
        });
    });
});

// 4. API: GİRİŞ YAP (ŞİFRE ÇÖZÜCÜ)
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    fs.readFile(usersDbPath, 'utf8', async (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Veritabanı hatası" });
        let kullanicilar = [];
        try { kullanicilar = JSON.parse(data); } catch (e) { kullanicilar = []; }
        
        const user = kullanicilar.find(u => u.email === email);
        if (!user) return res.status(401).json({ mesaj: "Hatalı e-posta veya şifre!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ mesaj: "Hatalı e-posta veya şifre!" });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
        res.status(200).json({ mesaj: "Giriş başarılı, hoş geldin!", token, user: { email: user.email } });
    });
});

// 5. API: SİPARİŞİ VERİTABANINA KAYDET
app.post('/api/siparis', (req, res) => {
    const { musteriAd, telefon, adres, odemeYontemi, sepet, toplamTutar, userEmail } = req.body;
    
    fs.readFile(ordersDbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Sipariş veritabanı hatası" });
        
        let siparisler = [];
        try { siparisler = JSON.parse(data); } catch (e) { siparisler = []; }

        const takipNo = 'KVR-' + Math.floor(1000 + Math.random() * 9000);

        const yeniSiparis = {
            id: takipNo,
            tarih: new Date().toISOString(),
            musteriAd, 
            telefon, 
            adres, 
            odemeYontemi, 
            userEmail,
            urunler: sepet, 
            toplamTutar,
            durum: 'Hazırlanıyor' 
        };

        siparisler.push(yeniSiparis);

        fs.writeFile(ordersDbPath, JSON.stringify(siparisler, null, 2), (err) => {
            if (err) return res.status(500).json({ mesaj: "Sipariş kaydedilemedi" });
            res.status(201).json({ mesaj: "Sipariş başarıyla alındı!", takipNo });
        });
    });
});

// 6. API: SİPARİŞLERİ GETİR (ADMIN PANELİ İÇİN)
app.get('/api/siparisler', (req, res) => {
    fs.readFile(ordersDbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Siparişler okunamadı" });
        try { 
            res.json(JSON.parse(data)); 
        } catch (e) { 
            res.json([]); 
        }
    });
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 KAVRULMUŞ BACKEND (GÜVENLİ) AKTİF!`);
    console.log(`🌍 Sunucu adresi: http://localhost:${PORT}`);
    console.log(`=================================`);
});