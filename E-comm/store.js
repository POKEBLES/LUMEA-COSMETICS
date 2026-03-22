/**
 * store.js — Lumea Cart & Wishlist State
 * All data backed by localStorage.
 * Depends on auth.js being loaded (uses getCurrentUser()).
 */

const CART_KEY = 'lumea_cart';
const WISHLIST_KEY = 'lumea_wishlist';

function getCurrentUserEmail() {
    if (typeof getCurrentUser !== 'function') return null;
    const user = getCurrentUser();
    return user && user.email ? user.email : null;
}

function queueDbWork(work) {
    Promise.resolve()
        .then(work)
        .catch(err => console.warn('Cart DB sync failed:', err.message));
}

async function syncCartFromDatabase() {
    if (!window.lumeaDB || !window.lumeaDB.isReady()) return;
    const email = getCurrentUserEmail();
    if (!email) return;

    const remoteCart = await window.lumeaDB.fetchCartByEmail(email);
    if (Array.isArray(remoteCart)) {
        saveCart(remoteCart);
        window.dispatchEvent(new CustomEvent('lumea-cart-synced'));
    }
}

// ─── Cart ────────────────────────────────────────────────────────────────────

function getCart() {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(productId, qty = 1) {
    productId = String(productId);
    const cart = getCart();
    const existing = cart.find(i => String(i.productId) === productId);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ productId, qty });
    }
    saveCart(cart);

    const email = getCurrentUserEmail();
    if (window.lumeaDB && window.lumeaDB.isReady() && email) {
        const item = cart.find(i => String(i.productId) === productId);
        queueDbWork(() => window.lumeaDB.upsertCartItem(email, productId, item ? item.qty : qty));
    }
}

function removeFromCart(productId) {
    productId = String(productId);
    saveCart(getCart().filter(i => String(i.productId) !== productId));

    const email = getCurrentUserEmail();
    if (window.lumeaDB && window.lumeaDB.isReady() && email) {
        queueDbWork(() => window.lumeaDB.deleteCartItem(email, productId));
    }
}

function updateCartQty(productId, qty) {
    productId = String(productId);
    const cart = getCart();
    const item = cart.find(i => String(i.productId) === productId);
    if (item) {
        item.qty = Math.max(1, qty);
        saveCart(cart);

        const email = getCurrentUserEmail();
        if (window.lumeaDB && window.lumeaDB.isReady() && email) {
            queueDbWork(() => window.lumeaDB.upsertCartItem(email, productId, item.qty));
        }
    }
}

function clearCart() {
    localStorage.removeItem(CART_KEY);

    const email = getCurrentUserEmail();
    if (window.lumeaDB && window.lumeaDB.isReady() && email) {
        queueDbWork(() => window.lumeaDB.clearCartByEmail(email));
    }
}

function getCartCount() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

function getWishlist() {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
}

function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

function addToWishlist(productId) {
    productId = String(productId);
    const list = getWishlist();
    if (!list.some(id => String(id) === productId)) {
        list.push(productId);
        saveWishlist(list);
    }
}

function removeFromWishlist(productId) {
    productId = String(productId);
    saveWishlist(getWishlist().filter(id => String(id) !== productId));
}

function toggleWishlist(productId) {
    productId = String(productId);
    if (isInWishlist(productId)) {
        removeFromWishlist(productId);
        return false;
    } else {
        addToWishlist(productId);
        return true;
    }
}

function isInWishlist(productId) {
    productId = String(productId);
    return getWishlist().some(id => String(id) === productId);
}

function getWishlistCount() {
    return getWishlist().length;
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.lumeaDB && window.lumeaDB.isReady()) {
        syncCartFromDatabase().catch(err => console.warn('Initial cart sync failed:', err.message));
    }
});

window.lumeaStoreAddToCart = addToCart;
