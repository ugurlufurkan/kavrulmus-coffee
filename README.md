# Kavrulmuş — Premium Kahve E-Ticaret Sitesi

Aksaray merkezli kahve markası için full-stack demo e-ticaret projesi. Express + PostgreSQL backend, vanilla HTML/CSS/JS frontend.

## Özellikler

- Ürün listesi, arama, filtre, sıralama
- Sepet, checkout, sipariş takibi (`KVR-XXXX`)
- Kullanıcı kayıt/giriş, hesabım, favoriler, şifre sıfırlama
- Ürün yorumları, admin paneli (ürün CRUD, sipariş durumu, iletişim mesajları)
- Blog, iletişim formu, KVKK / yasal sayfalar
- Dark/light tema, rate limit, güvenlik başlıkları

## Gereksinimler

- Node.js 18+
- Docker Desktop (PostgreSQL için) veya harici Postgres

## Hızlı Başlangıç (Local)

```powershell
# 1. Bağımlılıklar
npm install

# 2. Ortam değişkenleri — DİKKAT: mevcut .env varsa ÜZERİNE YAZMAYIN
#    Sadece ilk kurulumda: copy .env.example .env
#    DB_PASSWORD docker volume ile aynı kalmalı (değiştirmek için: docker compose down -v)

# 3. Veritabanı
docker compose up -d veritabani

# 4. Örnek ürünler (ilk kurulumda)
npm run seed

# 5. Sunucu — .env değiştirdiyseniz önce Ctrl+C ile durdurup yeniden başlatın
npm start
```

Tarayıcı: **http://localhost:3000** (HTML dosyasına çift tıklamayın)

### Ürünler görünmüyorsa

1. Docker açık mı? `docker compose up -d veritabani`
2. `.env` içindeki `DB_PASSWORD`, Postgres volume ile uyumlu mu?
3. Eski node süreci kalmış olabilir — terminalde `Ctrl+C`, gerekirse Görev Yöneticisi'nden `node.exe` kapatın
4. `npm run seed` ile ürünleri yükleyin
5. **http://localhost:3000/urunler.html** adresinden açın

## Docker ile Tam Stack

```powershell
copy .env.example .env
docker compose up -d --build
npm run seed
```

## Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `PORT` | Sunucu portu (varsayılan 3000) |
| `APP_URL` | Canlı site URL'i (e-posta linkleri için) |
| `JWT_SECRET` | Müşteri/admin token imzalama |
| `ADMIN_PASSWORD` | Admin panel giriş şifresi |
| `DB_*` | PostgreSQL bağlantı bilgileri |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail + [uygulama şifresi](https://myaccount.google.com/apppasswords) |
| `ADMIN_EMAIL` | Sipariş/iletişim bildirimleri |

Sunucu başlarken terminalde `📧 Gmail SMTP bağlantısı hazır.` görürseniz mail çalışıyordur.

## Veritabanı

Tablolar sunucu başlarken otomatik oluşur (`server.js`). SQL dosyası: `schema.sql`

```powershell
npm run seed          # Örnek ürünler
node server.js        # API + statik site
```

## Admin Paneli

- URL: `/admin.html`
- Şifre: `.env` içindeki `ADMIN_PASSWORD`

## Yayınlama (Render)

1. GitHub repo'yu Render'a bağlayın
2. `render.yaml` blueprint kullanın veya:
   - **Build:** `npm install`
   - **Start:** `node server.js`
   - Postgres eklentisi bağlayın
3. Environment variables panelinden `APP_URL`, mail ayarlarını girin
4. Deploy sonrası: `npm run seed` (Render shell) veya seed script'i bir kez çalıştırın

## Proje Yapısı

```
ornek-site/
├── server.js          # Express API + statik sunucu
├── seed.js            # Örnek ürün verisi
├── schema.sql         # PostgreSQL şeması
├── docker-compose.yml # Postgres + uygulama
├── Dockerfile
├── render.yaml        # Render deploy blueprint
├── index.html         # Anasayfa
├── admin.html         # Patron paneli
├── js/                # Frontend scriptleri
├── css/               # Stiller
└── partials/          # Paylaşılan UI parçaları
```

## API Özet

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık kontrolü |
| `GET /api/urunler` | Ürün listesi |
| `POST /api/siparis` | Sipariş oluştur |
| `GET /api/siparisler/takip/:id` | Sipariş takip (KVR-1234) |
| `POST /api/iletisim` | İletişim formu |
| `POST /api/auth/*` | Kayıt, giriş, profil |

## Lisans

Eğitim / portfolyo amaçlı demo proje.
