const FAVORITES_KEY = "kavrulmus_favorites";

function getFavorites() {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function isFavorite(id) {
    return getFavorites().includes(Number(id));
}

function updateFavoriteButton(button, id) {
    if (!button) return;

    if (isFavorite(id)) {
        button.innerHTML = "♥";
        button.classList.add("active");
    } else {
        button.innerHTML = "♡";
        button.classList.remove("active");
    }
}

function updateFavoriteCounter() {
    const badge = document.querySelector(".favorite-count");

    if (!badge) return;

    badge.textContent = getFavorites().length;
}

function toggleFavorite(id, button) {
    let favorites = getFavorites();
    id = Number(id);

    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);

        if (window.showToast) {
            window.showToast("💔 Favorilerden kaldırıldı.");
        }
    } else {
        favorites.push(id);

        if (window.showToast) {
            window.showToast("❤️ Favorilere eklendi.");
        }
    }

    saveFavorites(favorites);
    updateFavoriteButton(button, id);
    updateFavoriteCounter();
}

// API ile sonradan eklenen butonlar için event delegation
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".wishlist-btn");

    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    toggleFavorite(btn.dataset.id, btn);
});

document.addEventListener("DOMContentLoaded", () => {
    updateFavoriteCounter();

    document.querySelectorAll(".wishlist-btn").forEach(btn => {
        updateFavoriteButton(btn, btn.dataset.id);
    });
});