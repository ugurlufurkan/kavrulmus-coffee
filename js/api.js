// js/api.js

document.addEventListener('DOMContentLoaded', async () => {
    const productsGrid = document.querySelector('.products-grid');
    if(!productsGrid) return;

    try {
        const response = await fetch('/api/urunler');
        const urunler = await response.json();

        if(urunler.length === 0) {
            productsGrid.innerHTML = '<p style="color:#888; text-align:center; width: 100%;">Henüz vitrine kahve eklenmedi.</p>';
            return;
        }

        // Ürünleri Ekrana Çiz
        productsGrid.innerHTML = urunler.map(urun => {
            // Stok Kontrolü
            const isTukendi = urun.stok !== undefined && urun.stok <= 0;
            
            // Stok bittiyse butonu pasif yap ve rengini değiştir
            const butonGorseli = isTukendi 
                ? `<button class="btn-premium secondary" disabled style="opacity:0.5; cursor:not-allowed;">❌ Tükendi</button>`
                : `<button class="btn-premium primary add-to-cart" data-id="${urun.id}" data-title="${urun.baslik}" data-price="${urun.fiyat}" data-image="${urun.resim}">🛒 Sepete Ekle</button>`;
            
            // Resmin üzerine stok bilgisini yaz
            const stokBadge = isTukendi 
                ? `<span class="badge" style="background:#ff4d4d;">Tükendi</span>`
                : `<span class="badge weight">Stok: ${urun.stok || '10+'}</span>`;

            // Ürün kartı (Tükendiyse resmi siyah beyaz yap - grayscale)
            return `
            <div class="product-card animate fade-up" style="${isTukendi ? 'opacity: 0.7;' : ''}">
                <div class="card-image-wrapper">
                    <div class="card-badges">
                        ${stokBadge}
                    </div>
                    <button class="wishlist-btn">♡</button>
                    <a href="urun-detay.html?id=${urun.id}">
                        <img src="${urun.resim}" alt="${urun.baslik}" class="product-img" style="${isTukendi ? 'filter: grayscale(100%);' : ''}">
                    </a>
                    <div class="quick-view-overlay" data-id="${urun.id}">
                        <button class="btn-premium secondary">🔍 Ürünü İncele</button>
                    </div>
                </div>
                <div class="card-content">
                    <a href="urun-detay.html?id=${urun.id}" class="product-title-link">
                        <h3 class="product-title">${urun.baslik}</h3>
                    </a>
                    <p class="product-type">${urun.tur}</p>
                    <div class="card-footer">
                        <span class="price">${urun.fiyat} TL</span>
                        ${butonGorseli}
                    </div>
                </div>
            </div>`;
        }).join('');

        // ÖNEMLİ: Ürünler API'den geldikten sonra DOM'a ekleniyor, yani
        // animation.js sayfa ilk yüklenirken bu kartları henüz göremiyordu
        // (bu yüzden kartlar "opacity:0" durumunda takılı kalıp görünmüyordu).
        // Burada scroll animasyon gözlemcisini yeni eklenen kartlar için
        // tekrar başlatıyoruz.
        if (window.KavrulmusAnimations && typeof window.KavrulmusAnimations.initScrollAnimations === 'function') {
            window.KavrulmusAnimations.initScrollAnimations();
        } else {
            // animation.js henüz yüklenmediyse (script sırası değiştiyse) yine de
            // ürünlerin görünür kalmasını garanti altına al.
            productsGrid.querySelectorAll('.product-card').forEach(card => card.classList.add('show'));
        }

        // ÖNEMLİ: Ürün resimleri de API'den geldikten sonra DOM'a ekleniyor.
        // animation.js sayfa ilk yüklenirken bu resimleri henüz göremediği için
        // "loaded" class'ını hiç alamıyor ve CSS'teki opacity:0 + blur takılı
        // kalıyordu (kartlar görünüyor ama fotoğraflar hep bulanık/boş duruyordu).
        // Burada resim görünürlük mantığını yeni eklenen kartlar için tekrar çalıştırıyoruz.
        if (window.KavrulmusAnimations && typeof window.KavrulmusAnimations.initImageReveal === 'function') {
            window.KavrulmusAnimations.initImageReveal();
        } else {
            // animation.js henüz yüklenmediyse yine de resimlerin görünür kalmasını garanti altına al.
            productsGrid.querySelectorAll('.product-img').forEach(img => img.classList.add('loaded'));
        }
    } catch (error) {
        console.error("Ürünler çekilemedi:", error);
    }
});