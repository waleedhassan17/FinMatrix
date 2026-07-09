# REFACTOR_PLAN.md — FinMatrix frontend quality refactor (phase4.md, Phase 0)

**Date:** 2026-07-09 · **Branch:** `quality-refactor` · **Reference:** `~/Consultant-Mobile/Consultant_Mobile`
**Iron rule restated:** behavior-preserving only — same screens, same routes, same API payloads, same
rendered UI. Every commit leaves `npx tsc --noEmit` clean and the app building.

---

## A. The reference standard (Consultant_Mobile conventions, as found)

| Concern | Convention in the reference |
|---|---|
| Top-level layout | Project-root folders (no `src/`): `screens/`, `navigators/`, `navigations-maps/`, `networks/`, `models/`, `serializers/`, `store/`, `hooks/`, `components/` (app-level: AppContainer + its slice), `Custom-Components/` (shared UI), `utils/`, `notifications/`, `translations/` |
| Screens | One folder per screen (`signin-screen/`) containing the screen component + its **colocated slice** (`SignIn.tsx` + `SignInSlice.ts`) |
| Slices | Built with **`store/createAppSlice.ts`** (`buildCreateSlice` + `asyncThunkCreator`); reducers via `create.reducer` / `create.asyncThunk`; selectors exported from the slice; registered centrally in `store/store.ts` |
| Navigation maps | **`navigations-maps/<Name>.ts` per navigator**: a `RouteNames` const object (`as const`), a `RouteName` union type, an `IRoute { title, component, options }` interface, and a `Routes: IRoute[]` array importing the screen components |
| Navigators | **Dumb mappers**: `navigators/<Name>Navigator.tsx` takes `initialRouteName` and does `Routes.map(→ <Stack.Screen/>)` — no screen imports, no inline route lists |
| App.tsx | Minimal: `Provider` + `<AppContainer/>` (+ a hook). All composition lives in `components/AppContainer.tsx`, which reads `appContainerSlice` and decides which navigator to mount |
| Network layer | `networks/` grouped **by domain in subfolders** (`authcalls/signin.ts`, `Therapist/therapistapi.ts`), one shared client at `networks/network/network.ts`; each file exports typed functions with request/response interfaces at the top; **screens/slices never touch the raw client** |
| Models | `models/<entity>.ts` — plain exported interfaces per entity (plus enums/state types) |
| Serializers | `serializers/<entity>Serializer.ts` — defensive raw→model mapping with small parsing utilities (`cleanText`, `parseRating`…) |
| Hooks | `hooks/useReduxHooks.ts` (typed dispatch/selector) |
| Note | The reference itself is not 100 % consistent (e.g. `SignIn.tsx` vs `therapist.tsx`, `Components/` casing) — where it wavers, this plan follows its **dominant** pattern |

## B. FinMatrix today — what already matches vs what diverges

**Already matching (no work needed):**
- `src/store/createAppSlice.ts` is **identical** in pattern to the reference; `store.ts` registers slice reducers the same way.
- Slices are colocated with screens (91 slice files) and built with `createAppSlice`.
- `src/hooks/useReduxHooks.ts`, `src/Custom-Components/`, `src/components/app-container/AppContainer.tsx` + a root-composition pattern, `src/serializers/<x>Serializer.ts`, `src/models/<x>Model.ts` all mirror the reference's roles.
- `src/navigators/tiers/tierRoutes.tsx` already implements the reference's route-array pattern — the rest of the navigation should look like it.

**Divergences (the actual work), ranked by quality value ÷ risk:**

