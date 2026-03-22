/**
 * wishlist.js — Lumea Wishlist Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    renderWishlist();
});

function renderWishlist() {
    const list = getWishlist();
    const container = document.getElementById('wishlist-container');

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
                <h3>Your wishlist is empty</h3>
                <p>Save items you love while browsing the shop.</p>
                <a href="shop.html?v=3" class="btn-save" style="display:inline-block;text-decoration:none;padding:12px 28px;">Browse Products</a>
            </div>`;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'wishlist-grid';

    list.forEach(productId => {
        const product = getProducts().find(p => String(p.id) === String(productId));
        if (!product) return;

        // "Only show products here that are not in cart"
        const inCart = getCart().some(i => String(i.productId) === String(productId));
        if (inCart) return;

        const card = document.createElement('div');
        card.className = 'wishlist-card';
        card.id = `wl-card-${productId}`;
        // Removed product.stock from stock-badge, replaced with explicit 'In Stock'
        const imgUrl = getProductImage(product);
        card.innerHTML = `
            <button class="cart-item-remove" onclick="handleRemoveFromWishlist('${productId}')" title="Remove from wishlist">✕</button>
            <div class="cart-item-img">${imgUrl ? `<img src="${imgUrl}" alt="${product.name}">` : 'img'}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${product.name}</div>
                <div class="cart-item-price">₱${(typeof product.price === 'number' ? product.price : parseFloat(product.price.toString().replace('₱', ''))).toFixed(2)}</div>
                <span class="stock-badge in-stock">In Stock</span>
                <button class="btn-move-cart" onclick="handleMoveToCart('${productId}')">
                    Move to Cart
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    if (grid.children.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div>
                <h3>Your wishlist is empty</h3>
                <p>Save items you love while browsing the shop.</p>
                <a href="shop.html?v=3" class="btn-save" style="display:inline-block;text-decoration:none;padding:12px 28px;">Browse Products</a>
            </div>`;
        return;
    }

    container.innerHTML = '';
    container.appendChild(grid);
}

function handleRemoveFromWishlist(productId) {
    removeFromWishlist(productId);
    renderWishlist();
}

function handleMoveToCart(productId) {
    addToCart(productId, 1);
    removeFromWishlist(productId);
    renderWishlist();
}
