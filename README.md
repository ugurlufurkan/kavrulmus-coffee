# Kavrulmuş — Premium Kahve E-Ticaret Sitesi

Aksaray merkezli kahve markası için full-stack demo e-ticaret projesi. Express + PostgreSQL backend, vanilla HTML/CSS/JS frontend.

**Repo:** [github.com/ugurlufurkan/ornek-site](https://github.com/ugurlufurkan/ornek-site)

## Özellikler

- Ürün listesi, arama, filtre, sıralama
- Sepet, checkout, sipariş takibi (`KVR-XXXX`)
- Kullanıcı kayıt/giriş, hesabım, favoriler, şifre sıfırlama (e-posta ile)
- Ürün yorumları, admin paneli (ürün CRUD, sipariş durumu, iletişim mesajları)
- Blog, iletişim formu, KVKK / yasal sayfalar
- Dark/light tema, rate limit, güvenlik başlıkları
- Anasayfa chatbot (SSS / basit yönlendirme)

## Demo sınırlamaları

- **Ödeme:** Kart formu arayüzdür; gerçek ödeme altyapısı (iyzico, Stripe vb.) bağlı değildir. Siparişler demo olarak kaydedilir.
- **E-posta:** Gmail SMTP + [uygulama şifresi](https://myaccount.google.com/apppasswords) olmadan sipariş / şifre sıfırlama mailleri gitmez (site yine çalışır).
- **Admin:** Oturum `sessionStorage` ile tutulur — sekmeyi kapatınca tekrar giriş gerekir (JWT süresi 1 saat).

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
# İlk kurulumda: copy .env.example .env  (mevcut .env varsa ÜZERİNE YAZMAYIN)
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
- Oturum sekme bazlıdır (`sessionStorage`); sekme kapanınca veya **Çıkış Yap** ile oturum sona erer
- Token sunucuda `/api/admin/verify` ile doğrulanır

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
├── siparis-takip.html # Sipariş sorgulama
├── 404.html           # Özel hata sayfası
├── js/                # Frontend scriptleri
├── css/               # Stiller
└── partials/          # Paylaşılan UI parçaları
```

## Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| `index.html` | Anasayfa, öne çıkan ürünler |
| `urunler.html` | Ürün listesi, arama/filtre |
| `urun-detay.html` | Ürün detayı, yorumlar |
| `hesabim.html` | Profil, siparişler, şifre |
| `favoriler.html` | Favori ürünler |
| `siparis-takip.html` | `KVR-XXXX` ile takip |
| `blog.html` / `blog-yazi.html` | Blog |
| `iletisim.html` | İletişim formu |
| `admin.html` | Yönetim paneli |

## API Özet

| Endpoint | Açıklama |
|----------|----------|
| `GET /api/health` | Sağlık kontrolü (DB dahil) |
| `GET /api/urunler` | Ürün listesi |
| `GET /api/urunler/:id` | Tek ürün |
| `GET/POST /api/urunler/:id/yorumlar` | Yorumlar (POST: giriş gerekli) |
| `POST /api/siparis` | Sipariş oluştur |
| `GET /api/siparisler/takip/:id` | Sipariş takip (KVR-1234) |
| `POST /api/iletisim` | İletişim formu |
| `POST /api/auth/register` | Kayıt |
| `POST /api/auth/login` | Giriş |
| `POST /api/auth/forgot-password` | Şifre sıfırlama maili |
| `POST /api/auth/reset-password` | Yeni şifre belirle |
| `GET /api/auth/me` | Oturum bilgisi |
| `GET/POST /api/favoriler` | Favoriler |
| `POST /api/admin/login` | Admin giriş |
| `GET /api/admin/verify` | Admin oturum doğrulama |
| `GET/PUT/DELETE /api/urunler/:id` | Admin ürün yönetimi |
| `GET /api/siparisler` | Admin sipariş listesi |
| `PUT /api/siparisler/:id/durum` | Sipariş durumu güncelle |
| `GET /api/iletisim` | Admin iletişim mesajları |

## Lisans

Eğitim / portfolyo amaçlı demo proje.
