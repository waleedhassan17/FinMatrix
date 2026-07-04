# CHUNK 1 AUDIT — Non-Ledger Operational Surface
**Date:** 2026-07-04 · **Scope:** More-stack screens, Customer/Vendor records, complete Delivery module (admin + personnel + inventory-approval loop) · **Repos:** FinMatrix (RN/Expo) @ `243148c`, FinMatrix-Backend (NestJS) @ `dc4b221` (Heroku v45)

Legend: ✅ works end-to-end · ⚠️ partial (works but misses production bar) · ❌ broken/mock/dead

---

## 1. More-stack screens

| Screen | State | Missing / broken |
|---|---|---|
| MoreHub | ✅ | All 10 rows navigate to real screens; no dead entries. |
| COAList / COADetail / COAForm | ⚠️ | Real CRUD against `/accounts` (delete guarded server-side, system accounts protected). Pull-to-refresh ✅ on list. **No pagination** (loads all accounts — acceptable, COA is bounded ~50 rows, but list fetch has no `onEndReached`). No explicit error+retry block on list failure. |
| Bank Reconciliation (List/Detail/Run) | ⚠️ | Functional per QB-audit fix #27 (real `/reconciliations` endpoints). Reconciliation *statement matching* is record-keeping (no posting) — in scope only for states/pagination polish. No pull-to-refresh on list. |
| Customers (List) | ⚠️ | Real `/customers` (searchable, server-paginated, RefreshControl ✅) but **frontend never requests page 2** (no `onEndReached` — >50 customers invisible). |
| Customers (Detail) | ❌ | Info tab real; **Transactions tab renders `MOCK_INVOICES` + `MOCK_PAYMENTS` hardcoded arrays** (`CustomerDetailScreen.tsx:56-90`, rendered at `:317`, `:341`). Backend endpoints `/customers/:id/invoices`, `/:id/payments`, `/:id/statement` exist and are unused. Running balance shown from record ✅. |
| Customers (Form) | ⚠️ | Full create/edit incl. payment terms, credit limit, billing+shipping address → real API. **Shipping address is not geocoded** (Phase A requires geocode; backend geocodes only at delivery-creation time). |
| Vendors (List/Detail/Form) | ❌ | Same shape as Customers: list real+searchable but no page-2 fetch; **Detail Transactions tab = `MOCK_BILLS` + `MOCK_PAYMENTS`** (`VendorDetailScreen.tsx:61-90`, rendered `:298`, `:322`); backend `/vendors/:id/bills`, `/:id/payments` exist unused. |
| Employees & Payroll (4 screens) | ⚠️ | Real API (UML Phase D). Payroll *posting* is out of scope (Chunk 2 boundary respected — do not touch process/JE). List states/pagination polish only. |
| Tax Management (Settings/Liability/Payment) | ✅/⚠️ | All 6 `/taxes/*` endpoints verified live (v47 fixes; liability recoverable-input fix #21 deployed). TaxSettings has real CRUD. No pull-to-refresh on TaxSettings; rate list unpaginated (bounded data — acceptable). |
| Settings (Main) | ✅ | Real endpoints (`/settings`, preferences). |
| Company Profile | ⚠️ | Wired to `/settings/company-profile` GET/PATCH — verify all fields round-trip; no explicit error state. |
| User Management | ⚠️ | Real (`/settings/users` list/update/delete/role/invite). No pagination (bounded — company members). |
| Company Switcher | ⚠️ | Works; **"New Company" button = dead-end alert "wizard coming soon"** (`CompanySwitcherScreen.tsx:63`). |
| Global Search | ✅ | Real `/search` via auditSearchNetwork. |
| Warehouse Agencies (List/Detail/Form/Sync) | ⚠️ | Real `/agencies` CRUD + items + sync. List has RefreshControl; no pagination (bounded). |
| Delivery Management entry (AssignDeliveries) | ⚠️ | Real; see §3. |
| Delivery Personnel (List/Add/Detail) | ⚠️/❌ | See §3 — Detail screen is largely mock. |
| Subscription (Renew/Pay) | ✅ | Phase-2 work, live-verified, E2E tested. |

## 2. Customer/Vendor record management — verdict

Backend is production-grade already: tenant-scoped, `RolesGuard` enforced, server validation (class-validator DTOs), payment terms + credit limit + jsonb addresses, `ILIKE` search, skip/take pagination, composite indexes (`companyId+createdAt`, `companyId+isActive`), toggle-active, guarded delete, statement/invoices/payments sub-resources.

Frontend gaps: mock transaction tabs (above), no infinite scroll, no geocode on customer shipping address, no balance-refresh on focus.

## 3. Delivery module

### Admin side
| Screen | State | Missing / broken |
|---|---|---|
| CreateDelivery | ⚠️ | Real items from main inventory, real `/deliveries` POST; backend geocodes shipping address with graceful null fallback. **No manual-coordinate fallback UI when geocoding fails** (delivery just has no pin). No submit-in-flight double-tap guard verified. |
| AssignDeliveries / AssignWork | ⚠️ | Real assign + auto-assign endpoints. No pull-to-refresh/pagination on unassigned list. |
| DeliveryMonitor | ❌ | **Map view was removed** — `viewMode` hard-locked to `'list'` (`DeliveryMonitorScreen.tsx:150`), map JSX dead. 30s refresh interval exists **with correct cleanup** ✅ (`:185-190`). Phase B requires: map pins, destination pins, routes, rider tracking — all currently unreachable. |
| AdminDeliveryDetail | ⚠️ | Real detail + history. Rider-track entry exists but leads to the map-less monitor. |
| InventoryApproval | ⚠️ | Real queue + approve/reject/undo (native Alert dialogs — modal bug fixed). List refreshes after action; **no pull-to-refresh, no pagination** on the queue. |
| DeliveryPersonnelList | ⚠️ | Real fetch on mount; newly added rider needs manual refresh; **no RefreshControl**. "X of LIMIT used" banner exists (Phase 2) ✅. |
| AddDeliveryPersonnel | ✅ | Real `POST /delivery-personnel` (creates user+membership+profile atomically); plan limit surfaces upgrade error ✅. |
| DeliveryPersonnelDetail | ❌ | **Reads rider from `dummyDeliveryPersonnel` (empty array!) fallback and renders `generateDummyDeliveries()` / `generateDummyHistory()` hardcoded rows** (`DeliveryPersonnelDetailScreen.tsx:42-87`). Deactivate/remove dispatches local-only reducers — **no backend call** for deactivate; reset-password endpoint exists server-side but is not wired. |

### Personnel portal (rider)
| Screen | State | Missing / broken |
|---|---|---|
| DPDashboard | ⚠️ | Real `/deliveries/my/dashboard`. GPS badge removed with tracking kill-switch. |
| DPDeliveryList | ⚠️ | Real `my/assigned`; RefreshControl ✅; no pagination (rider active list is small — acceptable). |
| DPDeliveryDetail | ⚠️ | Status buttons dispatch real `PATCH /deliveries/:id/status` but **fire-and-forget**: no `unwrap()`, no in-flight disable (double-tap sends twice), no error surfaced on failure (silent loss on bad network — explicit Phase B fail). Slice tracks `isUpdatingStatus` but screen ignores it. **Dead "⋯" header button** (`:207`, no onPress). Turn-by-turn nav via geocoded coords ✅. |
| BillPhotoCapture | ⚠️ | Real multipart upload, failure alert + manual retry ✅, duplicate-submit guard ✅. **No offline queue**; photo stored on ephemeral disk (see §4). |
| CustomerConfirm | ✅ | Fixed (awaits unwrap, navigates only on success); backend `deliveredItems` optional. |
| DeliveryComplete | ✅ | Terminal screen. |
| DPHistory / DPInventory / DPShadowInventory | ⚠️ | Real endpoints; states/pagination polish. |
| DPProfile / DPSettings | ⚠️ | **3 "coming soon" dead-ends in DPSettings** (Change Password :132, 2FA :150, Sessions :168). Availability toggle wired to real `PATCH /delivery-personnel/availability`. |

### Backend delivery status machine — ⚠️ partial
`deliveries.service.ts:253` (`STATUS_ORDER` unassigned→…→delivered):
- ✅ Reverts rejected; cancelled/delivered terminal handling.
- ❌ **Forward skips allowed** (pending → delivered directly, bypassing pickup/transit).
- ❌ **Not idempotent-clean:** re-sending the current status passes (`<` check only) → duplicate history rows; double-tap advances twice through distinct states.
- ❌ **No ownership check:** any rider in the company can update any delivery (not just theirs).
- ❌ No row lock → concurrent updates race.

### Location tracking — ❌ disabled
`locationService.ts:23` `TRACKING_ENABLED = false` (kill-switch from 2026-06-13). Background-tracking infra (expo-task-manager, foreground service, permissions in app.json) is all built but off. Off-shift stop: DP availability toggle does not stop tracking (tracking currently starts/stops per active-delivery-detail mount only). Admin monitor shows no rider pins (map also removed).

### Role isolation — ❌ FAIL (critical)
`@Roles(...)` decorators are **decorative** (no `RolesGuard`) on: `deliveries`, `delivery-personnel`, `inventory-approvals`, `inventory-update-requests`, `bill-photo`, `agencies`, `settings`, `shadow-inventory` controllers. A **delivery token can call admin endpoints**: create deliveries, approve/reject inventory requests, manage users via `/settings/users`, create riders, etc. Financial controllers (invoices/bills/payments/accounts/reports/taxes/customers/vendors…) DO enforce RolesGuard (hardening Phase 5). No automated cross-role denial test for the operational surface.

### Plan-gated personnel management — ✅ (Phase 2, deployed & tested)
Server-side limit Free=1/paid=3 with `DELIVERY_PERSONNEL_LIMIT_REACHED` + upgrade message; downgrade blocks-new-never-deletes; live "X of LIMIT" endpoint + UI. Reset-password endpoint exists (`POST /delivery-personnel/:userId/reset-password`) but **not wired in UI**; deactivate exists (`PATCH :userId` status) but UI uses local-only reducer. No audit log on those two flows.

### Inventory-approval loop — ✅ backend / ⚠️ frontend
Approve is transactional, row-locked, negative-stock-guarded, idempotent (pending-only), syncs shadow inventory, completes delivery, audit-logged. Reject + undo work (native dialogs). **No ledger/stock JE posted — correct for Chunk 1; needs the explicit `// CHUNK2: commit stock on approval` marker.** Frontend queue lacks pull-to-refresh/pagination.

## 4. Uploads — ❌ PRODUCTION DEFECT
- `common/storage/storage.service.ts` writes **local dyno disk** (`UPLOAD_STORAGE_PATH`, default `./storage`) — wiped on every Heroku restart/deploy. Used by **bill-photo (POD) uploads** (`bill-photo.controller.ts` → `inventory-approvals.service.submitBillPhoto`). Every proof-of-delivery photo is eventually lost.
- Serving: `GET /inventory-update-requests/:id/bill-photo` (auth-gated ✅ tenant-scoped, but role-guard decorative per §3).
- Type/size validation ✅ server-side (jpeg/png/webp, 8 MB).
- **No Cloudinary anywhere in either repo.** (Payment screenshots were already moved to Postgres bytea — that pattern proved the disk problem live.)
- ✅ No other in-scope upload paths found.

## 5. Mock/hardcoded data in scope (file:line)
1. `src/screens/Customers/CustomerDetail/CustomerDetailScreen.tsx:56,73` — `MOCK_INVOICES`, `MOCK_PAYMENTS` (rendered :317, :341).
2. `src/screens/Vendors/VendorDetail/VendorDetailScreen.tsx:61,78` — `MOCK_BILLS`, `MOCK_PAYMENTS` (rendered :298, :322).
3. `src/screens/Delivery/Admin/DeliveryPersonnelDetail/DeliveryPersonnelDetailScreen.tsx:42-48,86-87` — `generateDummyDeliveries()`, `generateDummyHistory()`; `:65` reads `dummyDeliveryPersonnel` (empty legacy array).
4. Dead-end alerts: `DPSettingsScreen.tsx:132,150,168` ("coming soon" ×3), `CompanySwitcherScreen.tsx:63`.
5. Legacy naming (`DummyDeliveryPerson` type, `dummyDeliveryPersonnel = []`) — type-only, no fake data injected, rename optional.

## 6. Pagination / index status of in-scope list endpoints

| Endpoint | Server paginated | FE fetches next pages | Indexes |
|---|---|---|---|
| GET /customers | ✅ skip/take + search | ❌ page 1 only | ✅ (companyId,createdAt/isActive) |
| GET /vendors | ✅ | ❌ page 1 only | ✅ |
| GET /deliveries | ✅ | ❌ | ✅ (companyId+status/personnelId/customerId/createdAt) |
| GET /deliveries/my/* | ✅ | ❌ | ✅ |
| GET /delivery-personnel | ✅ | ❌ | profile table — verify index |
| GET /inventory-update-requests | ✅ | ❌ | ✅ (companyId+status/personnelId/submittedAt) |
| GET /taxes/rates, /accounts, /agencies, /settings/users | ✅/bounded | ❌ (bounded data — OK) | partial |

No N+1 found in delivery/customer/vendor list paths (batch joins already used); verify with query logs in Phase C.

## 7. Error monitoring — ❌ none
No Sentry (or equivalent) in either repo. Backend has pino logging; frontend has nothing — unhandled rejections vanish.

---

## Proposed phase order (approved definition from phase3.md)

1. **Phase A — Records & More surface (FE-heavy):** kill all mock data (Customer/Vendor detail transactions → real endpoints; DeliveryPersonnelDetail → real rider profile + deliveries + history), infinite-scroll pagination on Customers/Vendors/Deliveries lists, four states everywhere, customer shipping geocode, dead-end removal (CompanySwitcher/DPSettings), wire deactivate + reset-password for riders.
2. **Phase B1 — Security backbone (BE):** enforce `RolesGuard` on the 8 operational controllers + rider-ownership check on status updates + status-machine hardening (no skips, idempotent replays, row lock). This is first among B items because everything else sits on it.
3. **Phase B2 — Uploads to Cloudinary:** pluggable storage (Cloudinary primary via env, Postgres bytea fallback so nothing ever lands on dyno disk), access-controlled serving, migrate bill-photo path.
4. **Phase B3 — Delivery UX production bar:** re-enable monitor map (pins/routes/rider tracking), re-enable location tracking with off-shift stop, geocode-failure manual fallback, offline-resilient status updates + photo retry queue, double-tap guards.
5. **Phase C — Hardening & proof:** Sentry both sides, pagination/index sweep, cross-tenant + cross-role denial tests, status-machine + plan-limit + upload tests, tsc/build/acceptance green, CHANGELOG + PRODUCTION READINESS CHECKLIST, staging UAT (admin + rider).

**Chunk 2 boundary respected:** no posting/journal/report logic will be touched; inventory-approval ledger commit gets the `// CHUNK2: commit stock on approval` marker only.
