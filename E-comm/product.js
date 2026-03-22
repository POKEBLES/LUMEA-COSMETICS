/**
 * Product Details Dynamic JavaScript
 */

let activeProduct = null;
let currentImageIndex = 0;
let currentReviewPage = 0;
const REVIEWS_PER_PAGE = 3;
let activeProductId = 1;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id')) || 1; // Default to 1 if none provided
    activeProductId = productId;

    // 2. Find Product in Data
    if (window.lumeaProductsReady) {
        await window.lumeaProductsReady;
    }

    const availableProducts = getProducts();
    activeProduct = availableProducts.find(p => p.id === productId);

    // Fallback if ID is invalid
    if (!activeProduct) {
        activeProduct = availableProducts[0];
    }

    // 3. Initialize UI
    populateProductDetails();
    initCarousel();
    initSwatches();
    initReviews();
    populateRelatedProducts();
    initWishlistButton();

    window.addEventListener('lumea:products-updated', () => {
        const latest = getProducts().find(p => p.id === activeProductId);
        if (!latest) return;
        activeProduct = latest;
        populateProductDetails();
        initCarousel();
        initSwatches();
        initReviews();
        populateRelatedProducts();
        initWishlistButton();
    });

    if (typeof window.lumeaStartProductsAutoSync === 'function') {
        window.lumeaStartProductsAutoSync();
    }
});

function initWishlistButton() {
    if (!activeProduct || typeof isInWishlist !== 'function') return;
    const btn = document.querySelector('.wishlist-action-btn');
    if (!btn) return;
    const svg = btn.querySelector('svg');

    if (isInWishlist(activeProduct.id)) {
        btn.style.color = 'var(--color-accent)';
        btn.style.borderColor = 'var(--color-accent)';
        if (svg) svg.setAttribute('fill', 'currentColor');
    }
}

// --- UI POPULATION ---

function populateProductDetails() {
    document.title = `Lumea - ${activeProduct.name}`;

    document.getElementById('product-category').textContent = activeProduct.category;
    document.getElementById('product-title').textContent = activeProduct.name;
    document.getElementById('product-price').textContent = `₱${activeProduct.price.toFixed(2)}`;
    document.getElementById('product-short-desc').textContent = activeProduct.description;
    document.getElementById('banner-text').textContent = activeProduct.name;

    // Generate Stars
    const starHTML = generateStars(activeProduct.rating);
    document.getElementById('product-stars').innerHTML = starHTML;
    document.getElementById('product-rating-text').textContent = `${activeProduct.rating} (${activeProduct.ratingCount} reviews)`;

    // Reviews Overview Section
    document.getElementById('overview-rating-num').textContent = activeProduct.rating;
    document.getElementById('overview-rating-stars').innerHTML = starHTML;
    document.getElementById('overview-rating-count').textContent = `${activeProduct.ratingCount} Reviews`;

    // Bullet List
    const bulletContainer = document.getElementById('product-bullet-list');
    if (activeProduct.details && activeProduct.details.length > 0) {
        bulletContainer.innerHTML = activeProduct.details.map(detail => `<li>${detail}</li>`).join('');
    } else {
        bulletContainer.innerHTML = `<li>Premium Quality Formulation</li>`;
    }
}

// --- CAROUSEL LOGIC ---

function initCarousel() {
    const images = activeProduct.images || ["product-placeholder"];
    currentImageIndex = 0;

    const thumbContainer = document.getElementById('thumbnail-list');
    const indicatorContainer = document.getElementById('carousel-indicators');

    thumbContainer.innerHTML = '';
    indicatorContainer.innerHTML = '';

    images.forEach((img, index) => {
        // Thumbnail
        const thumb = document.createElement('div');
        thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;

        const imgUrl = getProductImage(activeProduct);
        if (imgUrl) {
            thumb.style.backgroundImage = `url(${imgUrl})`;
            thumb.style.backgroundSize = 'cover';
            thumb.style.backgroundPosition = 'center';
        } else {
            thumb.style.display = 'flex';
            thumb.style.alignItems = 'center';
            thumb.style.justifyContent = 'center';
            thumb.style.fontSize = '0.7rem';
            thumb.style.fontWeight = 'bold';
            thumb.textContent = `Img ${index + 1}`;
        }

        thumb.onclick = () => changeImage(index);
        thumbContainer.appendChild(thumb);

        // Indicator
        const dot = document.createElement('div');
        dot.className = `indicator ${index === 0 ? 'active' : ''}`;
        dot.onclick = () => changeImage(index);
        indicatorContainer.appendChild(dot);
    });

    updateMainImage();
}

