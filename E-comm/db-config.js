/**
 * db-config.js — Optional Supabase database configuration.
 *
 * The app works fully without Supabase, using localStorage as the data store.
 * If you want changes to sync across devices (or to a real database), fill in
 * your Supabase project URL and anon key below, then hard-refresh all pages
 * (Cmd+Shift+R / Ctrl+Shift+R).
 *
 * How to find these values:
 *   1. Go to https://supabase.com and open your project.
 *   2. Settings → API → Project URL  →  paste as `url`
 *   3. Settings → API → anon / public key  →  paste as `anonKey`
 *   4. Run database-schema.sql in the Supabase SQL editor first.
 *
 * Leave the values empty ('') to keep running in local-only mode (default).
 */
window.LUMEA_DB_CONFIG = {
    url: '',
    anonKey: ''
}
    ;

