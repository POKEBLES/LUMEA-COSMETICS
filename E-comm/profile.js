/**
 * profile.js — Lumea Profile Page Logic
 * Loads user data, handles edit toggles, saves back to localStorage.
 */

// Use global keys from auth.js
// const USERS_KEY = 'lumea_users';
// const SESSION_KEY = 'lumea_session';

document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user) {
        // Not logged in — redirect to auth
        window.location.href = 'auth.html';
        return;
    }
    loadProfileData(user);
    loadNotificationPrefs(user.email);
});

function getFullUser(email) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users.find(u => u.email === email) || null;
}

function updateFullUser(email, updates) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex(u => u.email === email);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        // Update session too if name changed
        const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
        if (updates.firstName) session.firstName = updates.firstName;
        if (updates.lastName) session.lastName = updates.lastName;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
}

function loadProfileData(sessionUser) {
    const full = getFullUser(sessionUser.email);
    if (!full) return;

    setValue('pf-first-name', full.firstName);
    setValue('pf-last-name', full.lastName);
    setValue('pf-email', full.email);
    setValue('pf-phone', full.phone || '');
    setValue('pf-street', full.address?.street || '');
    setValue('pf-city', full.address?.city || '');
    setValue('pf-postal', full.address?.postalCode || '');
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

// ─── Edit Sections ────────────────────────────────────────────────────────────

const originalValues = {};

function enableEdit(section) {
    const card = document.getElementById(`card-${section}`);
    if (!card) return;
    const inputs = card.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    // Snapshot originals
    originalValues[section] = {};
    inputs.forEach(input => {
        originalValues[section][input.id] = input.value;
        input.disabled = false;
        input.style.background = 'white';
    });
    inputs[0]?.focus();
    document.getElementById(`actions-${section}`).classList.add('visible');
}

function cancelEdit(section) {
    const card = document.getElementById(`card-${section}`);
    if (!card) return;
    const inputs = card.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    // Restore originals
    inputs.forEach(input => {
        if (originalValues[section]?.[input.id] !== undefined) {
            input.value = originalValues[section][input.id];
        }
        input.disabled = true;
        input.style.background = '';
    });
    document.getElementById(`actions-${section}`).classList.remove('visible');
}

function saveSection(section) {
    const sessionUser = getCurrentUser();
    if (!sessionUser) return;

    let updates = {};

    if (section === 'personal') {
        updates = {
            firstName: document.getElementById('pf-first-name').value.trim(),
            lastName: document.getElementById('pf-last-name').value.trim(),
            phone: document.getElementById('pf-phone').value.trim(),
        };
        // email changes are not allowed in this simplistic system
    }

    if (section === 'address') {
        updates = {
            address: {
                street: document.getElementById('pf-street').value.trim(),
                city: document.getElementById('pf-city').value.trim(),
                postalCode: document.getElementById('pf-postal').value.trim(),
            }
        };
    }

    updateFullUser(sessionUser.email, updates);

    // Lock back to read-only without reverting values
    const card = document.getElementById(`card-${section}`);
    if (card) {
        const inputs = card.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        inputs.forEach(input => {
            input.disabled = true;
            input.style.background = '';
        });
        document.getElementById(`actions-${section}`).classList.remove('visible');
    }
    showToast('Changes saved!');
}

// ─── Password Change ──────────────────────────────────────────────────────────

function togglePasswordChange() {
    const form = document.getElementById('password-change-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    document.getElementById('pf-new-pw').value = '';
    document.getElementById('pf-confirm-pw').value = '';
    document.getElementById('pw-error').style.display = 'none';
}

function savePassword() {
    const sessionUser = getCurrentUser();
    if (!sessionUser) return;

    const newPw = document.getElementById('pf-new-pw').value;
    const confirmPw = document.getElementById('pf-confirm-pw').value;
    const errEl = document.getElementById('pw-error');

    if (newPw.length < 8) {
        errEl.textContent = 'Password must be at least 8 characters.';
        errEl.style.display = 'block';
        return;
    }
    if (newPw !== confirmPw) {
        errEl.textContent = 'Passwords do not match.';
        errEl.style.display = 'block';
        return;
    }

    // Use simpleHash from auth.js
    updateFullUser(sessionUser.email, { passwordHash: simpleHash(newPw) });
    togglePasswordChange();
    showToast('Password updated!');
}

// ─── Notifications ────────────────────────────────────────────────────────────

function loadNotificationPrefs(email) {
    const prefs = JSON.parse(localStorage.getItem(`lumea_notif_${email}`) || '{"promo":false,"orders":true}');
    const promoEl = document.getElementById('notif-promo');
    const ordersEl = document.getElementById('notif-orders');
    if (promoEl) promoEl.checked = prefs.promo;
    if (ordersEl) ordersEl.checked = prefs.orders;
}

function saveNotifications() {
    const sessionUser = getCurrentUser();
    if (!sessionUser) return;
    const prefs = {
        promo: document.getElementById('notif-promo').checked,
        orders: document.getElementById('notif-orders').checked
    };
    localStorage.setItem(`lumea_notif_${sessionUser.email}`, JSON.stringify(prefs));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(msg) {
    let toast = document.getElementById('profile-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'profile-toast';
        toast.style.cssText = `
            position:fixed;bottom:28px;right:28px;background:#879E7B;color:white;
            padding:12px 24px;border-radius:8px;font-family:'Outfit',sans-serif;
            font-size:0.9rem;font-weight:600;z-index:9999;
            box-shadow:0 6px 20px rgba(0,0,0,0.15);
            animation: toastIn 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

// Expose simpleHash (from auth.js) for password update
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(16);
}
