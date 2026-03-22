/**
 * Global Predictive Search Functionality
 * Relies on `storeProducts` from `data.js` being loaded before this file.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize logic on any search inputs found.
    const searchInputs = document.querySelectorAll('.search-input');

    // Safety check for data
    const initSearch = () => {
        searchInputs.forEach(input => {
            const wrapper = input.closest('.search-container');
            if (!wrapper) return;

            const dropdown = wrapper.querySelector('.search-suggestions-dropdown');
            if (!dropdown) return;

            input.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (query.length === 0) {
                    dropdown.classList.remove('active');
                    return;
                }

                const products = getProducts();
                const matches = products.filter(p => {
                    return p.name.toLowerCase().includes(query) ||
                        p.category.toLowerCase().includes(query);
                });

                const topMatches = matches.slice(0, 5);
                renderSuggestions(topMatches, dropdown, query);
            });

            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });

            input.addEventListener('focus', () => {
                if (input.value.trim().length > 0 && dropdown.innerHTML.trim().length > 0) {
                    dropdown.classList.add('active');
                }
            });
        });
    };

    if (window.lumeaProductsReady) {
        window.lumeaProductsReady.then(initSearch);
    } else {
        initSearch();
    }
});

function renderSuggestions(matches, dropdownElement, query) {
    if (matches.length === 0) {
        dropdownElement.innerHTML = `
            <div class="search-no-results">
                No products found for "${query}"
            </div>
        `;
        dropdownElement.classList.add('active');
        return;
    }

    dropdownElement.innerHTML = matches.map(product => {
        const thumbUrl = typeof getProductImage === 'function' ? getProductImage(product) : '';
        return `
        <a href="product.html?id=${product.id}" class="search-suggestion-item">
            <div class="search-suggestion-thumb">${thumbUrl ? `<img src="${thumbUrl}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">` : 'img'}</div>
            <div class="search-suggestion-info">
                <span class="search-suggestion-name">${highlightMatch(product.name, query)}</span>
                <span class="search-suggestion-cat">${product.category}</span>
            </div>
        </a>
    `}).join('');

    dropdownElement.classList.add('active');
}

// Utility to bold the search query text inside the results
function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong style="color: var(--color-primary);">₱1</strong>');
}
