// js/modal.js

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. MODAL SEÇİCİLERİ ---
    const authModal = document.getElementById('auth-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const trackingModal = document.getElementById('tracking-modal');
    
    // --- 2. GİRİŞ YAP MODALI İŞLEMLERİ ---
    const openAuthBtn = document.getElementById('open-auth');
    const closeAuthBtn = document.getElementById('close-auth');
    
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('login-form');
    const formRegister = document.getElementById('register-form');

    if(openAuthBtn) {
        openAuthBtn.addEventListener('click', () => {
            authModal.classList.add('active');
        });
    }

    if(closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            authModal.classList.remove('active');
        });
    }

    // Tab Değiştirme (Giriş / Kayıt)
    if(tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.classList.add('active');
            formRegister.classList.remove('active');
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.classList.add('active');
            formLogin.classList.remove('active');
        });
    }

    // --- 3. CHECKOUT (ÖDEME) İŞLEMLERİ ---
    const goToCheckoutBtn = document.getElementById('go-to-checkout');
    const checkoutForm = document.getElementById('checkout-form');
    
    if(goToCheckoutBtn) {
        goToCheckoutBtn.addEventListener('click', () => {
            // Sepeti kapat
            document.getElementById('cart-sidebar').classList.remove('active');
            document.getElementById('cart-overlay').classList.remove('active');
            
            // Ödeme modalını aç
            checkoutModal.classList.add('active');
        });
    }

    // Checkout Formunu Gönder
    if(checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Sayfanın yenilenmesini engelle
            
            // Ödeme penceresini kapat, takip penceresini aç
            checkoutModal.classList.remove('active');
            trackingModal.classList.add('active');
            
            // Sepeti boşalt (Görsel olarak)
            document.getElementById('cart-count').innerText = "0";
            document.getElementById('cart-items').innerHTML = "";
            document.getElementById('cart-total').innerText = "0.00";
            
            // Animasyonu başlat
            startTrackingAnimation();
        });
    }

    // Modal kapatma butonları (Ödeme ve Takip için)
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('active');
        });
    });

    // Dışarı tıklayınca modalı kapatma (Tüm modallar için)
    window.addEventListener('click', (e) => {
        if(e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    // --- 4. SİPARİŞ TAKİP ANİMASYONU ---
    function startTrackingAnimation() {
        const progressFill = document.getElementById('track-progress');
        const stages = [
            document.getElementById('stage-1'),
            document.getElementById('stage-2'),
            document.getElementById('stage-3'),
            document.getElementById('stage-4')
        ];
        
        // Sıfırla
        progressFill.style.width = "0%";
        stages.forEach(stage => stage.classList.remove('active'));
        stages[0].classList.add('active'); // Sipariş onaylandı

        // Aşama 2: Barista Hazırlıyor (2 sn sonra)
        setTimeout(() => {
            progressFill.style.width = "33%";
            stages[1].classList.add('active');
        }, 2000);

        // Aşama 3: Kuryede (5 sn sonra)
        setTimeout(() => {
            progressFill.style.width = "66%";
            stages[2].classList.add('active');
        }, 5000);

        // Aşama 4: Teslim Edildi (8 sn sonra)
        setTimeout(() => {
            progressFill.style.width = "100%";
            stages[3].classList.add('active');
            
            if (typeof window.showToast === 'function') {
                window.showToast(`🎉 Siparişiniz teslim edilmiştir. Afiyet olsun!`);
            }
        }, 8000);
    }
});