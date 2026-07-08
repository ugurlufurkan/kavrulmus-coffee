const FAVORITES_KEY = "kavrulmus_favorites";

async function loadFavorites() {
    const ids = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    const grid = document.getElementById("favorites-grid");

    if (ids.length === 0) {
        grid.innerHTML = `
            <h2 style="text-align:center;width:100%;">
                ❤️ Henüz favori ürün eklemedin.
            </h2>
        `;
        return;
    }

    const response = await fetch("/api/urunler");
    const urunler = await response.json();
    const favoriler = urunler.filter(u => ids.includes(Number(u.id)));

    grid.innerHTML = favoriler.map(urun => `
        <div class="product-card">
            <div class="card-image-wrapper">
                <img src="${urun.resim}" class="product-img">
            </div>
            <div class="card-content">
                <h3>${urun.baslik}</h3>
                <p>${urun.tur}</p>
                <span class="price">${urun.fiyat} TL</span>
                <div class="card-footer">
                    <a class="btn-premium secondary" href="urun-detay.html?id=${urun.id}">İncele</a>
                    <button class="btn-premium primary remove-fav" data-id="${urun.id}">Kaldır</button>
                </div>
            </div>
        </div>
    `).join("");

    document.querySelectorAll(".remove-fav").forEach(btn => {
        btn.onclick = () => {
            let list = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
            list = list.filter(id => Number(id) !== Number(btn.dataset.id));
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
            if (window.showToast) window.showToast('💔 Favorilerden kaldırıldı.');
            loadFavorites();
        };
    });
}

loadFavorites();