/**
 * cart.js — Lumea Cart Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    renderCart();
    renderRecommendations();
});

function renderCart() {
    const cart = getCart();
    const container = document.getElementById('cart-items-container');
    const summaryEl = document.getElementById('cart-summary');
    const totalEl = document.getElementById('cart-total');

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></div>
                <h3>Your cart is empty</h3>
                <p>Looks like you haven't added anything yet.</p>
                <a href="shop.html?v=3" class="btn-save" style="display:inline-block;text-decoration:none;padding:12px 28px;">Browse Products</a>
            </div>`;
        if (summaryEl) summaryEl.style.display = 'none';
        return;
    }

    let total = 0;
    const grid = document.createElement('div');
    grid.className = 'cart-grid';

    cart.forEach(item => {
        const product = getProducts().find(p => String(p.id) === String(item.productId));
        if (!product) return;

        const price = typeof product.price === 'number' ? product.price : parseFloat(product.price.toString().replace('₱', ''));
        total += price * item.qty;

        const card = document.createElement('div');
        card.className = 'cart-item-card';
        const imgUrl = getProductImage(product);
        card.innerHTML = `
            <button class="cart-item-remove" onclick="handleRemoveFromCart('${item.productId}')" title="Remove">✕</button>
            <div class="cart-item-img">${imgUrl ? `<img src="${imgUrl}" alt="${product.name}">` : 'img'}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${product.name}</div>
                <div class="cart-item-price">₱${price.toFixed(2)} <span style="font-size:0.78rem;color:var(--color-text-light);font-weight:400;">×${item.qty}</span></div>
                <span class="stock-badge in-stock">In Stock</span>
                <button class="btn-checkout" onclick="window.location.href='product.html?id=${product.id}'">View Product</button>
            </div>
        `;
        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);

    if (summaryEl) summaryEl.style.display = 'block';
    if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;
}

function handleRemoveFromCart(productId) {
    removeFromCart(productId);
    renderCart();
}

function renderRecommendations() {
    const products = getProducts();
    const recGrid = document.getElementById('rec-grid');
    if (!recGrid || products.length === 0) return;

    const cart = getCart();
    const cartIds = cart.map(i => String(i.productId));
    const recs = products.filter(p => !cartIds.includes(String(p.id))).slice(0, 6);

    if (recs.length === 0) {
        document.getElementById('recommendations-section').style.display = 'none';
        return;
    }

    recGrid.innerHTML = recs.map(p => {
        const rImgUrl = getProductImage(p);
        return `
        <div class="rec-card">
            <div class="rec-img">${rImgUrl ? `<img src="${rImgUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : 'img'}</div>
            <div class="rec-info">
                <div class="rec-name">${p.name}</div>
                <div class="rec-price">₱${(typeof p.price === 'number' ? p.price : parseFloat(p.price.toString().replace('₱', ''))).toFixed(2)}</div>
                <span class="stock-badge in-stock">In Stock</span>
                <button class="btn-add-cart" onclick="handleAddToCart('${p.id}')">Add to Cart</button>
            </div>
        </div>
    `}).join('');
}

function handleAddToCart(productId) {
    addToCart(productId, 1);
    renderCart();
    renderRecommendations();
}
