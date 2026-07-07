// js/tracking.js

document.addEventListener('DOMContentLoaded', () => {
    const checkoutForm = document.getElementById('checkout-form');
    const checkoutModal = document.getElementById('checkout-modal');
    const trackingModal = document.getElementById('tracking-modal');
    const progressFill = document.getElementById('track-progress');

    if (!checkoutForm || !trackingModal || !progressFill) return;

    const modalBox = trackingModal.querySelector('.modal-box');
    
    // Güvenli Stil Ayarları (Arayüzün jilet gibi durması için)
    const progressBarBg = modalBox.querySelector('.progress-bar-bg');
    if (progressBarBg) {
        progressBarBg.style.width = '100%';
        progressBarBg.style.height = '12px';
        progressBarBg.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        progressBarBg.style.borderRadius = '50px';
        progressBarBg.style.marginTop = '25px';
        progressBarBg.style.overflow = 'hidden';
        progressBarBg.style.border = '1px solid rgba(255, 255, 255, 0.05)';
    }
    
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = 'var(--gold-accent)';
    progressFill.style.width = '0%';
    progressFill.style.transition = 'width 1.5s ease-in-out';
    progressFill.style.boxShadow = '0 0 15px var(--gold-accent)';

    // Dinamik Durum Yazısı Alanı Oluştur
    let statusText = document.getElementById('tracking-status-text');
    if (!statusText) {
        statusText = document.createElement('p');
        statusText.id = 'tracking-status-text';
        statusText.style.color = '#999';
        statusText.style.marginTop = '20px';
        statusText.style.fontSize = '1.05rem';
        statusText.style.fontFamily = 'var(--font-body)';
        statusText.style.textAlign = 'center';
        statusText.style.lineHeight = '1.5';
        if (progressBarBg) progressBarBg.after(statusText);
    }

    // Ödeme Formu Onaylandığında Tetiklenecek Olay
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Ödeme Penceresini Kapat
        if (checkoutModal) checkoutModal.classList.remove('active');

        // 2. Takip Penceresini Aç
        trackingModal.classList.add('active');

        // 3. Gerçekçi Sipariş Aşamaları Mimarisi
        const adimlar = [
            { yuzde: '25%', yazi: '📥 Siparişiniz alındı, Kavrulmuş mutfağına iletildi.' },
            { yuzde: '60%', yazi: '☕ Çekirdekleriniz taze taze çekiliyor ve özenle hazırlanıyor...' },
            { yuzde: '85%', yazi: '🛵 Kuryemiz sıcak kahvenizi teslim aldı, yola çıktı!' },
            { yuzde: '100%', yazi: '🎉 Siparişiniz kapıda! Afiyet olsun dayı!' }
        ];

        let aktifAdim = 0;
        progressFill.style.width = '0%';
        statusText.innerHTML = '⏳ Siparişiniz işleniyor, lütfen bekleyin...';

        // Aşama aşama ilerleyen fonksiyon (Asenkron Döngü)
        function asamalariCalistir() {
            if (aktifAdim < adimlar.length) {
                const oankiAdim = adimlar[aktifAdim];
                
                setTimeout(() => {
                    // Çubuğu uzat ve metni güncelle
                    progressFill.style.width = oankiAdim.yuzde;
                    statusText.innerHTML = oankiAdim.yazi;
                    
                    // Her aşamada ekrana o premium toast bildirimini fırlat
                    if (typeof window.showToast === 'function') {
                        window.showToast(oankiAdim.yazi);
                    }

                    aktifAdim++;
                    asamalariCalistir(); // Kendi kendini çağırarak sonraki adıma geçer
                }, aktifAdim === 0 ? 500 : 3500); // İlk adım anında, diğerleri 3.5 saniye arayla
            }
        }

        // Simülasyonu Başlat
        asamalariCalistir();
        checkoutForm.reset();
    });
});