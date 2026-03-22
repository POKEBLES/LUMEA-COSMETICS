/**
 * auth.js — Lumea Authentication Logic
 * Uses database-first auth when configured,
 * with localStorage as fallback.
 * and sessionStorage for the current login session.
 */

const USERS_KEY = 'lumea_users';
const SESSION_KEY = 'lumea_session';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveOrUpdateLocalUser(userData) {
    const users = getUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (index >= 0) {
        users[index] = { ...users[index], ...userData };
    } else {
        users.push(userData);
    }
    saveUsers(users);
}

// Very simple hash (XOR fold) — not cryptographic, fine for prototyping
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(16);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * Returns { success: true } or { success: false, error: '...' }
 */
async function registerUser(data) {
    // Password match check
    if (data.password !== data.retypePassword) {
        return { success: false, error: 'Passwords do not match.' };
    }

    const users = getUsers();

    // Duplicate email check
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
        return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser = {
        id: Date.now().toString(), // Ensure local users have a unique ID
        email: data.email.toLowerCase().trim(),
        passwordHash: simpleHash(data.password),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        address: {
            street: data.street.trim(),
            city: data.city.trim(),
            postalCode: data.postalCode.trim()
        },
        accountType: data.accountType, // 'customer' or 'admin'
        createdAt: new Date().toISOString()
    };

    if (window.lumeaDB && window.lumeaDB.isReady()) {
        try {
            const existing = await window.lumeaDB.findUserByEmail(newUser.email);
            if (existing) {
                return { success: false, error: 'An account with this email already exists.' };
            }

            await window.lumeaDB.createUser({
                email: newUser.email,
                password_hash: newUser.passwordHash,
                first_name: newUser.firstName,
                last_name: newUser.lastName,
                phone: newUser.phone,
                street: newUser.address.street,
                city: newUser.address.city,
                postal_code: newUser.address.postalCode,
                account_type: newUser.accountType
            });
        } catch (error) {
            return { success: false, error: `Database error: ${error.message}` };
        }
    }

    saveOrUpdateLocalUser(newUser);
    return { success: true };
}

/**
 * Log in an existing user.
 * Returns { success: true, user } or { success: false, error: '...' }
 */
async function loginUser(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (window.lumeaDB && window.lumeaDB.isReady()) {
        try {
            const dbUser = await window.lumeaDB.findUserByEmail(normalizedEmail);
            if (dbUser) {
                user = {
                    email: dbUser.email,
                    passwordHash: dbUser.password_hash,
                    firstName: dbUser.first_name,
                    lastName: dbUser.last_name,
                    phone: dbUser.phone || '',
                    address: {
                        street: dbUser.street || '',
                        city: dbUser.city || '',
                        postalCode: dbUser.postal_code || ''
                    },
                    accountType: dbUser.account_type || 'customer'
                };
                saveOrUpdateLocalUser(user);
            }
        } catch (error) {
            return { success: false, error: `Database error: ${error.message}` };
        }
    }

    if (!user) {
        const users = getUsers();
        user = users.find(u => u.email === normalizedEmail);
    }

    if (!user) {
        return { success: false, error: 'No account found with that email.' };
    }

    if (user.passwordHash !== simpleHash(password)) {
        return { success: false, error: 'Incorrect password.' };
    }

    // Write session (never store the password hash in session)
    const session = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { success: true, user: session };
}

/**
 * Log out the current user.
 */
function logoutUser() {
    sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Get the currently logged-in user, or null if not logged in.
 */
function getCurrentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
}
