// js/tracking.js — Sipariş onayı sonrası takip animasyonu (cart.js çağırır)

window.showOrderTracking = function (takipNo) {
    const trackingModal = document.getElementById('tracking-modal');
    const progressFill = document.getElementById('track-progress');
    if (!trackingModal) return;

    const trackingNoEl = document.getElementById('tracking-order-no')
        || trackingModal.querySelector('p strong');
    if (trackingNoEl) trackingNoEl.textContent = `#${takipNo}`;

    trackingModal.classList.add('active');

    if (!progressFill) return;

    const modalBox = trackingModal.querySelector('.modal-box');
    const progressBarBg = modalBox?.querySelector('.progress-bar-bg');

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

    let statusText = document.getElementById('tracking-status-text');
    if (!statusText && progressBarBg) {
        statusText = document.createElement('p');
        statusText.id = 'tracking-status-text';
        statusText.style.color = '#999';
        statusText.style.marginTop = '20px';
        statusText.style.fontSize = '1.05rem';
        statusText.style.fontFamily = 'var(--font-body)';
        statusText.style.textAlign = 'center';
        statusText.style.lineHeight = '1.5';
        progressBarBg.after(statusText);
    }

    const adimlar = [
        { yuzde: '25%', yazi: '📥 Siparişiniz alındı, Kavrulmuş mutfağına iletildi.' },
        { yuzde: '60%', yazi: '☕ Çekirdekleriniz taze taze çekiliyor ve özenle hazırlanıyor...' },
        { yuzde: '85%', yazi: '🛵 Kuryemiz sıcak kahvenizi teslim aldı, yola çıktı!' },
        { yuzde: '100%', yazi: '🎉 Siparişiniz kapıda! Afiyet olsun!' }
    ];

    let aktifAdim = 0;
    progressFill.style.width = '0%';
    if (statusText) statusText.innerHTML = '⏳ Siparişiniz işleniyor, lütfen bekleyin...';

    function asamalariCalistir() {
        if (aktifAdim >= adimlar.length) return;
        const oankiAdim = adimlar[aktifAdim];
        setTimeout(() => {
            progressFill.style.width = oankiAdim.yuzde;
            if (statusText) statusText.innerHTML = oankiAdim.yazi;
            if (typeof window.showToast === 'function') window.showToast(oankiAdim.yazi);
            aktifAdim++;
            asamalariCalistir();
        }, aktifAdim === 0 ? 500 : 3500);
    }

    asamalariCalistir();
};
