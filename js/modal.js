// js/modal.js

document.addEventListener('DOMContentLoaded', () => {
    // Modal Seçicileri
    const authModal = document.getElementById('auth-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const openAuthBtn = document.getElementById('open-auth');
    const closeBtns = document.querySelectorAll('.close-modal');
    
    // Auth Form Seçicileri
    const loginForm = document.getElementById('login-form');

    // Modalları Açma Fonksiyonları
    if (openAuthBtn) {
        openAuthBtn.addEventListener('click', () => {
            authModal.classList.add('active');
        });
    }

    // Ortak Kapatma İşlemi
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('active');
        });
    });

    // Dışarı tıklayınca kapatma
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    // --- YENİ: KAYIT/GİRİŞ FORMUNU BACKEND'E GÖNDERME ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Sayfanın yenilenmesini engelle

            // Inputların içindeki değerleri al
            const emailInput = loginForm.querySelector('input[type="email"]');
            const passwordInput = loginForm.querySelector('input[type="password"]');
            
            const email = emailInput.value;
            const password = passwordInput.value;

            try {
                // Backend'e POST isteği at
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email, password: password }) // Veriyi JSON'a çevirip yolla
                });

                const data = await response.json();

                // Eğer sunucudan olumlu cevap geldiyse
                if (response.ok) {
                    window.showToast(`✅ ${data.mesaj}`);
                    authModal.classList.remove('active'); // Modalı kapat
                    loginForm.reset(); // Formu temizle
                    openAuthBtn.innerHTML = `👤 ${email.split('@')[0]}`; // Navbar'daki butona ismini yaz
                } else {
                    // E-posta kullanımdaysa hata mesajı göster
                    window.showToast(`❌ ${data.mesaj}`);
                }
            } catch (error) {
                console.error("Kayıt hatası:", error);
                window.showToast('❌ Sunucuya bağlanılamadı.');
            }
        });
    }
});