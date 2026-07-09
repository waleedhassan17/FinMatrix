# phase4.md Quality Refactor — Changelog (branch `quality-refactor`)

FinMatrix frontend restructured to the Consultant_Mobile reference conventions
(see REFACTOR_PLAN.md). **Zero behavior change** — same routes, same request
payloads, same UI — with one deliberate, user-approved exception (commit 2).

Every commit: `tsc --noEmit` clean (0 src errors); commits 2–6 additionally
verified with `expo export --platform android` (bundle resolves, ~1936 modules).

## Commits

1. **58cc819 — navigations-maps route arrays; stacks become dumb mappers**
   9 stack navigators (113 routes) now defined as `IRoute[]` arrays in
   `src/navigations-maps/<Name>.ts`; each navigator maps over its array.
   Static route-parity diff old-vs-new: identical for all 9.

2. **ebbe423 — AppContainer renderNavigator + fetchMe session restore**
   `AppContainer.renderNavigator()` owns the top-level navigator switch
   (super_admin / delivery / approved-admin tier / BaseNavigator gates);
   BaseNavigator maps over `navigations-maps/Auth.ts` gate branches; splash
   overlay moved to AppContainer (still once per cold start).
   ⚠️ **The one deliberate behavior change (explicitly requested):**
   `FreshLoginGate` (persistor purge + sign-out on every cold start) removed;
   `bootstrapSession` restores the session from the stored token via
   `GET /auth/me` — users stay signed in until the token is no longer
   refreshable. Live-verified against the production backend (me 200 /
   bad-token 401 / refresh-token rolls).

3. **c3022d2 — src/network → src/networks domain subfolders + shared client**
   42 flat files grouped into auth/ billing/ sales/ purchases/ accounting/
   settings/ inventory/ delivery/ payroll/ reports/ dashboards/ search/,
   shared axios client isolated at `networks/network/apiHelpers.ts`;
   `_reportHelpers.ts` → `reports/reportHelpers.ts`; alias `@network/*` →
   `@networks/*`. `git mv` only — contents untouched except import paths.

4. **1a09d9c — therapist-style models/serializers for 5 domains**
   auth, superAdmin, adminDashboard, billing, settings: entity interfaces
   moved to `models/`, envelope/raw→model mapping extracted verbatim to
   `serializers/` (types re-exported from their old locations so no importer
   breaks). auditSearch intentionally skipped: its slice stores the raw
   payload as-is; adding unwrapping would change behavior.

5. **ffedaa4 — storageUtils extraction + single canonical theme module**
   Token/company AsyncStorage helpers moved to `utils/storageUtils.ts`
   (re-exported from apiHelpers for the network files); nothing outside
   `src/networks/` imports the client module anymore. Theme: design system
   moved to `src/theme/theme.ts` and re-exported from `src/theme/index.ts`
   (one canonical module); `utils/theme.ts` kept as a deprecated shim.
   The two token sets are different design systems (legacy green vs THEME
   teal) — values deliberately untouched.

6. **(this commit) — slice/component normalization**
   `companySlice` (the last plain-`createSlice` slice) converted to
   `createAppSlice` with a `selectors:` block; action names, state shape,
   slice name `'company'` (redux-persist-whitelisted) and the
   `selectActiveCompany`/`selectCompanyByInviteCode` call signatures all
   unchanged. Root-level shared components grouped under
   `components/shared/` (EmptyState, ErrorBoundary, JournalLineRow,
   LineItemRow, NotificationBadge, NotificationIcon).

## Flagged as intentionally NOT done

- **Duplicate-JSX extraction**: the repeated `Row`/`TotalsRow`/`SummaryRow`/
  `InfoRow` helpers each bind to their screen's local `StyleSheet` — diffed,
  not verbatim-identical, so extraction would be a rewrite (out of scope per
  the plan's "identical JSX only" guard).
- **`ROUTES.*` consumers kept**: `ROUTES` is FinMatrix's equivalent of the
  reference's `RouteNames` as-const maps — navigating via named constants IS
  the reference convention, so the Phase-2 note about removing consumers is
  retired rather than executed.
- **Deviations from the reference, per plan §E**: `src/` kept; PascalCase
  two-level screen folders kept. Network-domain mapping refined vs plan §C
  (accounting/, settings/, dashboards/ instead of lumping into purchases/
  and search/).
