/**
 * checkout.js — Lumea Checkout Wizard Logic
 */

let subtotal = 0;
let shippingFee = 9.99; // Default Standard

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Auth & Cart Data
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    // 2. Populate User Information if available
    document.getElementById('co-fname').value = user.firstName || '';
    document.getElementById('co-lname').value = user.lastName || '';
    document.getElementById('co-email').value = user.email || '';
    // (A real app would also load saved address here if mapped)

    // 3. Render the sidebar order summary
    renderOrderSummary(cart);
});

function renderOrderSummary(cart) {
    const container = document.getElementById('co-summary-items');
    container.innerHTML = '';
    subtotal = 0;

    cart.forEach(item => {
        const product = getProducts().find(p => String(p.id) === String(item.productId));
        if (!product) return;

        const price = typeof product.price === 'number' ? product.price : parseFloat(product.price.toString().replace('₱', ''));
        const itemTotal = price * item.qty;
        subtotal += itemTotal;

        // Use centralized image helper
        const imgUrl = getProductImage(product);

        const itemHtml = `
            <div class="summary-item">
                <div class="s-item-left">
                    ${imgUrl ? `<img src="${imgUrl}" alt="${product.name}" class="s-item-img" onerror="this.style.background='var(--color-background-alt)'; this.removeAttribute('src');">` : `<div class="s-item-img" style="background:var(--color-background-alt);"></div>`}
                    <div class="s-item-info">
                        <div class="s-item-name">${product.name}</div>
                        <div class="s-item-qty">Qty: ${item.qty}</div>
                    </div>
                </div>
                <div class="s-item-price">₱${price.toFixed(2)}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', itemHtml);
    });

    updateTotals();
}

function updateTotals() {
    // Tax roughly 8%
    const tax = subtotal * 0.08;
    const total = subtotal + shippingFee + tax;

    document.getElementById('co-subtotal').textContent = `₱${subtotal.toFixed(2)}`;
    document.getElementById('co-shipping-fee').textContent = `₱${shippingFee.toFixed(2)}`;
    document.getElementById('co-tax').textContent = `₱${tax.toFixed(2)}`;
    document.getElementById('co-total').textContent = `₱${total.toFixed(2)}`;
}

function nextStep(step) {
    // Basic fake validation lock
    if (step === 2) {
        if (!document.getElementById('co-fname').value || !document.getElementById('co-street').value) {
            // Not making it entirely flawless out of respect for brevity, but let's encourage at least name.
            if (!document.getElementById('co-fname').value) return document.getElementById('co-fname').focus();
            if (!document.getElementById('co-street').value) return document.getElementById('co-street').focus();
        }
    }

    // Hide all
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`step-${i}-content`).style.display = 'none';
        const indicator = document.getElementById(`step-indicator-${i}`);

        if (i <= step) {
            indicator.classList.add('active'); // active up to current step
        } else {
            indicator.classList.remove('active');
        }
    }

    // Show current
    document.getElementById(`step-${step}-content`).style.display = 'block';

    // Smooth scroll back to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectShipping(type, price) {
    // Reset classes
    document.getElementById('shipping-standard').classList.remove('selected');
    document.getElementById('shipping-express').classList.remove('selected');
    document.getElementById('shipping-overnight').classList.remove('selected');

    // Select clicked
    document.getElementById(`shipping-${type}`).classList.add('selected');

    shippingFee = price;
    updateTotals();
}

function selectPayment(method) {
    // Tabs
    document.getElementById('pm-tab-card').classList.remove('active');
    document.getElementById('pm-tab-gcash').classList.remove('active');
    document.getElementById('pm-tab-cod').classList.remove('active');
    document.getElementById(`pm-tab-${method}`).classList.add('active');

    // Forms Toggle
    document.getElementById('pm-card-form').style.display = 'none';
    document.getElementById('pm-gcash-form').style.display = 'none';
    document.getElementById('pm-cod-form').style.display = 'none';
    document.getElementById(`pm-${method}-form`).style.display = 'block';
}

function placeOrder() {
    const user = getCurrentUser() || {};

    // Generate order data before clearing the cart
    const rndNum = Math.floor(1000 + Math.random() * 9000);
    const orderNum = `ORD-${rndNum}`;
    const cart = getCart();
    const tax = subtotal * 0.08;
    const total = subtotal + shippingFee + tax;

    // Build order items snapshot
    const orderItems = [];
    cart.forEach(item => {
        const product = getProducts().find(p => String(p.id) === String(item.productId));
        if (!product) return;
        const price = typeof product.price === 'number' ? product.price : parseFloat(product.price.toString().replace('₱', ''));
        const imgUrl = getProductImage(product);
        orderItems.push({ name: product.name, qty: item.qty, price, imgUrl });
    });

    // Save order to localStorage
    const orderRecord = {
        id: orderNum,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        status: 'Processing',
        customerName: (document.getElementById('co-fname').value + ' ' + document.getElementById('co-lname').value).trim() || user.firstName + ' ' + user.lastName,
        customerEmail: document.getElementById('co-email').value || user.email,
        items: orderItems,
        subtotal,
        shippingFee,
        tax,
        total
    };
    const existingOrders = JSON.parse(localStorage.getItem('lumea_orders') || '[]');
    existingOrders.unshift(orderRecord); // newest first
    localStorage.setItem('lumea_orders', JSON.stringify(existingOrders));

    // Clear the cart
    if (typeof clearCart === 'function') {
        clearCart();
    } else {
        localStorage.removeItem('lumea_cart');
    }

    // Transition to confirmation UI
    document.getElementById('checkout-wizard').style.display = 'none';
    document.getElementById('checkout-steps').style.display = 'none';
    document.querySelector('.checkout-title').style.display = 'none';
    document.getElementById('confirmation-view').style.display = 'block';

    document.getElementById('conf-order-num').textContent = orderNum;

    const d = new Date();
    d.setDate(d.getDate() + 7);
    document.getElementById('conf-est-delivery').textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