function updateMainImage() {
    const mainContent = document.getElementById('main-image-content');
    const imgUrl = getProductImage(activeProduct);
    if (imgUrl) {
        mainContent.textContent = '';
        mainContent.style.backgroundImage = `url(${imgUrl})`;
        mainContent.style.backgroundSize = 'cover';
        mainContent.style.backgroundPosition = 'center';
    } else {
        mainContent.textContent = `Product Image ${currentImageIndex + 1}`;
    }

    // Update active states
    const thumbs = document.querySelectorAll('.thumbnail');
    const dots = document.querySelectorAll('.indicator');

    thumbs.forEach((t, i) => t.classList.toggle('active', i === currentImageIndex));
    dots.forEach((d, i) => d.classList.toggle('active', i === currentImageIndex));
}

function changeImage(index) {
    if (!activeProduct.images) return;
    currentImageIndex = index;
    updateMainImage();
}

function prevImage() {
    if (!activeProduct.images) return;
    currentImageIndex = (currentImageIndex - 1 + activeProduct.images.length) % activeProduct.images.length;
    updateMainImage();
}

function nextImage() {
    if (!activeProduct.images) return;
    currentImageIndex = (currentImageIndex + 1) % activeProduct.images.length;
    updateMainImage();
}

// --- SWATCH LOGIC ---

function initSwatches() {
    const options = activeProduct.options || ["Default"];
    const swatchContainer = document.getElementById('color-swatches');
    const labelSpan = document.getElementById('selected-color-name');

    swatchContainer.innerHTML = '';

    if (options.length > 0) {
        labelSpan.textContent = options[0];
    }

    // Mock color generator for wireframes
    const mockColors = ['#EAE0D3', '#D08C75', '#879E7B', '#CFA58A', '#9A8C98', '#4A4E69'];

    options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = `swatch ${index === 0 ? 'active' : ''}`;
        btn.style.backgroundColor = mockColors[index % mockColors.length];
        btn.setAttribute('aria-label', opt);

        btn.onclick = () => {
            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            labelSpan.textContent = opt;
        };

        swatchContainer.appendChild(btn);
    });
}

// --- QUANTITY LOGIC ---

function updateQty(changeAmount) {
    const input = document.getElementById('quantity');
    let currentValue = parseInt(input.value) || 1;
    let min = parseInt(input.min) || 1;
    let max = parseInt(input.max) || 10;

    let newValue = currentValue + changeAmount;

    if (newValue >= min && newValue <= max) {
        input.value = newValue;
    }
}

function addToCart() {
    const user = typeof getCurrentUser !== 'undefined' ? getCurrentUser() : null;
    if (!user) {
        if (typeof showLoginRequiredModal === 'function') showLoginRequiredModal();
        return;
    }

    const btn = document.querySelector('.add-to-cart-btn-large');
    const originalText = btn.textContent;
    const qty = parseInt(document.getElementById('quantity').value) || 1;

    // Route through store.js so local and DB cart states stay in sync.
    if (typeof window.lumeaStoreAddToCart === 'function') {
        window.lumeaStoreAddToCart(String(activeProduct.id), qty);
    } else {
        const CART_KEY = 'lumea_cart';
        const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        const existing = cart.find(i => String(i.productId) === String(activeProduct.id));
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ productId: String(activeProduct.id), qty });
        }
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    btn.textContent = `Added ${qty} to Cart ✓`;
    btn.style.backgroundColor = 'var(--color-primary)';

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
        document.getElementById('quantity').value = 1; // reset
    }, 2000);
}

