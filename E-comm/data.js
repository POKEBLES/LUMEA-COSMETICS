// Shared Product Database Metadata
window.LUMEA_ADMIN_PRODUCTS_KEY = 'lumea_admin_products_v2';
const ADMIN_PRODUCTS_KEY = window.LUMEA_ADMIN_PRODUCTS_KEY;

function cacheProducts(products) {
    localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(products));
}

function getProductsSnapshot(products) {
    return JSON.stringify((products || []).map(p => ({
        id: Number(p.id),
        name: p.name,
        category: p.category,
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        status: p.status || 'In Stock',
        imageUrl: p.imageUrl || ''
    })));
}

/**
 * getProducts() — Always returns the live product list from localStorage.
 * Admin edits are stored in localStorage under 'lumea_admin_products'.
 */
function getProducts() {
    const saved = localStorage.getItem(ADMIN_PRODUCTS_KEY);
    return saved ? JSON.parse(saved) : []; // Returns empty array if not yet loaded from JSON
}

/**
 * fetchInitialProducts() — Fetches products.json and saves to localStorage if empty.
 */
async function fetchInitialProducts() {
    try {
        const saved = localStorage.getItem(ADMIN_PRODUCTS_KEY);
        // If we already have data in localStorage, we don't need to fetch the static JSON
        if (saved && JSON.parse(saved).length > 0) return JSON.parse(saved);

        const response = await fetch('products.json?v=2');
        if (!response.ok) throw new Error('Failed to load products.json');
        
        const products = await response.json();
        localStorage.setItem(ADMIN_PRODUCTS_KEY, JSON.stringify(products));
        
        // Notify the app that products are now available
        window.dispatchEvent(new CustomEvent('lumea:products-updated', {
            detail: { source: 'initial_load', products }
        }));
        
        return products;
    } catch (err) {
        console.error('Error loading initial products:', err);
        return [];
    }
}


async function refreshProductsFromDatabase() {
    if (!window.lumeaDB || !window.lumeaDB.isReady()) return getProducts();

    const products = await window.lumeaDB.fetchProducts();
    if (Array.isArray(products) && products.length > 0) {
        const before = getProductsSnapshot(getProducts());
        const after = getProductsSnapshot(products);
        cacheProducts(products);

        if (before !== after) {
            window.dispatchEvent(new CustomEvent('lumea:products-updated', {
                detail: { source: 'database', products }
            }));
        }

        return products;
    }
    return getProducts();
}

function startProductsAutoSync(intervalMs = 2500) {
    if (!window.lumeaDB || !window.lumeaDB.isReady()) return;
    if (window.lumeaProductsSyncTimer) return;

    window.lumeaProductsSyncTimer = window.setInterval(async () => {
        try {
            await refreshProductsFromDatabase();
        } catch (err) {
            // Keep UI alive on transient network issues.
            console.warn('Background product sync failed:', err.message);
        }
    }, intervalMs);
}

// Expose a shared readiness promise so pages can await initial DB-backed product sync.
window.lumeaRefreshProductsFromDatabase = refreshProductsFromDatabase;
window.lumeaProductsReady = (async () => {
    // 1. First ensure we have local data from the JSON file if it's a fresh load
    await fetchInitialProducts();
    
    // 2. Then try to sync with a real database if configured
    if (window.lumeaDB && window.lumeaDB.isReady()) {
        try {
            return await refreshProductsFromDatabase();
        } catch (err) {
            console.warn('Product DB refresh failed:', err.message);
        }
    }
    return getProducts();
})();
window.lumeaStartProductsAutoSync = startProductsAutoSync;

window.lumeaProductsReady.then(() => {
    // Start near-real-time polling after initial sync.
    startProductsAutoSync();
});

/**
 * getProductImage(product) — Returns the best available image URL for a product.
 * Checks imageUrl first, then images array, returns empty string if nothing valid.
 */
function getProductImage(product) {
    if (!product) return '';
    if (product.imageUrl && product.imageUrl.trim()) return product.imageUrl.trim();
    if (product.images && product.images.length > 0 && !product.images[0].includes('placeholder')) {
        return product.images[0];
    }
    return '';
}

/**
 * getProductImageHtml(product, cssClass) — Returns an <img> tag or a placeholder div.
 */
function getProductImageHtml(product, cssClass = '') {
    const url = getProductImage(product);
    if (url) {
        return `<img src="${url}" alt="${product.name}" class="${cssClass}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.parentElement.innerHTML='<div class=\\'product-placeholder\\'></div>'">`;
    }
    return `<div class="product-placeholder"></div>`;
}


// --- AUTO-SEED MOCK DATA ---

