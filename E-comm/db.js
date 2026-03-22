/**
 * db.js — Lightweight Supabase REST adapter with graceful fallback.
 *
 * Configure credentials before deployment:
 * window.LUMEA_DB_CONFIG = { url: 'https://YOUR_PROJECT.supabase.co', anonKey: 'YOUR_ANON_KEY' };
 */
(function () {
    function clean(value) {
        return (value || '').toString().trim();
    }

    function isPlaceholder(value) {
        const v = clean(value).toUpperCase();
        return !v || v.includes('YOUR_') || v.includes('PLACEHOLDER');
    }

    const fileConfig = window.LUMEA_DB_CONFIG || {};
    const storageConfig = {
        url: localStorage.getItem('lumea_db_url') || '',
        anonKey: localStorage.getItem('lumea_db_anon_key') || ''
    };

    // Prefer explicit config file values only when they are real values.
    const mergedConfig = {
        url: !isPlaceholder(fileConfig.url) ? clean(fileConfig.url) : clean(storageConfig.url),
        anonKey: !isPlaceholder(fileConfig.anonKey) ? clean(fileConfig.anonKey) : clean(storageConfig.anonKey)
    };

    const baseUrl = (mergedConfig.url || '').replace(/\/$/, '');
    const anonKey = mergedConfig.anonKey || '';

    function isValidSupabaseUrl(url) {
        return /^https:\/\/.+\.supabase\.co$/i.test(clean(url).replace(/\/$/, ''));
    }

    function isReady() {
        return Boolean(isValidSupabaseUrl(baseUrl) && anonKey && anonKey.length > 20);
    }

    function getConfigStatus() {
        return {
            isReady: isReady(),
            usingConfigFile: !isPlaceholder(fileConfig.url) || !isPlaceholder(fileConfig.anonKey),
            hasUrl: Boolean(baseUrl),
            hasAnonKey: Boolean(anonKey),
            urlLooksValid: isValidSupabaseUrl(baseUrl)
        };
    }

    function buildHeaders(extra = {}) {
        return {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            ...extra
        };
    }

    async function request(table, { method = 'GET', query = '', body, prefer } = {}) {
        const url = `${baseUrl}/rest/v1/${table}${query}`;
        const headers = buildHeaders(prefer ? { Prefer: prefer } : {});

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Database request failed (${response.status})`);
        }

        if (response.status === 204) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    function mapProductRowToUi(row) {
        return {
            id: row.id,
            name: row.name,
            category: row.category,
            price: Number(row.price || 0),
            rating: Number(row.rating || 0),
            ratingCount: Number(row.rating_count || 0),
            featured: Boolean(row.featured),
            imageUrl: row.image_url || '',
            images: Array.isArray(row.images) ? row.images : [],
            description: row.description || '',
            details: Array.isArray(row.details) ? row.details : [],
            options: Array.isArray(row.options) ? row.options : [],
            reviews: Array.isArray(row.reviews) ? row.reviews : [],
            stock: Number(row.stock || 0),
            status: row.status || 'In Stock'
        };
    }

    function mapProductUiToRow(product) {
        return {
            id: product.id,
            name: product.name,
            category: product.category,
            price: Number(product.price || 0),
            rating: Number(product.rating || 0),
            rating_count: Number(product.ratingCount || 0),
            featured: Boolean(product.featured),
            image_url: product.imageUrl || '',
            images: Array.isArray(product.images) ? product.images : [],
            description: product.description || '',
            details: Array.isArray(product.details) ? product.details : [],
            options: Array.isArray(product.options) ? product.options : [],
            reviews: Array.isArray(product.reviews) ? product.reviews : [],
            stock: Number(product.stock || 0),
            status: product.status || 'In Stock'
        };
    }

    const api = {
        isReady,
        getConfigStatus,

        async findUserByEmail(email) {
            const safe = encodeURIComponent(email.toLowerCase().trim());
            const rows = await request('lumea_users', {
                query: `?select=*&email=eq.${safe}&limit=1`
            });
            return Array.isArray(rows) && rows.length ? rows[0] : null;
        },

        async createUser(userPayload) {
            const rows = await request('lumea_users', {
                method: 'POST',
                query: '?select=*',
                prefer: 'return=representation',
                body: userPayload
            });
            return Array.isArray(rows) ? rows[0] : null;
        },

        async fetchCartByEmail(email) {
            const safe = encodeURIComponent(email.toLowerCase().trim());
            const rows = await request('lumea_cart_items', {
                query: `?select=product_id,qty&user_email=eq.${safe}`
            });
            return (rows || []).map(row => ({
                productId: String(row.product_id),
                qty: Number(row.qty || 1)
            }));
        },

        async upsertCartItem(email, productId, qty) {
            return request('lumea_cart_items', {
                method: 'POST',
                query: '?on_conflict=user_email,product_id',
                prefer: 'resolution=merge-duplicates,return=representation',
                body: {
                    user_email: email.toLowerCase().trim(),
                    product_id: String(productId),
                    qty: Number(qty)
                }
            });
        },

        async deleteCartItem(email, productId) {
            const safeEmail = encodeURIComponent(email.toLowerCase().trim());
            const safeProduct = encodeURIComponent(String(productId));
            return request('lumea_cart_items', {
                method: 'DELETE',
                query: `?user_email=eq.${safeEmail}&product_id=eq.${safeProduct}`
            });
        },

        async clearCartByEmail(email) {
            const safeEmail = encodeURIComponent(email.toLowerCase().trim());
            return request('lumea_cart_items', {
                method: 'DELETE',
                query: `?user_email=eq.${safeEmail}`
            });
        },

        async fetchProducts() {
            const rows = await request('lumea_products', {
                query: '?select=*&order=id.asc'
            });
            return (rows || []).map(mapProductRowToUi);
        },

        async upsertProduct(product) {
            return request('lumea_products', {
                method: 'POST',
                query: '?on_conflict=id',
                prefer: 'resolution=merge-duplicates,return=representation',
                body: mapProductUiToRow(product)
            });
        },

        async deleteProduct(id) {
            const safeId = encodeURIComponent(String(id));
            return request('lumea_products', {
                method: 'DELETE',
                query: `?id=eq.${safeId}`
            });
        },

        async fetchUsers() {
            const rows = await request('lumea_users', {
                query: '?select=id,email,first_name,last_name,phone,street,city,postal_code,account_type,created_at&order=created_at.desc'
            });
            return (rows || []).map(row => ({
                id: row.id,
                email: row.email,
                firstName: row.first_name || '',
                lastName: row.last_name || '',
                phone: row.phone || '',
                street: row.street || '',
                city: row.city || '',
                postalCode: row.postal_code || '',
                accountType: row.account_type || 'customer',
                createdAt: row.created_at || ''
            }));
        },

        async updateUser(id, data) {
            const safeId = encodeURIComponent(String(id));
            const payload = {};
            if (data.firstName !== undefined) payload.first_name = data.firstName;
            if (data.lastName !== undefined) payload.last_name = data.lastName;
            if (data.phone !== undefined) payload.phone = data.phone;
            if (data.street !== undefined) payload.street = data.street;
            if (data.city !== undefined) payload.city = data.city;
            if (data.postalCode !== undefined) payload.postal_code = data.postalCode;
            if (data.accountType !== undefined) payload.account_type = data.accountType;

            return request('lumea_users', {
                method: 'PATCH',
                query: `?id=eq.${safeId}`,
                body: payload
            });
        },

        async deleteUser(id) {
            const safeId = encodeURIComponent(String(id));
            return request('lumea_users', {
                method: 'DELETE',
                query: `?id=eq.${safeId}`
            });
        }
    };

    window.lumeaDB = api;

    // Allow runtime reconfiguration (used by admin-setup.html after saving credentials)
    window.lumeaDBReload = function () {
        const newUrl = (localStorage.getItem('lumea_db_url') || '').trim().replace(/\/$/, '');
        const newKey = (localStorage.getItem('lumea_db_anon_key') || '').trim();
        if (newUrl) {
            Object.defineProperty(api, '_url', { value: newUrl, writable: true, configurable: true });
        }
        // Easiest reload: hard reload the page so db.js re-initialises with new storage values
        window.location.reload();
    };
})();

