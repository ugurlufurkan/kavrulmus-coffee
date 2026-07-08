// seed.js
// Bu dosyayı SADECE BİR KEZ çalıştır: node seed.js
// Vitrine 10 örnek kahve ekler. Mevcut ürünleri SİLMEZ, üzerine ekler.

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const kahveler = [
    { baslik: "Premium Espresso Blend", tur: "%100 Arabica", fiyat: 335, resim: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Etiyopya Yirgacheffe", tur: "Yöresel Filtre", fiyat: 380, resim: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Kolombiya Supremo", tur: "Toptan Çekirdek", fiyat: 1250, resim: "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Guatemala Antigua", tur: "Yöresel Filtre", fiyat: 410, resim: "https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Brezilya Santos", tur: "Kavrulmuş Çekirdek", fiyat: 295, resim: "https://images.unsplash.com/photo-1524350876685-274059332603?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Sumatra Mandheling", tur: "Koyu Kavrum", fiyat: 420, resim: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Kenya AA", tur: "Yöresel Filtre", fiyat: 450, resim: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Kavrulmuş Filtre Kahve", tur: "Günlük Filtre", fiyat: 260, resim: "https://images.unsplash.com/photo-1442550528053-c431ecb55509?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Mocha Java Blend", tur: "Karışım", fiyat: 340, resim: "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=500&q=80", stok: 50 },
    { baslik: "Türk Kahvesi Özel Harman", tur: "Geleneksel", fiyat: 220, resim: "https://images.unsplash.com/photo-1506778020041-0ea35027d019?auto=format&fit=crop&w=500&q=80", stok: 50 }
];

async function seedEt() {
    try {
        for (const kahve of kahveler) {
            await pool.query(
                'INSERT INTO products (baslik, tur, fiyat, resim, stok) VALUES ($1, $2, $3, $4, $5)',
                [kahve.baslik, kahve.tur, kahve.fiyat, kahve.resim, kahve.stok]
            );
            console.log(`✅ Eklendi: ${kahve.baslik}`);
        }
        console.log("🎉 Tüm ürünler başarıyla eklendi!");
    } catch (err) {
        console.error("❌ Hata:", err.message);
    } finally {
        await pool.end();
    }
}

seedEt();