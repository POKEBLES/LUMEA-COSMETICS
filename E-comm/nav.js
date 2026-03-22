/**
 * nav.js — Lumea Navbar Auth State Manager
 * Reads the current session and updates the navbar on every page load.
 * Depends on auth.js being loaded first.
 */

// ── Active Nav Link (standalone so it can be called on URL changes) ──────────
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'landing.html';
    const category    = new URLSearchParams(window.location.search).get('category');

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active-link');

        const href     = link.getAttribute('href') || '';
        const linkPage = href.split('?')[0];
        const linkUrl  = new URL(href, window.location.href);
        const linkCat  = linkUrl.searchParams.get('category');

        if (linkPage !== currentPage) return;

        if (currentPage === 'shop.html') {
            // Match by category param: null == null → All Products, 'face'=='face' → Face, etc.
            if (category === linkCat) link.classList.add('active-link');
        } else {
            link.classList.add('active-link');
        }
    });
}

// Patch history.pushState so we can detect URL changes made by shop.js
(function () {
    const _push = history.pushState.bind(history);
    history.pushState = function (...args) {
        _push(...args);
        setActiveNavLink();
    };
})();

// Also handle back/forward navigation
window.addEventListener('popstate', setActiveNavLink);

document.addEventListener('DOMContentLoaded', () => {
    setActiveNavLink();

    const user = getCurrentUser();

    const profileBtn = document.getElementById('nav-profile-btn');
    const wishlistBtn = document.getElementById('nav-wishlist-btn');
    const cartBtn = document.getElementById('nav-cart-btn');

    // Inject the "login required" modal once into the page
    injectLoginModal();

    if (user) {
        // ── LOGGED IN STATE ───────────────────────────────────────────────
        if (profileBtn) {
            profileBtn.title = `${user.firstName} ${user.lastName}`;
            profileBtn.setAttribute('aria-label', 'My Profile');
            profileBtn.innerHTML = `
                <div class="nav-avatar-icon" title="${user.firstName} ${user.lastName}" style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:50%; background:#F8F7F5; color:var(--color-text-main); border:1px solid var(--color-border); transition:var(--transition);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
            `;
            profileBtn.addEventListener('click', () => showProfileDropdown(user, profileBtn));
        }

        // Wishlist goes to wishlist.html
        if (wishlistBtn) {
            wishlistBtn.style.cursor = 'pointer';
            wishlistBtn.addEventListener('click', () => {
                window.location.href = 'wishlist.html';
            });
        }

        // Cart goes to cart.html
        if (cartBtn) {
            cartBtn.style.cursor = 'pointer';
            cartBtn.addEventListener('click', () => {
                window.location.href = 'cart.html';
            });
        }

    } else {
        // ── LOGGED OUT STATE ──────────────────────────────────────────────
        if (profileBtn) {
            const loginLink = document.createElement('a');
            loginLink.href = 'auth.html';
            loginLink.className = 'nav-login-link';
            loginLink.textContent = 'Login';
            profileBtn.replaceWith(loginLink);
        }

        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showLoginRequiredModal();
            });
        }

        if (cartBtn) {
            cartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showLoginRequiredModal();
            });
        }
    }
});

// ─── Profile Dropdown ────────────────────────────────────────────────────────

