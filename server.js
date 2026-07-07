// server.js

// 1. Gerekli modülleri çağırıyoruz
const express = require('express');
const path = require('path');

// 2. Express uygulamasını başlatıyoruz
const app = express();
const PORT = 3000;

// 3. Frontend dosyalarımızı (HTML, CSS, JS) dışarıya sunuyoruz
// '__dirname' bulunduğumuz klasörü temsil eder.
app.use(express.static(__dirname));

// 4. API (Uygulama Programlama Arayüzü) Rotası
// İleride veritabanına (MongoDB vb.) bağlanıp ürünleri buradan göndereceğiz.
// Şimdilik sahte (mock) veri gönderiyoruz.
app.get('/api/urunler', (req, res) => {
    const urunler = [
        { id: 1, isim: "Premium Espresso Blend", fiyat: 335, tur: "%100 Arabica" },
        { id: 2, isim: "Etiyopya Yirgacheffe", fiyat: 380, tur: "Yöresel Filtre" },
        { id: 3, isim: "Kolombiya Supremo", fiyat: 1250, tur: "Toptan Çekirdek" }
    ];
    
    // Veriyi JSON formatında frontend'e yolla
    res.json(urunler);
});

// 5. Sunucuyu Belirlenen Portta Başlat
app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 KAVRULMUŞ BACKEND AKTİF!`);
    console.log(`🌍 Sunucu adresi: http://localhost:${PORT}`);
    console.log(`📦 API adresi: http://localhost:${PORT}/api/urunler`);
    console.log(`=================================`);
});