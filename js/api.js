// js/api.js

document.addEventListener('DOMContentLoaded', () => {
    // Sitedeki ürünlerin listeleneceği alanı bul (Anasayfa veya Ürünler sayfası)
    const productsGrids = document.querySelectorAll('.products-grid');
    
    // Eğer bulunduğumuz sayfada ürün sergileme alanı yoksa çalışmayı durdur
    if (productsGrids.length === 0) return;

    // Ürünleri Backend'den Çekip Ekrana Basan Motor
    const fetchAndRenderProducts = async () => {
        try {
            // Sunucumuzdaki (Backend) ürünler API'sine gidiyoruz
            const response = await fetch('/api/urunler');
            const products = await response.json();

            // Tüm ızgaraları (grid) dön (Hem anasayfa hem ürünler sayfasında çalışması için)
            productsGrids.forEach(grid => {
                // 1. Önce HTML içine elle yazılmış o eski sahte ürünleri temizle
                grid.innerHTML = '';

                // 2. Eğer veritabanı tamamen boşsa uyarı göster
                if (products.length === 0) {
                    grid.innerHTML = '<p style="text-align: center; width: 100%; color: var(--gold-accent); margin-top: 20px;">Henüz vitrine kahve eklenmedi. Admin panelinden hemen yeni ürün ekleyebilirsiniz!</p>';
                    return;
                }

                // 3. Veritabanından gelen her bir ürün için HTML kartı üret
                products.forEach((urun, index) => {
                    const card = document.createElement('div');
                    
                    // Kartlara havalı animasyon sınıflarını (show ve delay) ekliyoruz
                    card.className = `product-card animate fade-up delay-${(index % 4) + 1} show`; 

                    card.innerHTML = `
                        <div class="card-image-wrapper">
                            <img src="${urun.resim}" alt="${urun.baslik}" class="product-img loaded">
                        </div>
                        <div class="card-content">
                            <h3 class="product-title">${urun.baslik}</h3>
                            <p class="product-type" style="font-size: 0.85rem; color: #999; margin-bottom: 10px;">${urun.tur}</p>
                            <div class="card-footer">
                                <span class="price">${urun.fiyat} TL</span>
                                <button class="btn-premium primary add-to-cart" 
                                    data-id="${urun.id}" 
                                    data-title="${urun.baslik}" 
                                    data-price="${urun.fiyat}" 
                                    data-image="${urun.resim}">🛒 Ekle</button>
                            </div>
                        </div>
                    `;
                    
                    // Oluşturulan kartı ızgaranın içine yerleştir
                    grid.appendChild(card);
                });
            });

        } catch (error) {
            console.error("Ürünler yüklenirken hata oluştu:", error);
            productsGrids.forEach(grid => {
                grid.innerHTML = '<p style="text-align: center; width: 100%; color: red; margin-top: 20px;">Sunucuya bağlanılamadı. Node.js (server.js) açık mı?</p>';
            });
        }
    };

    // Sistemi çalıştır
    fetchAndRenderProducts();
});