function toggleProductWishlist() {
    const user = typeof getCurrentUser !== 'undefined' ? getCurrentUser() : null;
    if (!user) {
        if (typeof showLoginRequiredModal === 'function') showLoginRequiredModal();
        return;
    }
    if (!activeProduct || typeof toggleWishlist !== 'function') return;

    const added = toggleWishlist(activeProduct.id);
    const btn = document.querySelector('.wishlist-action-btn');
    if (!btn) return;

    const svg = btn.querySelector('svg');
    if (added) {
        btn.style.color = 'var(--color-accent)';
        btn.style.borderColor = 'var(--color-accent)';
        if (svg) svg.setAttribute('fill', 'currentColor');
    } else {
        btn.style.color = '';
        btn.style.borderColor = '';
        if (svg) svg.setAttribute('fill', 'none');
    }
}

// --- REVIEWS LOGIC ---

function initReviews() {
    renderReviewsPage();
}

function renderReviewsPage() {
    const reviews = activeProduct.reviews || [];
    const container = document.getElementById('reviews-container');
    const pageInfo = document.getElementById('review-page-info');

    if (reviews.length === 0) {
        container.innerHTML = '<p style="color: var(--color-text-light);">No reviews yet. Be the first to review!</p>';
        pageInfo.textContent = '0 of 0';
        return;
    }

    const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);

    // Bounds check
    if (currentReviewPage < 0) currentReviewPage = 0;
    if (currentReviewPage >= totalPages) currentReviewPage = totalPages - 1;

    const start = currentReviewPage * REVIEWS_PER_PAGE;
    const end = start + REVIEWS_PER_PAGE;
    const visibleReviews = reviews.slice(start, end);

    container.innerHTML = visibleReviews.map(rev => `
        <div class="review-item">
            <div class="review-header">
                <div class="reviewer-avatar">${rev.author.charAt(0)}</div>
                <div class="reviewer-meta">
                    <strong>${rev.author}</strong>
                    <div class="stars">${generateStars(rev.rating)}</div>
                </div>
            </div>
            <div class="review-body">
                <p>${rev.text}</p>
            </div>
        </div>
    `).join('');

    pageInfo.textContent = `${currentReviewPage + 1} of ${totalPages}`;
}

function prevReviewPage() {
    if (currentReviewPage > 0) {
        currentReviewPage--;
        renderReviewsPage();
    }
}

function nextReviewPage() {
    const reviews = activeProduct.reviews || [];
    const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
    if (currentReviewPage < totalPages - 1) {
        currentReviewPage++;
        renderReviewsPage();
    }
}

// --- RELATED PRODUCTS ---

function populateRelatedProducts() {
    const container = document.getElementById('related-products-grid');

    const products = getProducts();
    // Find 3 products in the same category (or randomly if not enough)
    let related = products.filter(p => p.category === activeProduct.category && String(p.id) !== String(activeProduct.id));

    // If we don't have 3, fill with random ones
    if (related.length < 3) {
        const others = products.filter(p => p.category !== activeProduct.category);
        related = [...related, ...others].slice(0, 3);
    } else {
        related = related.slice(0, 3);
    }

    const isWL = (pid) => typeof isInWishlist === 'function' && isInWishlist(pid);

    container.innerHTML = related.map(product => `
        <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'" style="cursor: pointer;">
            <div class="product-image-area">
                ${getProductImageHtml(product)}
                <button class="wishlist-btn" aria-label="Add to wishlist" style="${isWL(product.id) ? 'color:var(--color-accent);' : ''}" onclick="handleCardWishlist(event, ${product.id})">
                    <svg viewBox="0 0 24 24" fill="${isWL(product.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
            </div>
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating">
                    <div class="stars">${generateStars(product.rating)}</div>
                    <span class="rating-num">(${product.rating})</span>
                </div>
                <div class="product-bottom">
                    <div class="product-price">₱${(typeof product.price === 'number' ? product.price : parseFloat(product.price.toString().replace('₱', ''))).toFixed(2)}</div>
                    <button class="cart-btn" aria-label="Add to cart" onclick="handleCardCart(event, ${product.id})">
                        <svg viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5" width="16" height="16"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- UTILITIES ---

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
            html += '<span class="star-empty" style="color:#DDD">★</span>';
        }
    }
    return html;
}
