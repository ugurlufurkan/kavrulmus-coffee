// js/product-detay.js
// Ürün detay sayfasının tüm mantığı: veriyi çekme, açıklama/yorum üretimi,
// sekmeler, miktar seçici, favoriye ekleme ve benzer ürünler.

document.addEventListener('DOMContentLoaded', () => {

    /* -----------------------------------------------------
       0. BİLİNEN ÜRÜNLER İÇİN AÇIKLAMA & LEZZET NOTLARI
       (seed.js'teki 10 ürünle eşleşir; admin panelden eklenen
       yeni bir ürün burada yoksa aşağıdaki genel şablon devreye girer.)
    ----------------------------------------------------- */
    const urunBilgileri = {
        "Premium Espresso Blend": {
            uzunAciklama: "Beş farklı kökenden %100 Arabica çekirdeğin özenle harmanlanmasıyla oluşturulan imza espresso karışımımız. Koyu kavrum sayesinde yoğun gövdeli, kalıcı ve dengeli bir kafein deneyimi sunar; espresso makinenizde ya da moka pot'ta eşit derecede başarılıdır.",
            notlar: ["Koyu Çikolata", "Karamelize Fındık", "Uzun Aftertaste"]
        },
        "Etiyopya Yirgacheffe": {
            uzunAciklama: "Kahvenin anavatanı Etiyopya'nın Yirgacheffe bölgesinden, yüksek rakımda el ile toplanan çekirdeklerden üretilir. Açık-orta kavrum sayesinde çiçeksi ve narenciye ağırlıklı, filtre kahve severlerin özellikle tercih ettiği canlı bir asidite sunar.",
            notlar: ["Bergamot", "Yasemin", "Limon Kabuğu"]
        },
        "Kolombiya Supremo": {
            uzunAciklama: "Kolombiya'nın And Dağları'ndaki yüksek plantasyonlarından gelen, iri taneli 'Supremo' sınıfı çekirdeklerden oluşur. Dengeli asidite ve dolgun gövdesiyle hem filtre hem French press için idealdir; toptan çekirdek olarak da tercih edilir.",
            notlar: ["Kırmızı Elma", "Bal", "Fındık"]
        },
        "Guatemala Antigua": {
            uzunAciklama: "Volkanik toprakların beslediği Antigua vadisinden, geleneksel yöntemlerle kurutulmuş çekirdeklerle hazırlanır. Baharatlı ve dumanımsı notaları, orta-koyu kavrumla dengelenerek yöresel filtre kahve deneyimine derinlik katar.",
            notlar: ["Kakao", "Baharat", "Duman"]
        },
        "Brezilya Santos": {
            uzunAciklama: "Brezilya'nın en bilinen ihraç limanı Santos'tan adını alan bu harman, düşük asiditesi ve yumuşak, fındıksı karakteriyle günlük tüketime uygun kavrulmuş çekirdek seçeneğimizdir. Süt bazlı içeceklerle de mükemmel uyum sağlar.",
            notlar: ["Fındık", "Karamel", "Yumuşak Gövde"]
        },
        "Sumatra Mandheling": {
            uzunAciklama: "Endonezya'nın Sumatra adasına özgü 'giling basah' işleme yöntemiyle üretilen, koyu kavrulmuş, toprağımsı ve baharatlı karakteriyle tanınan kültbir seçim. Az asitli, ağır gövdeli kahve sevenler için doyurucu bir deneyim sunar.",
            notlar: ["Toprağımsı", "Karabiber", "Ağır Gövde"]
        },
        "Kenya AA": {
            uzunAciklama: "En yüksek çekirdek sınıflandırması olan 'AA' derecesine sahip Kenya kahvelerimiz, parlak asiditesi ve yoğun meyvemsi karakteriyle filtre kahve tutkunlarının favorisidir. Her yudumda canlı bir kırmızı meyve patlaması hissedilir.",
            notlar: ["Kara Frenk Üzümü", "Domates", "Parlak Asidite"]
        },
        "Kavrulmuş Filtre Kahve": {
            uzunAciklama: "Günlük tüketime uygun, dengeli ve erişilebilir bir harman. Farklı kökenlerden seçilmiş çekirdeklerin orta kavrumla buluşmasıyla hem ofiste hem evde sabah rutininin değişmez parçası olacak bir filtre kahve.",
            notlar: ["Dengeli", "Hafif Tatlımsı", "Kolay İçim"]
        },
        "Mocha Java Blend": {
            uzunAciklama: "Kahve tarihinin en eski harmanlarından ilham alınarak Yemen Mocha ile Endonezya Java çekirdeklerinin bir araya getirilmesiyle hazırlanır. Çikolatamsı derinlik ile toprağımsı karmaşıklığın nadir buluştuğu özel bir karışımdır.",
            notlar: ["Çikolata", "Baharat", "Karmaşık Yapı"]
        },
        "Türk Kahvesi Özel Harman": {
            uzunAciklama: "Geleneksel cezve kahvesi için özel olarak mikron seviyesinde öğütülen, koyu kavrulmuş seçkin çekirdeklerden oluşur. Köpüğü bol, kıvamı yoğun, damakta uzun süre kalan klasik Türk kahvesi lezzetini evinize taşır.",
            notlar: ["Yoğun Kavrum", "Bol Köpük", "Klasik Lezzet"]
        }
    };

    function genelAciklamaUret(urun) {
        return {
            uzunAciklama: `${urun.baslik}, ${urun.tur.toLowerCase()} kategorisinde özenle seçilmiş çekirdeklerden hazırlanır. Kavrulmuş Kahve atölyesinde küçük partiler halinde kavrularak tazeliği garanti altına alınır ve siparişinize özel olarak paketlenir.`,
            notlar: [urun.tur, "Taze Kavrum", "Özenle Paketleme"]
        };
    }

    /* -----------------------------------------------------
       1. BASİT SEEDLİ RASTGELE SAYI ÜRETECİ
       Aynı ürün için sayfa her yenilendiğinde aynı yorumların/
       puanın çıkması için ürün id'sini tohum olarak kullanıyoruz.
    ----------------------------------------------------- */
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const yorumHavuzu = [
        { isim: "Ahmet Y.", yorum: "Kargo hızlıydı, paketleme özenliydi. Kahve gerçekten taze kavrulmuş gibi kokuyordu." },
        { isim: "Elif K.", yorum: "Uzun zamandır bu kadar dengeli bir harman içmemiştim, kesinlikle tekrar sipariş vereceğim." },
        { isim: "Mert D.", yorum: "Filtre kahve makinemde denedim, aroması bekleneni fazlasıyla verdi. Fiyatına göre çok başarılı." },
        { isim: "Zeynep A.", yorum: "Hediye olarak aldım, çok beğenildi. Paketleme de oldukça şık duruyordu." },
        { isim: "Can T.", yorum: "İlk siparişimdi, biraz tereddütlüydüm ama beklentimin üzerinde çıktı. Teşekkürler." },
        { isim: "Selin B.", yorum: "Kokusu bardağı açar açmaz belli oluyor. Az asitli olması midemi de rahatsız etmedi." },
        { isim: "Burak S.", yorum: "Ofise toplu sipariş verdik, herkes çok memnun kaldı. Devamını getireceğiz." },
        { isim: "Deniz M.", yorum: "Cezvede denedim, köpüğü gerçekten bol ve lezzeti klasik bir Türk kahvesi gibiydi." },
        { isim: "Aslı Ç.", yorum: "Biraz pahalı buldum ama kalitesi bunu hak ediyor, tavsiye ederim." },
        { isim: "Furkan G.", yorum: "İkinci siparişim, ilkinden hiçbir farkı yok yani tutarlı bir kalite var, bu önemli." },
        { isim: "Gizem P.", yorum: "Paket biraz geç geldi ama kahvenin lezzeti bunu unutturdu." },
        { isim: "Onur R.", yorum: "Espresso makinemde harika bir crema oluşturdu, uzun süredir aradığım harmandı." }
    ];

    function yorumlariUret(urunId, urunBaslik) {
        const rand = mulberry32(Number(urunId) || 1);

        // 12-31 arası, ürüne göre sabit kalan bir toplam yorum sayısı
        const toplamYorum = 12 + Math.floor(rand() * 20);

        // 4.2 - 4.9 arası ortalama puan
        const ortalama = Math.round((4.2 + rand() * 0.7) * 10) / 10;

        // Havuzdan 3 farklı yorum seç
        const havuzKopya = [...yorumHavuzu];
        const secilenler = [];
        for (let i = 0; i < 3 && havuzKopya.length > 0; i++) {
            const index = Math.floor(rand() * havuzKopya.length);
            secilenler.push(havuzKopya.splice(index, 1)[0]);
        }

        const gunler = [3, 9, 14, 21, 30, 45];
        const bugun = new Date();

        const detayliYorumlar = secilenler.map((y, i) => {
            const puan = i === 0 ? 5 : (4 + Math.round(rand()));
            const gunOnce = gunler[Math.floor(rand() * gunler.length)];
            const tarih = new Date(bugun);
            tarih.setDate(tarih.getDate() - gunOnce);
            return {
                isim: y.isim,
                yorum: y.yorum,
                puan: Math.min(5, puan),
                tarih: tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
            };
        });

        return { toplamYorum, ortalama, detayliYorumlar };
    }

    function yildizYaz(puan) {
        const tam = Math.round(puan);
        return "★★★★★☆☆☆☆☆".slice(5 - tam, 10 - tam);
    }

    /* -----------------------------------------------------
       2. URL'DEN ÜRÜN ID'Sİ AL VE VERİYİ ÇEK
    ----------------------------------------------------- */
    const params = new URLSearchParams(window.location.search);
    const urunId = params.get('id');

    const loadingState = document.getElementById('loading-state');
    const notFoundState = document.getElementById('not-found-state');
    const contentState = document.getElementById('product-detail-content');

    function gostermeDurumu(durum) {
        loadingState.style.display = durum === 'loading' ? 'block' : 'none';
        notFoundState.style.display = durum === 'not-found' ? 'block' : 'none';
        contentState.style.display = durum === 'content' ? 'block' : 'none';
    }

    if (!urunId) {
        gostermeDurumu('not-found');
        return;
    }

    async function urunGetir() {
        // Önce tekil endpoint denenir; bulunamazsa (ör. eski bir dağıtımda
        // henüz yoksa) tüm ürünler listesinden id'ye göre bulunur.
        try {
            const res = await fetch(`/api/urunler/${urunId}`);
            if (res.ok) return await res.json();
        } catch (e) { /* devam, alttaki fallback denenecek */ }

        try {
            const res = await fetch('/api/urunler');
            if (!res.ok) return null;
            const urunler = await res.json();
            return urunler.find(u => String(u.id) === String(urunId)) || null;
        } catch (e) {
            return null;
        }
    }

    urunGetir().then(urun => {
        if (!urun) {
            gostermeDurumu('not-found');
            return;
        }
        urunuRenderEt(urun);
        gostermeDurumu('content');
        ilgiliUrunleriGetir(urun);
    }).catch(() => gostermeDurumu('not-found'));

    /* -----------------------------------------------------
       3. ÜRÜNÜ SAYFAYA BAS
    ----------------------------------------------------- */
    let seciliMiktar = 1;

    function urunuRenderEt(urun) {
        const isTukendi = urun.stok !== undefined && urun.stok <= 0;
        const bilgi = urunBilgileri[urun.baslik] || genelAciklamaUret(urun);
        const { toplamYorum, ortalama, detayliYorumlar } = yorumlariUret(urun.id, urun.baslik);

        // Başlık / breadcrumb
        document.getElementById('page-title').textContent = `Kavrulmuş | ${urun.baslik}`;
        document.getElementById('breadcrumb-current').textContent = urun.baslik;

        // Resim
        const img = document.getElementById('detail-image');
        img.src = urun.resim;
        img.alt = urun.baslik;
        if (img.complete && img.naturalWidth > 0) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => img.classList.add('loaded'));
        }
        img.addEventListener('error', () => img.classList.add('loaded'));

        // Rozetler
        const badgesEl = document.getElementById('detail-badges');
        badgesEl.innerHTML = isTukendi
            ? `<span class="badge" style="background:#ff4d4d;">Tükendi</span>`
            : `<span class="badge weight">Stok: ${urun.stok || '10+'}</span>`;

        // Başlık / tür / fiyat
        document.getElementById('detail-title').textContent = urun.baslik;
        document.getElementById('detail-type').textContent = urun.tur;
        document.getElementById('detail-price').textContent = `${urun.fiyat} TL`;
        document.getElementById('detail-short-desc').textContent = bilgi.uzunAciklama.split('. ')[0] + '.';

        // Stok satırı
        const stokLine = document.getElementById('detail-stock-line');
        if (isTukendi) {
            stokLine.textContent = '✗ Şu anda stokta yok';
            stokLine.className = 'detail-stock-line out-stock';
        } else {
            stokLine.textContent = `✓ Stokta — ${urun.stok || '10+'} adet kaldı`;
            stokLine.className = 'detail-stock-line in-stock';
        }

        // Yıldız / değerlendirme özeti
        document.getElementById('detail-stars').textContent = yildizYaz(ortalama);
        document.getElementById('detail-rating-count').textContent = `${toplamYorum} değerlendirme`;
        document.getElementById('detail-rating-row').addEventListener('click', () => {
            document.querySelector('.tab-btn[data-tab="degerlendirme"]').click();
            document.querySelector('.detail-tabs-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        // Açıklama sekmesi
        document.getElementById('detail-long-desc').textContent = bilgi.uzunAciklama;
        document.getElementById('detail-notes').innerHTML = bilgi.notlar
            .map(n => `<span class="tasting-note">${n}</span>`)
            .join('');

        // Değerlendirmeler sekmesi
        document.getElementById('tab-review-count').textContent = toplamYorum;
        document.getElementById('reviews-avg-number').textContent = ortalama.toFixed(1);
        document.getElementById('reviews-avg-stars').textContent = yildizYaz(ortalama);
        document.getElementById('reviews-avg-count').textContent = `${toplamYorum} değerlendirme`;

        document.getElementById('reviews-list').innerHTML = detayliYorumlar.map(y => `
            <div class="review-card">
                <div class="review-head">
                    <div class="review-avatar">${y.isim.split(' ').map(p => p[0]).join('')}</div>
                    <div class="review-meta">
                        <div class="review-name">${y.isim}<span class="verified-badge">✓ Doğrulanmış Alışveriş</span></div>
                        <div class="review-date">${y.tarih}</div>
                    </div>
                </div>
                <span class="stars">${yildizYaz(y.puan)}</span>
                <p class="review-comment">${y.yorum}</p>
            </div>
        `).join('');

        // Sepete ekle butonu — miktar seçiciyle senkron
        const addBtn = document.getElementById('detail-add-to-cart');
        function addBtnGuncelle() {
            addBtn.dataset.id = urun.id;
            addBtn.dataset.title = urun.baslik;
            addBtn.dataset.price = urun.fiyat;
            addBtn.dataset.image = urun.resim;
            addBtn.dataset.qty = seciliMiktar;
        }
        addBtnGuncelle();

        if (isTukendi) {
            addBtn.disabled = true;
            addBtn.style.opacity = '0.5';
            addBtn.style.cursor = 'not-allowed';
            addBtn.textContent = '❌ Tükendi';
        }

        // Miktar seçici
        const qtyValueEl = document.getElementById('qty-value');
        document.getElementById('qty-increase').addEventListener('click', () => {
            seciliMiktar = Math.min(20, seciliMiktar + 1);
            qtyValueEl.textContent = seciliMiktar;
            addBtnGuncelle();
        });
        document.getElementById('qty-decrease').addEventListener('click', () => {
            seciliMiktar = Math.max(1, seciliMiktar - 1);
            qtyValueEl.textContent = seciliMiktar;
            addBtnGuncelle();
        });

        // Favoriye ekle (localStorage — anasayfadaki wishlist mantığıyla aynı anahtar)
        const wishBtn = document.getElementById('detail-wishlist-btn');
        const favKey = 'kavrulmus_favoriler';
        let favoriler = JSON.parse(localStorage.getItem(favKey) || '[]');
        if (favoriler.includes(urun.baslik)) {
            wishBtn.classList.add('active');
            wishBtn.textContent = '♥';
        }
        wishBtn.addEventListener('click', () => {
            wishBtn.classList.toggle('active');
            const aktifMi = wishBtn.classList.contains('active');
            wishBtn.textContent = aktifMi ? '♥' : '♡';

            favoriler = JSON.parse(localStorage.getItem(favKey) || '[]');
            if (aktifMi) {
                if (!favoriler.includes(urun.baslik)) favoriler.push(urun.baslik);
            } else {
                favoriler = favoriler.filter(f => f !== urun.baslik);
            }
            localStorage.setItem(favKey, JSON.stringify(favoriler));

            if (typeof window.showToast === 'function') {
                window.showToast(aktifMi ? `❤️ ${urun.baslik} favorilere eklendi` : `💔 ${urun.baslik} favorilerden çıkarıldı`);
            }
        });

        // Sekme geçişleri
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
    }

    /* -----------------------------------------------------
       4. BENZER ÜRÜNLER (AYNI TÜR)
    ----------------------------------------------------- */
    async function ilgiliUrunleriGetir(mevcutUrun) {
        try {
            const res = await fetch('/api/urunler');
            if (!res.ok) return;
            const tumUrunler = await res.json();

            const benzerler = tumUrunler
                .filter(u => String(u.id) !== String(mevcutUrun.id) && u.tur === mevcutUrun.tur)
                .slice(0, 3);

            // Aynı türde yeterince ürün yoksa listeyi diğer ürünlerle tamamla
            if (benzerler.length < 3) {
                const digerleri = tumUrunler.filter(u =>
                    String(u.id) !== String(mevcutUrun.id) && !benzerler.includes(u)
                );
                benzerler.push(...digerleri.slice(0, 3 - benzerler.length));
            }

            const grid = document.getElementById('related-products-grid');
            if (benzerler.length === 0) {
                grid.closest('.related-section').style.display = 'none';
                return;
            }

            grid.innerHTML = benzerler.map(u => {
                const tukendi = u.stok !== undefined && u.stok <= 0;
                return `
                <div class="product-card">
                    <div class="card-image-wrapper">
                        <div class="card-badges">
                            <span class="badge weight">${tukendi ? 'Tükendi' : `Stok: ${u.stok || '10+'}`}</span>
                        </div>
                        <a href="urun-detay.html?id=${u.id}">
                            <img src="${u.resim}" alt="${u.baslik}" class="product-img">
                        </a>
                    </div>
                    <div class="card-content">
                        <a href="urun-detay.html?id=${u.id}" class="product-title-link">
                            <h3 class="product-title">${u.baslik}</h3>
                        </a>
                        <p class="product-type">${u.tur}</p>
                        <div class="card-footer">
                            <span class="price">${u.fiyat} TL</span>
                            <a href="urun-detay.html?id=${u.id}" class="btn-premium primary">İncele</a>
                        </div>
                    </div>
                </div>`;
            }).join('');

            // Yeni eklenen kart resimlerinin de görünür olması için reveal'i tetikle
            grid.querySelectorAll('.product-img').forEach(img => {
                if (img.complete && img.naturalWidth > 0) {
                    img.classList.add('loaded');
                } else {
                    img.addEventListener('load', () => img.classList.add('loaded'));
                }
                img.addEventListener('error', () => img.classList.add('loaded'));
            });
        } catch (e) {
            // Benzer ürünler yüklenemezse sessizce bölümü gizle, sayfanın
            // geri kalanını etkilemesin.
            const grid = document.getElementById('related-products-grid');
            if (grid) grid.closest('.related-section').style.display = 'none';
        }
    }
});