function showProfileDropdown(user, anchor) {
    const existing = document.getElementById('nav-profile-dropdown');
    if (existing) { existing.remove(); return; }

    const dropdown = document.createElement('div');
    dropdown.id = 'nav-profile-dropdown';
    dropdown.className = 'nav-profile-dropdown';
    dropdown.innerHTML = `
        <div class="dropdown-user-info">
            <strong>${user.firstName} ${user.lastName}</strong>
            <small>${user.email}</small>
            <span class="dropdown-account-type ${user.accountType}">${user.accountType === 'admin' ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.82-.33 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.06A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.92 4H9a1.7 1.7 0 0 0 1-1.54V2a2 2 0 1 1 4 0v.46A1.7 1.7 0 0 0 15 4h.08a1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.36.6.92.98 1.54 1H21a2 2 0 1 1 0 4h-.06c-.62.02-1.18.4-1.54 1Z"></path></svg>Admin' : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Customer'}</span>
        </div>
        <hr class="dropdown-divider">
        ${user.accountType === 'admin' ? `<a href="admin-overview.html?v=3" class="dropdown-item" style="color:#a08483;font-weight:600;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.82-.33 1.7 1.7 0 0 0-1 1.54V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.54 1.7 1.7 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.54-1H3a2 2 0 1 1 0-4h.06A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.92 4H9a1.7 1.7 0 0 0 1-1.54V2a2 2 0 1 1 4 0v.46A1.7 1.7 0 0 0 15 4h.08a1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.36.6.92.98 1.54 1H21a2 2 0 1 1 0 4h-.06c-.62.02-1.18.4-1.54 1Z"></path></svg>Admin Panel</a><hr class="dropdown-divider">` : ''}
        <a href="profile.html?v=3" class="dropdown-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>My Profile</a>
        <a href="wishlist.html?v=3" class="dropdown-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>Wishlist</a>
        <a href="cart.html?v=3" class="dropdown-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>My Cart</a>
        <hr class="dropdown-divider">
        <button class="dropdown-item" onclick="handleLogout()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Log Out</button>
    `;

    document.body.appendChild(dropdown);

    const rect = anchor.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 8) + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';

    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== anchor) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
}

// ─── Login Required Modal ────────────────────────────────────────────────────

function injectLoginModal() {
    if (document.getElementById('login-required-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'login-required-modal';
    modal.className = 'login-modal-overlay';
    // Add defensive inline styles to guarantee it doesn't render inline at the bottom
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99999; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div class="login-modal-card" style="background: white; border-radius: 16px; padding: 40px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); position: relative;">
            <button class="login-modal-close" onclick="hideLoginRequiredModal()" style="position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            <div class="login-modal-icon" style="margin-bottom: 16px;"><svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
            <h3 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 12px;">Login Required</h3>
            <p style="color: var(--color-text-light); margin-bottom: 24px;">You must be logged in to access this feature.</p>
            <a href="auth.html?v=3" class="btn btn-primary login-modal-btn" style="display: block; width: 100%; margin-bottom: 12px;">Log In</a>
            <a href="auth.html?mode=signup" class="btn btn-outline login-modal-btn" style="display: block; width: 100%;">Create Account</a>
        </div>
    `;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideLoginRequiredModal();
    });
    document.body.appendChild(modal);
}

function showLoginRequiredModal() {
    const modal = document.getElementById('login-required-modal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideLoginRequiredModal() {
    const modal = document.getElementById('login-required-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function handleLogout() {
    logoutUser();
    // Remove dropdown
    const dropdown = document.getElementById('nav-profile-dropdown');
    if (dropdown) dropdown.remove();
    // Reload to refresh navbar state
    window.location.reload();
}

// ─── Global Card Button Handlers ─────────────────────────────────────────────

window.handleCardWishlist = function (e, productId) {
    e.stopPropagation();
    const user = typeof getCurrentUser !== 'undefined' ? getCurrentUser() : null;
    if (!user) {
        if (typeof showLoginRequiredModal === 'function') showLoginRequiredModal();
        return;
    }
    if (typeof toggleWishlist === 'function') {
        const btn = e.currentTarget;
        const added = toggleWishlist(productId);
        // Update visual state — fill the heart when in wishlist
        const svg = btn.querySelector('svg');
        if (added) {
            btn.style.color = 'var(--color-accent)';
            if (svg) svg.setAttribute('fill', 'currentColor');
        } else {
            btn.style.color = '';
            if (svg) svg.setAttribute('fill', 'none');
        }
    }
};

window.handleCardCart = function (e, productId) {
    e.stopPropagation();
    const user = typeof getCurrentUser !== 'undefined' ? getCurrentUser() : null;
    if (!user) {
        if (typeof showLoginRequiredModal === 'function') showLoginRequiredModal();
        return;
    }
    if (typeof addToCart === 'function') {
        addToCart(productId, 1);
        const btn = e.currentTarget;
        const orig = btn.innerHTML;
        btn.innerHTML = '<span style="font-size:12px;color:#1A1A1A;font-weight:bold;margin-left:0px;">✓</span>';
        setTimeout(() => { btn.innerHTML = orig; }, 1200);
    }
};
