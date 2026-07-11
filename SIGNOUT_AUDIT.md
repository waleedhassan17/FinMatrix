# SIGNOUT_AUDIT — current auth setup and gaps (Phase 0)

Audited 2026-07-11 across `FinMatrix` (React Native + Expo + Redux Toolkit) and
`FinMatrix-Backend` (NestJS + TypeORM + PostgreSQL).

## How login issues tokens

- `POST /auth/signin` → `AuthService.issueTokens()` (`src/modules/auth/auth.service.ts:538`)
  returns an **access + refresh JWT pair**, both signed with `jwt.secret`:
  - **Access token**: stateless JWT, `15m` default (`JWT_ACCESS_EXPIRES_IN`), payload
    `{ sub, companyId, role }` — **no `jti`**, so it cannot be individually revoked today.
  - **Refresh token**: `30d` default, carries a `jti` (uniqueness), and its **SHA-256 hash is
    stored server-side** in `refresh_tokens` (entity `RefreshToken`: `userId`, `tokenHash`,
    `expiresAt`, `revokedAt`). `POST /auth/refresh-token` rejects revoked/expired rows and
    rotates (revokes the used token, issues a new pair).
- **Device storage (frontend)**: plain **AsyncStorage** (not SecureStore) via
  `src/utils/storageUtils.ts` — keys `@finmatrix/accessToken`, `@finmatrix/refreshToken`,
  `@finmatrix/companyId`. The axios client (`src/networks/network/apiHelpers.ts`) attaches the
  access token per request and auto-refreshes on 401.
- **Redux**: `authSlice` (persisted) holds `user` + `isAuthenticated`; `companySlice` and
  `inventoryApproval` are also persisted (redux-persist whitelist in `src/store/store.ts:212`);
  ~90 per-screen slices hold cached data in memory.

## What sign-out logic exists today

- **Backend**: `POST /auth/signout` (authenticated, `auth.controller.ts:99`) →
  `AuthService.signout(userId)` revokes **all** of the user's active refresh tokens
  (sets `revokedAt`). Role-agnostic — works for any role.
- **Frontend**: `authSignOut()` (`src/networks/auth/authNetwork.ts`) calls `/auth/signout`
  (errors ignored → offline-tolerant) and always clears the three AsyncStorage keys.
  `authSlice.signOut` resets the auth slice (keeps `hasSeenOnboarding`). `AppContainer.
  renderNavigator()` switches to the keyed unauthenticated `BaseNavigator` when
  `isAuthenticated` flips false, which remounts navigation — back cannot re-enter.

## Where the three Settings screens live

| Role (signout.md name) | App role | Settings screen |
|---|---|---|
| Admin | `super_admin` | `src/screens/SuperAdmin/AdminSettings/AdminSettingsScreen.tsx` |
| Company Administrator | `admin` | `src/screens/Settings/SettingsMain/SettingsScreen.tsx` |
| Delivery Personnel | `delivery` | `src/screens/Delivery/Personnel/DPSettings/DPSettingsScreen.tsx` |

## What's missing (the gaps this task closes)

1. **Access tokens survive sign-out** — signout only revokes refresh tokens; the stateless
   access token keeps working for up to 15 minutes (fails acceptance "old token → 401").
   No denylist/blocklist exists, and access tokens have no `jti` to key one on.
2. **No `POST /auth/logout`** route (only `/auth/signout`), and it is not idempotent for an
   already-invalid token (guard returns 401 instead of success).
3. **Sign Out button coverage**:
   - Admin (super_admin): ✅ exists on AdminSettingsScreen (confirm + backend call), but no
     spinner/double-tap guard.
   - Company Administrator: ❌ **no Sign Out anywhere on SettingsScreen**.
   - Delivery Personnel: ❌ none on DPSettingsScreen. (DPProfileScreen has one, but it only
     dispatches the Redux action — **never calls the backend and never clears AsyncStorage
     tokens**, so the session silently survives.)
4. **Redux is not fully cleared on sign-out** — only the auth slice resets. Persisted
   `company`/`inventoryApproval` state and every cached per-screen slice (invoices, payroll,
   dashboards, …) keep the previous user's data until app restart / next-user overwrite.

## Implementation plan (Phases A + B)

- **Backend**: add `jti` to access tokens; new `revoked_access_tokens` table (jti PK,
  user_id, expires_at) + idempotent migration (matches the repo's `IF NOT EXISTS`
  convention; prod runs migrations, `synchronize` is dev-only); `JwtStrategy.validate`
  rejects denylisted `jti`; `POST /auth/logout` (kept alias `/auth/signout`) verifies the
  bearer token itself, revokes refresh tokens + denylists the access `jti`, prunes expired
  rows, and **always returns success** (idempotent, no detail leaks). Tests added.
- **Frontend**: root-reducer reset of the whole store on `auth/signOut` (preserving
  onboarding flags); shared `useSignOut` hook (confirmation → spinner/disable → backend
  best-effort → clear tokens → reset store → auth stack); button added to the two missing
  Settings screens and the two existing buttons refitted to the hook.
