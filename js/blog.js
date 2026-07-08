// js/blog.js — Blog kategori filtreleri
document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-menu .filter-btn');
    const cards = document.querySelectorAll('.blog-grid .blog-card');
    if (!filterBtns.length || !cards.length) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter || 'all';

            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            cards.forEach(card => {
                const category = card.dataset.category || '';
                const show = filter === 'all' || category === filter;
                card.style.display = show ? '' : 'none';
            });

            const visible = [...cards].filter(c => c.style.display !== 'none').length;
            if (visible === 0 && typeof window.showToast === 'function') {
                window.showToast('Bu kategoride henüz yazı yok.');
            }
        });
    });
});
