// js/cookie.js

document.addEventListener('DOMContentLoaded', () => {
    // Kullanıcı daha önce kabul etmiş mi kontrol et
    const cookieAccepted = localStorage.getItem('kavrulmus_cookie_accepted');

    if (!cookieAccepted) {
        // Çerez banner'ı için HTML elementini dinamik olarak oluştur
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        
        // Sitenin premium siyah-altın temasına tam uyumlu stil
        banner.style.position = 'fixed';
        banner.style.bottom = '-100px'; // Önce aşağıda gizli tutuyoruz
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.width = 'calc(100% - 40px)';
        banner.style.maxWidth = '600px';
        banner.style.background = '#1a1a1a';
        banner.style.color = '#fff';
        banner.style.padding = '20px';
        banner.style.borderRadius = '12px';
        banner.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        banner.style.border = '1px solid #d4af37';
        banner.style.zIndex = '99999';
        banner.style.display = 'flex';
        banner.style.justifyContent = 'between';
        banner.style.alignItems = 'center';
        banner.style.gap = '15px';
        banner.style.transition = 'bottom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        banner.style.flexDirection = window.innerWidth < 480 ? 'column' : 'row';

        banner.innerHTML = `
            <div style="font-size: 0.9rem; font-family: 'Poppins', sans-serif; line-height: 1.5; flex: 1;">
                🍪 Sitemizde size daha iyi bir deneyim sunabilmek adına yasal düzenlemelere uygun çerezler (cookies) kullanıyoruz. 
                Detaylar için <a href="kvkk.html" style="color: #d4af37; text-decoration: underline;">KVKK Politikamızı</a> inceleyebilirsiniz.
            </div>
            <button id="accept-cookie-btn" style="background: #d4af37; color: #111; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; font-family: 'Poppins'; white-space: nowrap; transition: 0.2s;">
                Kabul Et
            </button>
        `;

        document.body.appendChild(banner);

        // Hafif bir gecikmeyle banner'ı aşağıdan yukarıya doğru kaydır (Görsel şov)
        setTimeout(() => {
            banner.style.bottom = '20px';
        }, 1000);

        // Kabul et butonuna basıldığında
        document.getElementById('accept-cookie-btn').addEventListener('click', () => {
            localStorage.setItem('kavrulmus_cookie_accepted', 'true');
            banner.style.bottom = '-150px'; // Aşağı kaydırarak gizle
            setTimeout(() => banner.remove(), 500); // 500ms sonra HTML'den tamamen sil
        });
    }
});