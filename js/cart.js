// js/cart.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sepet Verilerini LocalStorage'dan Çek veya Boş Başlat
    let cart = JSON.parse(localStorage.getItem('kavrulmus_cart')) || [];
    
    // 2. Gerekli HTML Öğelerini Seç
    const cartCount = document.getElementById('cart-count');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartIcon = document.getElementById('cart-icon');
    const closeCartBtn = document.getElementById('close-cart');
    const goToCheckoutBtn = document.getElementById('go-to-checkout');
    const checkoutModal = document.getElementById('checkout-modal');

    // --- SEPETİ AÇ / KAPAT ---
    if(cartIcon) {
        cartIcon.addEventListener('click', () => {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
        });
    }

    const closeCart = () => {
        if(cartSidebar) cartSidebar.classList.remove('active');
        if(cartOverlay) cartOverlay.classList.remove('active');
    };

    if(closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if(cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // --- SEPETİ EKRANA ÇİZME (RENDER) MOTORU ---
    const renderCart = () => {
        if (!cartItemsContainer) return;
        
        cartItemsContainer.innerHTML = ''; // Önce içi temizle
        let total = 0;
        let count = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; margin-top:30px; color:#999; font-style:italic;">Sepetiniz şu an boş. Hemen kahve keşfedin!</p>';
        } else {
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                count += item.quantity;

                // Her ürün için sepet tasarımı
                const cartItemEl = document.createElement('div');
                cartItemEl.style.display = 'flex';
                cartItemEl.style.gap = '15px';
                cartItemEl.style.marginBottom = '20px';
                cartItemEl.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                cartItemEl.style.paddingBottom = '15px';

                cartItemEl.innerHTML = `
                    <img src="${item.image}" alt="${item.title}" style="width: 75px; height: 75px; object-fit: cover; border-radius: 10px;">
                    <div style="flex:1;">
                        <h4 style="margin:0 0 5px 0; font-size:1rem; color: #fff;">${item.title}</h4>
                        <div style="color:var(--gold-accent); font-weight:bold; margin-bottom:10px;">${item.price} TL</div>
                        
                        <div style="display:flex; align-items:center; gap:12px;">
                            <button class="btn-qty decrease" data-id="${item.id}" style="background:rgba(255,255,255,0.1); color:#fff; border:none; width:28px; height:28px; border-radius:6px; cursor:pointer;">-</button>
                            <span style="color:#fff; font-weight:bold;">${item.quantity}</span>
                            <button class="btn-qty increase" data-id="${item.id}" style="background:var(--gold-accent); color:#111; border:none; width:28px; height:28px; border-radius:6px; cursor:pointer;">+</button>
                        </div>
                    </div>
                    <button class="btn-remove" data-id="${item.id}" style="background:transparent; border:none; color:#ff4d4d; font-size:1.5rem; cursor:pointer; align-self:flex-start;">&times;</button>
                `;
                cartItemsContainer.appendChild(cartItemEl);
            });
        }

        // Fiyat ve Sayı Güncellemesi
        if(cartTotal) cartTotal.innerText = total.toFixed(2);
        if(cartCount) cartCount.innerText = count;

        // Her değişiklikte veriyi tarayıcı hafızasına mühürle
        localStorage.setItem('kavrulmus_cart', JSON.stringify(cart));
    };

    // --- OLAY YETKİLENDİRME (EVENT DELEGATION) MİMARİSİ ---
    document.addEventListener('click', (e) => {
        
        // 1. Ürün Ekleme Butonuna Basıldıysa
        if (e.target.closest('.add-to-cart')) {
            const btn = e.target.closest('.add-to-cart');
            const id = btn.dataset.id;
            const title = btn.dataset.title;
            const price = parseFloat(btn.dataset.price);
            const image = btn.dataset.image;

            const existingItem = cart.find(item => item.id === id);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ id, title, price, image, quantity: 1 });
            }

            renderCart();
            
            if (typeof window.showToast === 'function') window.showToast(`🛒 ${title} sepete eklendi!`);
            if (cartSidebar && cartOverlay) {
                cartSidebar.classList.add('active');
                cartOverlay.classList.add('active');
            }
        }

        // 2. Miktar Artırma Butonu
        if (e.target.classList.contains('increase')) {
            const item = cart.find(i => i.id === e.target.dataset.id);
            if(item) item.quantity += 1;
            renderCart();
        }

        // 3. Miktar Azaltma Butonu
        if (e.target.classList.contains('decrease')) {
            const id = e.target.dataset.id;
            const item = cart.find(i => i.id === id);
            if(item) {
                item.quantity -= 1;
                if(item.quantity === 0) cart = cart.filter(i => i.id !== id);
            }
            renderCart();
        }

        // 4. Çarpı İle Tamamen Silme
        if (e.target.classList.contains('btn-remove')) {
            cart = cart.filter(i => i.id !== e.target.dataset.id);
            renderCart();
        }
    });

    // --- SİPARİŞİ TAMAMLA GÜVENLİK SİSTEMİ ---
    if(goToCheckoutBtn) {
        goToCheckoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                window.showToast('❌ Sepetiniz boş, lütfen kahve ekleyin!');
                return;
            }
            
            // Müşteri Giriş Yapmış Mı Kontrolü (YENİ JWT SİSTEMİ)
            const token = localStorage.getItem('kavrulmus_token');
            if (!token) {
                window.showToast('⚠️ Lütfen önce giriş yapın veya kayıt olun!');
                closeCart();
                const authModal = document.getElementById('auth-modal');
                if(authModal) authModal.classList.add('active'); // Giriş panelini aç
                return;
            }

            closeCart();
            if(checkoutModal) checkoutModal.classList.add('active'); // Ödeme modalını aç
        });
    }

    // --- DEMO KART FORMU: alan göster/gizle + basit formatlama ---
    // NOT: Bu alanlar sadece görsel demo amaçlıdır. Kart bilgileri hiçbir zaman
    // sunucuya gönderilmez, sadece "ödeme başarılı" animasyonu için kullanılır.
    const odemeSelect = document.getElementById('odeme-yontemi-select');
    const cardFields = document.getElementById('card-fields');
    const cardNumberInput = document.getElementById('card-number');
    const cardExpiryInput = document.getElementById('card-expiry');
    const cardCvvInput = document.getElementById('card-cvv');

    if (odemeSelect && cardFields) {
        odemeSelect.addEventListener('change', () => {
            const kartSecili = odemeSelect.value === 'card';
            cardFields.classList.toggle('hidden', !kartSecili);
            if (cardNumberInput) cardNumberInput.required = kartSecili;
            if (cardExpiryInput) cardExpiryInput.required = kartSecili;
            if (cardCvvInput) cardCvvInput.required = kartSecili;
        });
    }

    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', () => {
            let val = cardNumberInput.value.replace(/\D/g, '').slice(0, 16);
            cardNumberInput.value = val.replace(/(.{4})/g, '$1 ').trim();
        });
    }

    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', () => {
            let val = cardExpiryInput.value.replace(/\D/g, '').slice(0, 4);
            if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
            cardExpiryInput.value = val;
        });
    }

    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', () => {
            cardCvvInput.value = cardCvvInput.value.replace(/\D/g, '').slice(0, 3);
        });
    }

    // --- GERÇEK SİPARİŞİ SUNUCUYA GÖNDERME (CHECKOUT) ---
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const inputs = checkoutForm.querySelectorAll('input');
            const isim = inputs[0].value;
            const tel = inputs[1].value;
            const adres = checkoutForm.querySelector('textarea').value;
            const odeme = checkoutForm.querySelector('select').value;
            const userEmail = localStorage.getItem('kavrulmus_user_email') || 'Misafir';

            const toplamTutar = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const submitBtn = checkoutForm.querySelector('button[type="submit"]');

            // Kart seçiliyse sahte bir "ödeme işleniyor" animasyonu göster.
            // Kart bilgileri (numara/son kullanma/cvv) hiçbir yere gönderilmiyor.
            if (odeme === 'card') {
                const originalText = submitBtn.innerText;
                submitBtn.disabled = true;
                submitBtn.innerText = '💳 Ödeme işleniyor...';
                await new Promise(resolve => setTimeout(resolve, 1400));
                submitBtn.innerText = '✅ Onaylandı!';
                await new Promise(resolve => setTimeout(resolve, 400));
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }

            const siparisVerisi = { 
                musteriAd: isim, 
                telefon: tel, 
                adres: adres, 
                odemeYontemi: odeme, 
                sepet: cart, 
                toplamTutar: toplamTutar, 
                userEmail: userEmail 
            };

            try {
                // Backend'e POST isteği at
                const response = await fetch('/api/siparis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(siparisVerisi)
                });
                
                const data = await response.json();

                if (response.ok) {
                    cart = []; // Sepeti bellekte sıfırla
                    renderCart(); // Ekranda sepeti boşalt
                    
                    document.getElementById('checkout-modal').classList.remove('active'); // Ödeme modalını kapat
                    
                    // Takip numarasını güncelle ve ekranda göster
                    const trackingNoEl = document.querySelector('#tracking-modal p strong');
                    if (trackingNoEl) trackingNoEl.innerText = `#${data.takipNo}`;
                    
                    document.getElementById('tracking-modal').classList.add('active'); // Takip modalını aç
                    checkoutForm.reset();
                    if (cardFields) cardFields.classList.add('hidden');
                    
                    window.showToast(`✅ ${data.mesaj}`);
                } else {
                    window.showToast(`❌ ${data.mesaj}`);
                }
            } catch (error) {
                window.showToast('❌ Sipariş iletilemedi. Sunucu açık mı?');
            }
        });
    }

    // Sayfa ilk yüklendiğinde hafızadaki sepeti ekrana çiz
    renderCart();
});