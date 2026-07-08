// js/product.js

/* =====================================================
   ÜRÜN SAYFASI ETKİLEŞİMLERİ
   - Kategori filtre butonları (Tümü / Espresso / Filtre / Ekipman)
   - Favorilere ekleme (♡ wishlist butonu)
   - Hızlı Bakış (Quick View) tetikleyicisi
   Not: event delegation kullanıyoruz ki api.js ürünleri
   sonradan (asenkron) DOM'a eklese bile butonlar çalışsın.
===================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* -----------------------------------------------------
       1. KATEGORİ FİLTRELEME
    ----------------------------------------------------- */
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productsGrid = document.getElementById('dynamic-products-grid') || document.querySelector('.products-grid');

    if (filterButtons.length && productsGrid) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Aktif buton görselini güncelle
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const secilenKategori = btn.textContent.trim().toLowerCase();
                const productCards = productsGrid.querySelectorAll('.product-card');

                productCards.forEach(card => {
                    const typeEl = card.querySelector('.product-type');
                    const tur = typeEl ? typeEl.textContent.trim().toLowerCase() : '';

                    const gosterilsinMi =
                        secilenKategori === 'tümü' ||
                        secilenKategori === 'tumu' ||
                        tur.includes(secilenKategori);

                    card.style.display = gosterilsinMi ? 'flex' : 'none';
                });
            });
        });
    }

    /* -----------------------------------------------------
       2. FAVORİLERE EKLEME (WISHLIST)
       Event delegation: document üzerinden dinliyoruz ki
       sonradan eklenen ürün kartlarında da çalışsın.
    ----------------------------------------------------- */
    document.addEventListener('click', (e) => {
        const wishlistBtn = e.target.closest('.wishlist-btn');
        if (!wishlistBtn) return;

        wishlistBtn.classList.toggle('active');
        const aktifMi = wishlistBtn.classList.contains('active');
        wishlistBtn.textContent = aktifMi ? '♥' : '♡';

        const card = wishlistBtn.closest('.product-card');
        const titleEl = card ? card.querySelector('.product-title') : null;
        const title = titleEl ? titleEl.textContent.trim() : 'Ürün';

        if (typeof window.showToast === 'function') {
            window.showToast(aktifMi ? `❤️ ${title} favorilere eklendi` : `💔 ${title} favorilerden çıkarıldı`);
        }

        // Favori listesini tarayıcıda hatırla
        const favKey = 'kavrulmus_favoriler';
        let favoriler = JSON.parse(localStorage.getItem(favKey) || '[]');

        if (aktifMi) {
            if (!favoriler.includes(title)) favoriler.push(title);
        } else {
            favoriler = favoriler.filter(f => f !== title);
        }

        localStorage.setItem(favKey, JSON.stringify(favoriler));
    });

    /* -----------------------------------------------------
       3. HIZLI BAKIŞ (QUICK VIEW)
       Şimdilik ürün adını toast ile bildiriyoruz.
       İleride bir ürün detay modalı eklenirse burası genişletilir.
    ----------------------------------------------------- */
    document.addEventListener('click', (e) => {
        const quickViewBtn = e.target.closest('.quick-view-overlay');
        if (!quickViewBtn) return;

        // Dinamik (API'den gelen) kartlarda id doğrudan overlay üzerinde duruyor.
        const directId = quickViewBtn.dataset.id;
        if (directId) {
            window.location.href = `urun-detay.html?id=${directId}`;
            return;
        }

        // Statik kartlarda (örn. anasayfadaki öne çıkanlar) id yok; başlığa
        // göre API'den ürünü bulup öyle yönlendiriyoruz.
        const card = quickViewBtn.closest('.product-card');
        const titleEl = card ? card.querySelector('.product-title') : null;
        const title = titleEl ? titleEl.textContent.trim() : null;

        if (!title) return;

        fetch('/api/urunler')
            .then(response => response.json())
            .then(urunler => {
                const eslesen = urunler.find(u => u.baslik === title);
                if (eslesen) {
                    window.location.href = `urun-detay.html?id=${eslesen.id}`;
                } else if (typeof window.showToast === 'function') {
                    window.showToast(`👁️ ${title} — bu ürün için detay sayfası bulunamadı.`);
                }
            })
            .catch(() => {
                if (typeof window.showToast === 'function') {
                    window.showToast(`👁️ ${title} — detay sayfasına şu an ulaşılamıyor.`);
                }
            });
    });

    /* -----------------------------------------------------
       4. SAYFA AÇILINCA: Daha önce favorilenen ürünleri işaretle
       (Ürünler API'den asenkron geldiği için kısa bir gecikmeyle çalışır)
    ----------------------------------------------------- */
    setTimeout(() => {
        const favoriler = JSON.parse(localStorage.getItem('kavrulmus_favoriler') || '[]');
        if (!favoriler.length) return;

        document.querySelectorAll('.product-card').forEach(card => {
            const titleEl = card.querySelector('.product-title');
            const wishBtn = card.querySelector('.wishlist-btn');
            if (!titleEl || !wishBtn) return;

            if (favoriler.includes(titleEl.textContent.trim())) {
                wishBtn.classList.add('active');
                wishBtn.textContent = '♥';
            }
        });
    }, 800);
});

/* =====================================================
   END
===================================================== */