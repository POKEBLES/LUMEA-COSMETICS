// Now utilizing global `storeProducts` data from data.js

// DOM Elements
const gridContainer = document.getElementById('product-grid-container');
const categoryRadios = document.querySelectorAll('input[name="category"]');
const sortSelect = document.getElementById('sort-select');
const productCountEl = document.getElementById('product-count-num');
const inStockCheckbox = document.getElementById('in-stock-checkbox');

// Price Slider Elements
const sliderTrack = document.getElementById('slider-track');
const sliderFill = document.getElementById('slider-fill');
const minThumb = document.getElementById('min-thumb');
const maxThumb = document.getElementById('max-thumb');
const minPriceLabel = document.getElementById('min-price-label');
const maxPriceLabel = document.getElementById('max-price-label');

// Current State
let currentCategory = 'all';
let currentSort = 'featured';
let inStockOnly = false;

// Slider State
let MAX_PRICE_VALUE = 100; // Will be updated dynamically
let minPrice = 0;
let maxPrice = 100; // Will be updated dynamically
let isDraggingMin = false;
let isDraggingMax = false;

// Initialize Page
document.addEventListener('DOMContentLoaded', async () => {
    // 0. Initialize price bounds dynamically based on products
    const products = getProducts();
    if (products.length > 0) {
        let maxFound = Math.max(...products.map(p => Number(p.price) || 0));
        MAX_PRICE_VALUE = Math.ceil(maxFound);
        // Add padding to the max value for better UI (nearest 10)
        if (MAX_PRICE_VALUE % 10 !== 0) {
            MAX_PRICE_VALUE = Math.ceil(MAX_PRICE_VALUE / 10) * 10;
        }
        maxPrice = MAX_PRICE_VALUE;
        updateSliderUI();
    }

    // 1. Check URL parameters for pre-selected category
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category');

    if (urlCategory && ['face', 'eyes', 'lips'].includes(urlCategory)) {
        currentCategory = urlCategory;
        // Update radio button UI
        document.querySelector(`input[name="category"][value="${urlCategory}"]`).checked = true;
    }

    // 2. Setup Event Listeners
    categoryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentCategory = e.target.value;

            // Update URL without reloading page
            const newUrl = currentCategory === 'all'
                ? window.location.pathname
                : `${window.location.pathname}?category=${currentCategory}`;
            window.history.pushState({ path: newUrl }, '', newUrl);

            renderProducts();
        });
    });

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
    });

    inStockCheckbox.addEventListener('change', (e) => {
        inStockOnly = e.target.checked;
        renderProducts();
    });

    // 3. Setup Price Slider Logic
    initSlider();

    // 4. Wait for initial DB sync (if configured), then render.
    if (window.lumeaProductsReady) {
        await window.lumeaProductsReady;
    }

    // 5. Initial Render
    renderProducts();

    window.addEventListener('lumea:products-updated', () => {
        renderProducts();
    });

    if (typeof window.lumeaStartProductsAutoSync === 'function') {
        window.lumeaStartProductsAutoSync();
    }
});

// Price Slider Logic
function initSlider() {
    updateSliderUI();

    // Mouse events
    minThumb.addEventListener('mousedown', () => isDraggingMin = true);
    maxThumb.addEventListener('mousedown', () => isDraggingMax = true);

    // Touch events for mobile
    minThumb.addEventListener('touchstart', () => isDraggingMin = true, { passive: true });
    maxThumb.addEventListener('touchstart', () => isDraggingMax = true, { passive: true });

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('touchmove', handleDrag, { passive: true });

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
}

function handleDrag(e) {
    if (!isDraggingMin && !isDraggingMax) return;

    let clientX;
    if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }

    const trackRect = sliderTrack.getBoundingClientRect();
    let percentage = (clientX - trackRect.left) / trackRect.width;

    // Clamp between 0 and 1
    percentage = Math.max(0, Math.min(1, percentage));

    const value = Math.round(percentage * MAX_PRICE_VALUE);

    if (isDraggingMin) {
        // Prevent min traversing past max
        if (value < maxPrice) {
            minPrice = value;
            updateSliderUI();
            renderProducts();
        }
    } else if (isDraggingMax) {
        // Prevent max traversing past min
        if (value > minPrice) {
            maxPrice = value;
            updateSliderUI();
            renderProducts();
        }
    }
}

function stopDrag() {
    isDraggingMin = false;
    isDraggingMax = false;
}

function updateSliderUI() {
    const minPercent = (minPrice / MAX_PRICE_VALUE) * 100;
    const maxPercent = (maxPrice / MAX_PRICE_VALUE) * 100;

    minThumb.style.left = `${minPercent}%`;
    maxThumb.style.left = `${maxPercent}%`;
    maxThumb.style.right = 'auto'; // override CSS mock styling
    maxThumb.style.transform = 'translate(-50%, -50%)'; // Override right-anchored transform from CSS

    sliderFill.style.left = `${minPercent}%`;
    sliderFill.style.width = `${maxPercent - minPercent}%`;

    minPriceLabel.textContent = `₱${minPrice}`;
    maxPriceLabel.textContent = `₱${maxPrice}`;
}

// Generate Stars HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    let html = '';

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            html += '★';
        } else if (i === fullStars && hasHalf) {
            html += '★';
        } else {
            html += '<span class="star-empty">★</span>';
        }
    }
    return html;
}

function renderProducts() {
    // 1. Filter
    let filteredProducts = getProducts().filter(p => {
        // Category Filter
        if (currentCategory !== 'all' && p.category !== currentCategory) return false;

        // Price Filter
        if (p.price < minPrice || p.price > maxPrice) return false;

        // Availability Filter — use status field set by admin, default to In Stock
        if (inStockOnly && p.status === 'Out of Stock') return false;

        return true;
    });



    // 2. Sort
    filteredProducts.sort((a, b) => {
        switch (currentSort) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'rating':
                return b.rating - a.rating; // Descending rating
            case 'featured':
            default:
                // Sort featured first, then by rating
                if (a.featured === b.featured) {
                    return b.rating - a.rating;
                }
                return a.featured ? -1 : 1;
        }
    });

    // 3. Update UI
    productCountEl.textContent = filteredProducts.length;

    if (filteredProducts.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-light);">
                <p>No products found in this category.</p>
                <button class="btn btn-outline" style="margin-top: 16px;" onclick="document.querySelector('input[value=\\'all\\']').click()">Clear Filters</button>
            </div>
        `;
        return;
    }

    const isWL = (pid) => typeof isInWishlist === 'function' && isInWishlist(pid);

    // Build HTML string
    gridContainer.innerHTML = filteredProducts.map(product => {
        // Use centralized image helper
        const imageHtml = getProductImageHtml(product);

        return `
        <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'" style="cursor: pointer;">
            <div class="product-image-area">
                ${imageHtml}
                <button class="wishlist-btn" aria-label="Add to wishlist" style="${isWL(product.id) ? 'color:var(--color-accent);' : ''}" onclick="handleCardWishlist(event, ${product.id})">
                    <svg viewBox="0 0 24 24" fill="${isWL(product.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating">
                    <div class="stars">${generateStars(product.rating || 0)}</div>
                    <span class="rating-num">(${product.rating || 0})</span>
                </div>
                <div class="product-bottom">
                    <div class="product-price">₱${(typeof product.price === 'number' ? product.price : parseFloat(product.price.toString().replace('₱', ''))).toFixed(2)}</div>
                    <button class="cart-btn" aria-label="Add to cart" onclick="handleCardCart(event, ${product.id})">
                        <svg viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5" width="16" height="16"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

