// js/modal.js

document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('auth-modal');
    const openAuthBtn = document.getElementById('open-auth');
    const closeBtns = document.querySelectorAll('.close-modal');
    
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // --- HESAP DROPDOWN ELEMANLARI ---
    const accountMenu = document.getElementById('account-menu');
    const logoutLink = document.getElementById('account-logout-link');
    const profileLink = document.getElementById('account-profile-link');
    const favoritesLink = document.getElementById('account-favorites-link');

    // --- 1. GÜVENLİ OTURUM KONTROLÜ (JWT TOKEN İLE) ---
    const checkSession = () => {
    const token = localStorage.getItem('kavrulmus_token');
    const user = JSON.parse(localStorage.getItem('kavrulmus_user'));

    if (token && user && openAuthBtn) {

        // ad_soyad boşsa (eski kayıtlarda olabilir) e-postanın @ öncesini göster
        const gorunenAd = (user.name && user.name.trim())
            ? user.name
            : (user.email ? user.email.split('@')[0] : 'Kullanıcı');

        openAuthBtn.innerHTML = `
    👋 Hoş geldin,
    <strong>${gorunenAd}</strong> ▾
`;

        if (profileLink) {
            profileLink.innerHTML = `👤 ${gorunenAd}`;
        }

        if (accountMenu) {
            accountMenu.classList.add('logged-in');
        }

    } else {

        if (openAuthBtn) {
            openAuthBtn.innerHTML = `👤 Giriş Yap`;
        }

        if (accountMenu) {
            accountMenu.classList.remove('logged-in');
        }

    }
};
    checkSession(); 

    // Butona tıklama: giriş yapılmamışsa modalı aç.
    // Giriş yapılmışsa (masaüstünde dropdown zaten hover ile açılıyor) —
    // dokunmatik ekranlar için tıklamada da aç/kapat yapalım.
    if (openAuthBtn) {
        openAuthBtn.addEventListener('click', () => {
            if (accountMenu && accountMenu.classList.contains('logged-in')) {
                accountMenu.classList.toggle('menu-open');
            } else {
                authModal.classList.add('active');
            }
        });
    }

    // Dropdown dışına tıklanınca kapansın (dokunmatik/mobil için)
    document.addEventListener('click', (e) => {
        if (accountMenu && !accountMenu.contains(e.target)) {
            accountMenu.classList.remove('menu-open');
        }
    });
    // --- ÇIKIŞ YAP ---
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('kavrulmus_token');
            localStorage.removeItem('kavrulmus_user');
            window.showToast('ℹ️ Başarıyla çıkış yapıldı.');
            setTimeout(() => window.location.reload(), 800);
        });
    }

    // --- HESABIM / FAVORİLER (şimdilik yer tutucu) ---
    if (profileLink) {
        profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.showToast('👤 Hesabım sayfası yakında geliyor!');
        });
    }
    if (favoritesLink) {
        favoritesLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.showToast('♡ Favoriler sayfası yakında geliyor!');
        });
    }

    closeBtns.forEach(btn => btn.addEventListener('click', function() {
        this.closest('.modal-overlay').classList.remove('active');
    }));
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
    });

    // --- 2. SEKMELER ARASI GEÇİŞ ---
    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', (e) => {
            e.preventDefault();
            tabLogin.className = "auth-tab active";
            tabRegister.className = "auth-tab";
            tabLogin.style.background = 'var(--gold-accent)'; tabLogin.style.color = '#111';
            tabRegister.style.background = 'transparent'; tabRegister.style.color = 'var(--text-light)';
            loginForm.style.display = 'flex'; registerForm.style.display = 'none';
        });

        tabRegister.addEventListener('click', (e) => {
            e.preventDefault();
            tabRegister.className = "auth-tab active";
            tabLogin.className = "auth-tab";
            tabRegister.style.background = 'var(--gold-accent)'; tabRegister.style.color = '#111';
            tabLogin.style.background = 'transparent'; tabLogin.style.color = 'var(--text-light)';
            registerForm.style.display = 'flex'; loginForm.style.display = 'none';
        });
    }

    // --- 3. GERÇEK GİRİŞ YAPMA İŞLEMİ (JWT ALIMI) ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
    email,
    password
})
                });
                const data = await response.json();

                if (response.ok) {
                    window.showToast(`✅ ${data.mesaj}`);
                    authModal.classList.remove('active');
                    loginForm.reset();
                    
                    // TOKEN VE EMAİL'İ GÜVENLİCE HAFIZAYA AL
                    localStorage.setItem('kavrulmus_token', data.token);
localStorage.setItem('kavrulmus_user', JSON.stringify(data.user));
                    checkSession(); 
                } else {
                    window.showToast(`❌ ${data.mesaj}`);
                }
            } catch (error) {
    console.error("HATA:", error);
    alert(error.message);
}
        });
    }

    // --- 4. KAYIT OLMA İŞLEMİ ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const inputs = registerForm.querySelectorAll('input');

const adSoyad = inputs[0].value;
const telefon = inputs[1].value;
const email = inputs[2].value;
const password = inputs[3].value;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
    adSoyad,
    telefon,
    email,
    password
})
                });
                const data = await response.json();

                if (response.ok) {
                    window.showToast(`✅ ${data.mesaj}`);
                    authModal.classList.remove('active'); 
                    registerForm.reset(); 
                    
                    localStorage.setItem('kavrulmus_token', data.token);
localStorage.setItem('kavrulmus_user', JSON.stringify(data.user));
                    checkSession();
                } else {
                    window.showToast(`❌ ${data.mesaj}`);
                }
            } catch (error) {
    console.error("HATA:", error);
    alert(error.message);
}
        });
    }
});