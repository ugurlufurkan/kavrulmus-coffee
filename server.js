// server.js

const express = require('express');
const path = require('path');
const fs = require('fs'); // YENİ: Dosya sistemi (File System) modülü eklendi

const app = express();
const PORT = 3000;

// Frontend dosyalarını sun
app.use(express.static(__dirname));

// Veritabanı dosyasının yolu
const dbPath = path.join(__dirname, 'data', 'db.json');

// API: Ürünleri Veritabanından (db.json) Çek
app.get('/api/urunler', (req, res) => {
    // fs.readFile ile veritabanı dosyasını asenkron olarak okuyoruz
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Veritabanı okuma hatası:", err);
            // Bir hata olursa frontend'e 500 (Sunucu Hatası) kodu yolla
            return res.status(500).json({ mesaj: "Veritabanına ulaşılamadı." });
        }
        
        // Gelen metin verisini JSON objesine çevir ve frontend'e yolla
        const urunler = JSON.parse(data);
        res.json(urunler);
    });
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 KAVRULMUŞ BACKEND AKTİF!`);
    console.log(`📁 Veritabanı bağlantısı başarılı.`);
    console.log(`🌍 Sunucu adresi: http://localhost:${PORT}`);
    console.log(`📦 API adresi: http://localhost:${PORT}/api/urunler`);
    console.log(`=================================`);
});