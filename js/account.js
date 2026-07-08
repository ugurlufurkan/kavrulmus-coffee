document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('kavrulmus_token');
    const loginRequired = document.getElementById('login-required');
    const accountContent = document.getElementById('account-content');
    const tabs = document.querySelectorAll('.account-tab');
    const panels = document.querySelectorAll('.account-panel');

    if (!token) {
        if (loginRequired) loginRequired.style.display = 'block';
        if (accountContent) accountContent.style.display = 'none';
        return;
    }

    if (loginRequired) loginRequired.style.display = 'none';
    if (accountContent) accountContent.style.display = 'block';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById(tab.dataset.panel);
            if (panel) panel.classList.add('active');
        });
    });

    loadProfile();
    loadOrders();

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const adSoyad = document.getElementById('profile-name').value.trim();
            const telefon = document.getElementById('profile-phone').value.trim();
            const email = document.getElementById('profile-email').value.trim();

            try {
                const res = await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ adSoyad, telefon, email })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('kavrulmus_user', JSON.stringify(data.user));
                    window.showToast(`✅ ${data.mesaj}`);
                } else {
                    window.showToast(`❌ ${data.mesaj}`);
                }
            } catch {
                window.showToast('❌ Profil güncellenemedi.');
            }
        });
    }

    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mevcutSifre = document.getElementById('current-password').value;
            const yeniSifre = document.getElementById('new-password').value;
            const yeniSifreTekrar = document.getElementById('new-password-confirm').value;

            if (yeniSifre !== yeniSifreTekrar) {
                window.showToast('❌ Yeni şifreler eşleşmiyor.');
                return;
            }

            try {
                const res = await fetch('/api/auth/password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ mevcutSifre, yeniSifre })
                });
                const data = await res.json();

                if (res.ok) {
                    passwordForm.reset();
                    window.showToast(`✅ ${data.mesaj}`);
                } else {
                    window.showToast(`❌ ${data.mesaj}`);
                }
            } catch {
                window.showToast('❌ Şifre güncellenemedi.');
            }
        });
    }
});

async function loadProfile() {
    const token = localStorage.getItem('kavrulmus_token');
    if (!token) return;

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('kavrulmus_token');
                localStorage.removeItem('kavrulmus_user');
                window.location.reload();
            }
            return;
        }

        const user = await res.json();
        const nameEl = document.getElementById('profile-name');
        const phoneEl = document.getElementById('profile-phone');
        const emailEl = document.getElementById('profile-email');
        const welcomeEl = document.getElementById('account-welcome');

        if (nameEl) nameEl.value = user.name || '';
        if (phoneEl) phoneEl.value = user.phone || '';
        if (emailEl) emailEl.value = user.email || '';
        if (welcomeEl) {
            welcomeEl.textContent = user.name
                ? `Merhaba, ${user.name}`
                : `Merhaba, ${user.email.split('@')[0]}`;
        }
    } catch {
        window.showToast('❌ Profil bilgileri yüklenemedi.');
    }
}

async function loadOrders() {
    const token = localStorage.getItem('kavrulmus_token');
    const container = document.getElementById('orders-list');
    if (!token || !container) return;

    try {
        const res = await fetch('/api/siparislerim', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;

        const siparisler = await res.json();

        if (siparisler.length === 0) {
            container.innerHTML = `
                <div class="orders-empty">
                    <span>📦</span>
                    <p>Henüz siparişiniz bulunmuyor.</p>
                    <a href="urunler.html" class="btn-premium primary" style="margin-top:15px;">Alışverişe Başla</a>
                </div>
            `;
            return;
        }

        container.innerHTML = siparisler.map(s => {
            const tarih = new Date(s.tarih).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const urunler = Array.isArray(s.urunler) ? s.urunler : [];
            const urunListesi = urunler.map(u =>
                `<li>${u.quantity || 1}x ${u.title || u.baslik || 'Ürün'} — ${u.price || u.fiyat || 0} TL</li>`
            ).join('');
            const odeme = s.odemeYontemi === 'card' ? 'Kredi/Banka Kartı' : 'Kapıda Ödeme';

            return `
                <div class="order-card">
                    <div class="order-card-header">
                        <div>
                            <div class="order-id">#${s.id}</div>
                            <div class="order-date">${tarih}</div>
                        </div>
                        <span class="order-status">${s.durum || 'Hazırlanıyor'}</span>
                    </div>
                    <ul class="order-items">${urunListesi}</ul>
                    <div class="order-footer">
                        <span class="order-total">${s.toplamTutar} TL</span>
                        <span style="font-size:0.85rem;color:#888;">${odeme}</span>
                        <span class="order-address">📍 ${s.adres || ''}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch {
        container.innerHTML = '<p style="color:#888;">Siparişler yüklenirken bir hata oluştu.</p>';
    }
}