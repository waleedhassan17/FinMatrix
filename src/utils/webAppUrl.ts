// ═══════════════════════════════════════════════════════
// FinMatrix — the web app's address
// Used where a task is better done on a computer (matching a migration's
// columns, say) and the phone links there. Expo inlines EXPO_PUBLIC_* at
// build time, so this stays a static read of process.env, in its own module
// so tests of the screens' logic need not load Expo's env shim.
// The default is a placeholder: set EXPO_PUBLIC_WEB_URL per deployment.
// ═══════════════════════════════════════════════════════
export const WEB_APP_URL = (process.env.EXPO_PUBLIC_WEB_URL?.trim() || 'https://app.finmatrix.pk').replace(/\/$/, '');
