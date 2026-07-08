// seed.js
// Çalıştır: npm run seed
// Aynı isimde ürün varsa atlar (tekrar çalıştırılabilir).

require('dotenv').config();
const { eq } = require('drizzle-orm');
const { db, pool } = require('./db');
const { products } = require('./db/schema');

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
    let eklenen = 0;
    let atlanan = 0;

    try {
        for (const kahve of kahveler) {
            const [mevcut] = await db
                .select({ id: products.id })
                .from(products)
                .where(eq(products.baslik, kahve.baslik));

            if (mevcut) {
                console.log(`⏭️  Zaten var: ${kahve.baslik}`);
                atlanan++;
                continue;
            }

            await db.insert(products).values({
                baslik: kahve.baslik,
                tur: kahve.tur,
                fiyat: String(kahve.fiyat),
                resim: kahve.resim,
                stok: kahve.stok,
            });
            console.log(`✅ Eklendi: ${kahve.baslik}`);
            eklenen++;
        }

        console.log(`\n🎉 Seed tamamlandı — ${eklenen} yeni ürün, ${atlanan} atlandı.`);
    } catch (err) {
        console.error('❌ Hata:', err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedEt();