| # | Divergence | Reference says | FinMatrix has |
|---|---|---|---|
| D1 | **Navigation maps** | typed `Routes[]` arrays in `navigations-maps/`, navigators map over them | `navigations-map/Base.ts` is only a flat `ROUTES` string map; `BaseNavigator` + 5 admin stacks + 4 DP stacks + SuperAdmin hardcode ~140 `<Stack.Screen>`s inline |
| D2 | **Network layer grouping** | domain subfolders under `networks/` + shared client isolated in `networks/network/` | `src/network/` = 42 flat files + `apiHelpers.ts` (client) |
| D3 | **Screens never call the client** | screens import domain network functions only | **9 screens/slices import `apiHelpers` directly** (PayBills, TaxSettings, POForm, COAForm, 5 Auth screens) |
| D4 | **Models/serializers coverage** | every entity has a model + serializer | 41 models / 34 serializers vs 42 network domains — a few flows parse envelopes ad-hoc in slices |
| D5 | Naming consistency | dominant camelCase files, `<X>Slice.ts`, `<x>Serializer.ts` | mostly consistent already; stragglers: `_reportHelpers.ts` (underscore prefix), `navigations-map` (singular), `src/theme/` **and** `src/utils/theme.ts` both exist, `components/` mixes root files with subfolders |
| D6 | Screen folder naming | kebab-case single level (`signin-screen/`) | PascalCase two-level (`Invoices/InvoiceList/InvoiceListScreen.tsx`) |
| D7 | `src/` root | none (project root) | everything under `src/` |

## C. The plan (phased, small commits, each verified)

### Phase 1 — Structure & naming (pure moves/renames)
1. `src/navigations-map/` → **`src/navigations-maps/`** (folder rename + ~40 import updates).
2. `src/network/` → **`src/networks/`**, grouped into domain subfolders mirroring the reference:
   - `networks/network/` → `apiHelpers.ts` (the shared client — name kept, location aligned)
   - `networks/auth/` → authNetwork
   - `networks/billing/` → billingNetwork, superAdminNetwork
   - `networks/sales/` → invoiceNetwork, estimateNetwork, salesOrderNetwork, creditMemoNetwork, paymentNetwork, customerNetwork
   - `networks/purchases/` → billNetwork, purchaseOrderNetwork, vendorCreditNetwork(-in-creditMemo?), taxNetwork, coaNetwork, journalEntryNetwork, reconciliationNetwork, settingsNetwork
   - `networks/inventory/` → inventoryNetwork, agencyNetwork
   - `networks/delivery/` → deliveryNetwork + the 5 `dp*Network.ts`
   - `networks/payroll/` → payrollNetwork, budgetNetwork
   - `networks/reports/` → the 9 report networks + `_reportHelpers.ts` → **`reportHelpers.ts`**
   - `networks/search/` → auditSearchNetwork, adminDashboardNetwork, analyticsDashboardNetwork
   File contents untouched — only paths/imports change (`git mv` so history follows).
3. Naming stragglers: `_reportHelpers.ts` → `reportHelpers.ts`; keep every `<domain>Network.ts` file name (already consistent).
4. **Deviations kept, for your approval** (details §E): keep `src/` (D7) and keep PascalCase screen folders (D6).
   Verification: `tsc` clean, `expo export` bundles, zero grep hits for old paths.

### Phase 2 — Navigation & App.tsx (the biggest quality win)
1. Build reference-style maps in `src/navigations-maps/`, one per navigator, each exporting
   `<Name>RouteNames` (as const) + `IRoute[]` array: `Auth.ts` (BaseNavigator's auth/onboarding
   branches), `Dashboard.ts`, `Transactions.ts`, `Reports.ts`, `Inventory.ts`, `More.ts`,
   `SuperAdmin.ts`, `DPDashboard.ts`/`DPDeliveries.ts`/`DPInventory.ts`/`DPProfile.ts`, and fold the
   existing `tiers/tierRoutes.tsx` into the same shape (it is already 90 % there).
