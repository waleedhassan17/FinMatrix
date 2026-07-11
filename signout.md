Add a fully functional, production-ready SIGN OUT button to the Settings screen of all THREE user types in
FinMatrix — Admin, Company Administrator, and Delivery Personnel. Work across FinMatrix (React Native +
Expo, Redux Toolkit) and FinMatrix-Backend (NestJS + TypeORM + PostgreSQL). If proper sign-out/token-
invalidation logic doesn't exist on the backend, implement it first, then wire the button in the frontend.
`npx tsc --noEmit` clean both repos; don't break existing auth or the accounting engine.

PHASE 0 — AUDIT (produce SIGNOUT_AUDIT.md, then STOP):
Report the current auth setup: how login issues tokens (JWT? access + refresh? where stored on device —
SecureStore/AsyncStorage/Redux?), whether ANY logout endpoint or token-invalidation exists today, and
where the three Settings screens live (Admin, Company Administrator, Delivery Personnel). State what's
missing. Output, then proceed.

PHASE A — BACKEND (implement if missing):
1. Add a POST /auth/logout endpoint (authenticated). On call it invalidates the current session/token so it
   can no longer be used:
   - If refresh tokens exist: revoke/delete the user's refresh token(s) server-side.
   - If using stateless access tokens: add a token blocklist/denylist (e.g. store the token id/jti with its
     expiry) that the auth guard checks, so a signed-out token is rejected until it expires. Keep it simple
     and clean up expired entries.
2. The endpoint works for ALL roles (admin, company administrator, delivery personnel) — same logic, tenant/
   role derived from the JWT.
3. Return success even if the token is already invalid (idempotent); never leak details.

PHASE B — FRONTEND (all three Settings screens):
1. Add a clearly labelled "Sign Out" button (or "Log Out") to the Settings screen of each of the three
   views: Admin, Company Administrator, Delivery Personnel. Consistent placement/styling with the existing
   design.
2. On tap: show a confirmation ("Are you sure you want to sign out?") → on confirm:
   - Call POST /auth/logout.
   - Clear ALL local auth state: the stored token(s) (SecureStore/AsyncStorage), the Redux auth slice, any
     cached user/company data, and any in-memory session.
   - Reset navigation to the login/auth screen so back-navigation can't return into the app.
3. Handle edge cases gracefully: if the logout API call fails (e.g. no network), STILL clear local state and
   send the user to login (a user must always be able to sign out locally); show a brief message if useful.
   Disable the button/show a spinner while signing out to prevent double-taps.
4. After sign-out, protected screens are unreachable without logging in again; a new login issues a fresh
   token.

ACCEPTANCE:
- Each of the three Settings screens has a working Sign Out button with a confirmation.
- Signing out calls the backend, clears all local tokens/Redux/cached state, and returns to login; back
  button can't re-enter the app.
- The invalidated token is rejected by the backend afterward (test: use the old token → 401).
- Logout works even offline (local state cleared, routed to login) and is idempotent.
- Works identically for admin, company administrator, and delivery personnel.
- `npx tsc --noEmit` clean both repos; backend builds; existing auth tests still pass; add tests for the
  logout endpoint (token rejected after logout) and that all three roles can log out.

DELIVERABLES: SIGNOUT_AUDIT.md; the logout endpoint + token-invalidation; the button in all three Settings
screens; tests; a note of files changed; and confirmation that sign-out fully clears session state, the old
token is rejected, and it works across all three user types and offline.