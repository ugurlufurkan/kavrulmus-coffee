// server.js

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Frontend dosyalarını sun
app.use(express.static(__dirname));

// YENİ: Express'in formlardan gelen JSON verilerini okuyabilmesi için gerekli ayar
app.use(express.json());

// Veritabanı dosya yolları
const dbPath = path.join(__dirname, 'data', 'db.json');
const usersDbPath = path.join(__dirname, 'data', 'users.json'); // Kullanıcılar DB

// 1. API: Ürünleri Çek (GET)
app.get('/api/urunler', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Veritabanına ulaşılamadı." });
        res.json(JSON.parse(data));
    });
});

// 2. API: Yeni Üye Kaydı (POST)
app.post('/api/auth/register', (req, res) => {
    // Frontend'den gelen e-posta ve şifreyi alıyoruz
    const { email, password } = req.body;

    // Kullanıcılar veritabanını oku
    fs.readFile(usersDbPath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ mesaj: "Veritabanı okuma hatası" });

        const kullanicilar = JSON.parse(data);

        // Bu e-posta ile daha önce kayıt olunmuş mu kontrol et
        const kayitliMi = kullanicilar.find(u => u.email === email);
        if (kayitliMi) {
            return res.status(400).json({ mesaj: "Bu e-posta adresi zaten kullanımda!" });
        }

        // Yeni kullanıcıyı listeye ekle (gerçekte şifreler kriptolanır ama şimdilik düz tutuyoruz)
        const yeniKullanici = {
            id: Date.now(),
            email: email,
            password: password,
            kayitTarihi: new Date().toISOString()
        };
        kullanicilar.push(yeniKullanici);

        // Güncel listeyi tekrar users.json dosyasına yaz (Kaydet)
        fs.writeFile(usersDbPath, JSON.stringify(kullanicilar, null, 2), (err) => {
            if (err) return res.status(500).json({ mesaj: "Kayıt işlemi başarısız oldu" });
            
            // Başarılı olursa frontend'e müjdeyi ver
            res.status(201).json({ mesaj: "Kayıt başarıyla tamamlandı, hoş geldiniz!" });
        });
    });
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 KAVRULMUŞ BACKEND AKTİF!`);
    console.log(`📁 Veritabanı bağlantıları başarılı.`);
    console.log(`🌍 Sunucu adresi: http://localhost:${PORT}`);
    console.log(`=================================`);
});