2. Rewrite each navigator in `src/navigators/` as a dumb mapper over its map (exactly like the
   reference's `BaseNavigator`), preserving **identical route names, initial routes, screenOptions,
   per-route options, and conditional branches** (BaseNavigator's auth/status/tier switching logic
   stays — only the inline `<Stack.Screen>` lists become `Routes.map(...)`).
3. `App.tsx`: keep behavior EXACTLY (PersistGate, ErrorBoundary, `FreshLoginGate` purge-on-cold-start
   — that is deliberate product behavior, not cruft) but move presentational bits (LoadingFallback,
   styles) beside AppContainer so App.tsx reads like the reference's thin composition.
4. Existing `ROUTES` const in the old `Base.ts` is kept re-exported until Phase 4 removes the last
   consumers (several screens navigate via `ROUTES.*`).
   Verification: route-parity script — dump every `name=` registered before vs after (static grep on
   both revisions) and diff; must be byte-identical per navigator. Manual smoke of one flow per tier.

### Phase 3 — Network layer, models, serializers
1. Extract the 9 direct `apiHelpers` usages in screens/slices into the owning domain network file as
   named functions (move the literal axios call — URL/method/body/params copied verbatim), then import
   the function. **No payload may change**: verified by diffing the request lines before/after.
2. Add the missing models/serializers so every network domain has both (D4): types added around
   existing parsing, serializer bodies produce the SAME object shapes the slices already build (start
   from the current inline code, moved not rewritten).
3. Normalize network-file internals to the reference layout (interfaces on top, exported functions
   below) where files deviate — comments/organization only.
   Verification: `tsc`; grep proves screens no longer import `apiHelpers`; per-endpoint spot-check
   against the local QA backend comparing request logs before/after (invoice create, payment, report
   load, delivery assign — the four key flows in phase4.md).

### Phase 4 — Slices & components
1. Slice normalization to the reference shape where individual slices deviate (selectors exported from
   the slice, `create.asyncThunk` instead of hand-rolled thunks **only** where the runtime result is
   provably identical — otherwise leave and flag). State shapes untouched.
2. `src/components/` tidy-up: root-level shared components grouped (`components/shared/`), reports kit
   stays at `components/reports/` (already reference-like), `app-container/` already matches.
3. Extract obvious duplicated UI only where identical JSX repeats verbatim across screens (e.g. the
   payslip-style Row helpers) — appearance unchanged.
4. Retire duplicate theme entry (`src/theme/` vs `src/utils/theme.ts`): keep both files, make one
   re-export the other (zero-risk), full merge deferred.
   Verification: `tsc`, build, before/after screenshot spot-check on Dashboard, InvoiceList,
   ReportsHub, DP dashboard.

### Deliverables & cadence
- Small commits per concern (≈ 12–15 commits), each message stating the concern + "behavior-preserving".
- Diff summary reported to you after every phase (files moved/renamed vs lines actually changed).
- `REFACTOR_CHANGELOG.md` at the end with the no-behavior-change statement + green tsc/build evidence.
- **No pushes** until you say so (work stays on `quality-refactor`).

## D. Risk register (and the guard for each)

| Risk | Guard |
|---|---|
| Import-path breakage from moves/renames | `git mv` + project-wide search for the old path must return 0; `tsc` after every commit; Metro cache cleared before build check |
| Navigation regression (missed route/options) | static route-parity diff (all `name=`/options pairs) per navigator before vs after; BaseNavigator's conditional branches copied verbatim |
| A "tidied" network function changing a payload | Phase 3 moves call code verbatim (cut/paste, no edits); request-log diff against local QA backend on the four key flows |
| Slice thunk conversion altering error/pending semantics | conversions only where mechanical; anything with custom catch/dispatch chains is left as-is and flagged in the changelog |
| `redux-persist` keys breaking (store/slice names) | slice `name:` strings and store reducer keys are NEVER renamed |
| `FreshLoginGate` purge behavior lost in App.tsx tidy | explicitly preserved; covered by cold-start smoke test |
| Deep links / navigate-by-string (`ROUTES.*`, `as any` casts) | `ROUTES` map kept and re-exported; route NAME strings never change |

## E. Two deviations from the reference — need your call

1. **Keep `src/`** (reference has none). Moving ~350 files to the project root touches Metro/Babel/tsconfig
   and every import for zero behavioral or readability gain; `src/` is also the Expo-community default.
   → Plan assumes KEEP. Say the word if you want exact parity and I'll include the move in Phase 1.
2. **Keep PascalCase two-level screen folders** (`Invoices/InvoiceList/`) instead of kebab-case
   single-level (`invoice-list-screen/`). FinMatrix has 119 screen directories; the domain grouping is
   the only thing keeping 120 screens navigable, and flattening to kebab-case is the churn-heaviest,
   least-valuable rename in the whole plan. → Plan assumes KEEP (with internal consistency enforced).
   Happy to do the full rename if you prefer exact parity.

— END OF PHASE 0 — stopping for your approval before touching any code, per phase4.md.