// --- AUTO-SEED MOCK DATA FORCE PATTERN ---
if (typeof localStorage !== 'undefined') {
    if (!localStorage.getItem('seed_force_v5')) {
        localStorage.removeItem('lumea_users');
        localStorage.removeItem('lumea_orders');
        localStorage.setItem('seed_force_v5', 'true');
    }

    let users = JSON.parse(localStorage.getItem('lumea_users') || '[]');
(localStorage.getItem('lumea_users') || '[]');
    let orders = JSON.parse(localStorage.getItem('lumea_orders') || '[]');

    let needsUsers = users.filter(u => u.accountType !== 'admin').length === 0;
    if (needsUsers) {
        const fakeUsers = [
            { id: 'usr_1', email: 'jdelacruz@gmail.com', firstName: 'Juan', lastName: 'Dela Cruz', phone: '0917-123-4567', street: '123 Rizal Ave', city: 'Manila', postalCode: '1000', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_2', email: 'mreyes@yahoo.com', firstName: 'Maria', lastName: 'Reyes', phone: '0918-987-6543', street: '456 Ayala Ave', city: 'Makati', postalCode: '1226', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_3', email: 'jose.santos@outlook.com', firstName: 'Jose', lastName: 'Santos', phone: '0919-111-2222', street: '789 EDSA', city: 'Quezon City', postalCode: '1100', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_4', email: 'cgarcia@hotmail.com', firstName: 'Carmen', lastName: 'Garcia', phone: '0920-333-4444', street: '101 Mango Blvd', city: 'Cebu City', postalCode: '6000', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_5', email: 'p.mendoza@gmail.com', firstName: 'Pedro', lastName: 'Mendoza', phone: '0921-555-6666', street: '202 Session Rd', city: 'Baguio City', postalCode: '2600', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_6', email: 'ana.villanueva@yahoo.com', firstName: 'Ana', lastName: 'Villanueva', phone: '0922-777-8888', street: '303 Diversion Rd', city: 'Iloilo City', postalCode: '5000', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_7', email: 'ramon.cruz@outlook.com', firstName: 'Ramon', lastName: 'Cruz', phone: '0923-999-0000', street: '404 CM Recto', city: 'Davao City', postalCode: '8000', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_8', email: 'luisa.flores@gmail.com', firstName: 'Luisa', lastName: 'Flores', phone: '0924-121-2323', street: '505 MacArthur Hwy', city: 'Angeles City', postalCode: '2009', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_9', email: 'ferdie.ramos@hooyah.com', firstName: 'Ferdinand', lastName: 'Ramos', phone: '0925-343-4545', street: '606 J.P. Laurel', city: 'Lipa City', postalCode: '4217', accountType: 'customer', createdAt: new Date().toISOString() },
            { id: 'usr_10', email: 'teresa.magbanua@gmail.com', firstName: 'Teresa', lastName: 'Magbanua', phone: '0926-565-6767', street: '707 Magsaysay Ave', city: 'Naga City', postalCode: '4400', accountType: 'customer', createdAt: new Date().toISOString() }
        ];
        
        
        const adminUser = { id: 'usr_admin', email: 'admin@lumea.com', password: 'admin', firstName: 'Admin', lastName: 'User', accountType: 'admin', createdAt: new Date().toISOString() };
        users = [adminUser].concat(fakeUsers);

        localStorage.setItem('lumea_users', JSON.stringify(users));
    }

    if (orders.length === 0) {
        const productsRaw = localStorage.getItem('lumea_admin_products_v2');
        let availProd = [];
        if (productsRaw) {
            availProd = JSON.parse(productsRaw);
        }
        
        let p1Name = availProd.length > 0 ? availProd[0].name : "Precision Eyeliner";
        let p1Price = availProd.length > 0 ? Number(availProd[0].price) : 160.0;
        
        let p2Name = availProd.length > 1 ? availProd[1].name : "Volumizing Mascara";
        let p2Price = availProd.length > 1 ? Number(availProd[1].price) : 200.0;
        
        let p3Name = availProd.length > 2 ? availProd[2].name : "Lash Lift Mascara";
        let p3Price = availProd.length > 2 ? Number(availProd[2].price) : 250.0;
        
        let p4Name = availProd.length > 3 ? availProd[3].name : "Liquid Liner Pen";
        let p4Price = availProd.length > 3 ? Number(availProd[3].price) : 180.0;
        
        let p5Name = availProd.length > 4 ? availProd[4].name : "Eyeshadow Primer";
        let p5Price = availProd.length > 4 ? Number(availProd[4].price) : 140.0;
        
        const fakeOrders = [
            {
                id: 'ORD-10041',
                customerName: 'Maria Reyes',
                customerEmail: 'mreyes@yahoo.com',
                date: new Date(Date.now() - 86400000 * 2).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                status: 'Shipped',
                items: [ { productId: 1, name: p1Name, qty: 3, price: p1Price } ],
                total: p1Price * 3
            },
            {
                id: 'ORD-10042',
                customerName: 'Juan Dela Cruz',
                customerEmail: 'jdelacruz@gmail.com',
                date: new Date(Date.now() - 86400000 * 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                status: 'Processing',
                items: [ { productId: 2, name: p2Name, qty: 2, price: p2Price }, { productId: 3, name: p3Name, qty: 1, price: p3Price } ],
                total: (p2Price * 2) + p3Price
            },
            {
                id: 'ORD-10043',
                customerName: 'Ana Villanueva',
                customerEmail: 'ana.villanueva@yahoo.com',
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                status: 'Processing',
                items: [ { productId: 1, name: p1Name, qty: 1, price: p1Price }, { productId: 4, name: p4Name, qty: 2, price: p4Price } ],
                total: p1Price + (p4Price * 2)
            },
            {
                id: 'ORD-10044',
                customerName: 'Carmen Garcia',
                customerEmail: 'cgarcia@hotmail.com',
                date: new Date(Date.now() - 86400000 * 3).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                status: 'Delivered',
                items: [ { productId: 3, name: p3Name, qty: 4, price: p3Price } ],
                total: p3Price * 4
            },
            {
                id: 'ORD-10045',
                customerName: 'Pedro Mendoza',
                customerEmail: 'p.mendoza@gmail.com',
                date: new Date(Date.now() - 86400000 * 5).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                status: 'Delivered',
                items: [ { productId: 5, name: p5Name, qty: 1, price: p5Price }, { productId: 1, name: p1Name, qty: 2, price: p1Price } ],
                total: p5Price + (p1Price * 2)
            }
        ];
        orders = orders.concat(fakeOrders);
        localStorage.setItem('lumea_orders', JSON.stringify(orders));
    }
}
