# CHUNK 1 CHANGELOG — Non-Ledger Operational Surface → Production
**Work order:** `phase3.md` (Chunk 1 of 2) · **Date:** 2026-07-05 · **Audit:** `CHUNK1_AUDIT.md` · **Checklist:** `CHUNK1_PRODUCTION_READINESS.md`

Accounting/posting/journal/report logic was **not touched** (Chunk 2 boundary). The ledger commit on delivery approval is marked `// CHUNK2: commit stock on approval` in `inventory-approvals.service.ts`.

## Backend (FinMatrix-Backend) — commits `3d31937`, `fb8bc8c`, `77c3356`, + Phase C

### Phase A — records
- **customers**: `contact_person`, `tax_id` columns (the form always offered these; DTO whitelisting silently discarded them); shipping-address geocoding on create/update (graceful — never blocks a save; coordinates reused as the delivery-destination fallback); `totalPurchases` on detail; paginated `/:id/invoices` + `/:id/payments`; `zipCode` accepted as `postalCode` alias (normalized in the service).
- **vendors**: paginated `/:id/bills` + `/:id/payments`; new `GET /:id/statement` (opening + activity + closing).
- **both**: `delete()` was a silent no-op (`softRemove` with no `@DeleteDateColumn`); now blocks records with invoices/bills/payments/balance (`400 CUSTOMER_HAS_ACTIVITY` / `VENDOR_HAS_ACTIVITY`, suggests deactivation) and hard-deletes clean records.
- **envelope fix**: paged responses nested under `data` so the global interceptor stops dropping `pagination`/`summary`.
- payment terms: `'custom'` added to the shared enum.

### Phase B1 — security backbone
- **`RolesGuard` was decorative on 8 operational controllers** (deliveries, delivery-personnel, inventory-approvals, inventory-update-requests, bill-photo, agencies, settings, shadow-inventory): `@Roles` annotations existed but no guard executed, so a delivery token could call admin endpoints. Now enforced; every annotation verified rider-compatible. `GET /accounts*` reads also gained `@Roles('admin','staff')` (chart of accounts was readable by riders).
- **Delivery status machine** (`PATCH /deliveries/:id/status`): explicit legal-transition table — `unassigned→pending→picked_up→in_transit→arrived→delivered`, with `cancelled/failed/returned` reachable only from active states; terminal states final; **skips rejected** (`400 ILLEGAL_STATUS_TRANSITION`); **idempotent replay** (same-status update is a no-op — no duplicate history, no double-advance); **rider ownership** (`403 NOT_YOUR_DELIVERY`); riders cannot cancel (`403 RIDER_CANNOT_CANCEL`); row-locked transaction serializes concurrent updates.
- `confirmDelivery`: rider ownership + idempotent when already delivered.
- Delivery create/update accept a **manual destination override** (`destAddress`/`destLat`/`destLng`) for the geocode-failure fallback; automatic geocode falls back to the customer's stored shipping coordinates.
- **Operational audit log** (`operational_audit_events`, global module): rider password resets and activate/deactivate are recorded (actor, target, before/after).
- `resetPassword` returned the rider's **userId in the email field** — now returns the real login email.

### Phase B2 — durable uploads (no dyno disk, ever)
- `StorageService` rewritten: **Cloudinary** (`CLOUDINARY_URL`, uploads as `type: authenticated` — not publicly reachable; served only through the API's auth-gated endpoints via short-lived signed URLs) with **Postgres bytea fallback** (`stored_files`) when Cloudinary is unconfigured or an upload fails. Legacy disk keys stay readable. Bill-photo streaming returns the stored mime type/length.
- New dependency: `cloudinary@^2`.

### Phase C — hardening
- **Sentry** (`@sentry/node`): initialized in `main.ts` when `SENTRY_DSN` is set; the global exception filter reports every 5xx with route/company/request-id context. Internal error text (DB errors etc.) is **no longer leaked** to clients on 500s.
- **`POST /monitoring/client-errors`**: authenticated intake for unhandled app-side JS errors → server log + Sentry with user/screen/platform context.
- Migrations `1783700000000`, `1783710000000`, `1783720000000` (all additive + idempotent) + `dist/database/apply-chunk1-schema.js` for Heroku.

## Frontend (FinMatrix) — commits `c5fe917`, `a402135`, + Phase C

### Phase A — records & More surface
- **CustomerDetail**: `MOCK_INVOICES`/`MOCK_PAYMENTS` deleted; tabs now read `/customers/:id/invoices|payments` (paginated, loading/error/empty/success + retry); record fetched from the API on focus; Create Invoice / Record Payment open the real forms preselected; **Send Statement** builds a real account-statement PDF from `/customers/:id/statement` and opens the share sheet (browser print dialog on web).
- **VendorDetail**: same treatment (`MOCK_BILLS`/`MOCK_PAYMENTS` deleted, real tabs, statement PDF, BillForm/PayBills preselected).
- **Serializers**: decimal strings coerced to numbers (every balance rendered as **0** before), `postalCode↔zipCode` and `net30↔net_30` terms mapped both ways, vendor structured address unpacked (city/state/zip were always blank).
- **VendorForm was fully broken** (sent `name`; the API requires `companyName` → 400 on every create) — now sends the DTO shape. CustomerForm fields that were silently stripped (contactPerson, taxId, zip) now persist.
- **Customers/Vendors lists**: debounced server-side search + infinite scroll (previously page 1 only — records beyond 50 were invisible).
- **DeliveryPersonnelDetail** rewritten on real APIs (was `generateDummyDeliveries()`/`generateDummyHistory()` + an empty legacy array): live profile, active assignments, recent deliveries, working **reset-password** (temp-credentials modal + share) and **deactivate/reactivate** (server-side, audited, data never deleted), pull-to-refresh, web-safe Modal confirmations.
- **Dead ends removed**: DPSettings Change Password sends a real reset code; fake 2FA/Sessions rows dropped; Help/Privacy open real links; CompanySwitcher's fake "New Company" button removed (companies are created through sign-up + approval) and switching works on web.
- Pull-to-refresh added to InventoryApproval, DeliveryPersonnelList, TaxSettings, AssignDeliveries.
- `InvoiceForm`/`BillForm` accept a preselect param (`customerId`/`vendorId`).

### Phase B3 — delivery UX
- **DeliveryMonitor**: Map/List toggle restored — rider pins, destination pins, dashed route lines, fit-all; 30s auto-refresh (interval cleanup verified).
- **Live tracking re-enabled** (`TRACKING_ENABLED = true`) with a real **On/Off Duty toggle** on the rider dashboard: permission flow runs, tracking starts only while on duty with active work and **stops off-shift** (no battery/data drain); GPS badge reflects the actual tracking state. Background tracking still requires a dev/standalone build (Expo Go/web fall back to foreground-only).
- **Bad-network resilience**: status updates, customer-confirm and bill-photo uploads retry transient network failures (1s/3s backoff) — safe because the server made them idempotent; HTTP 4xx/5xx are never retried.
- **Fixed silent data loss**: `submitBillPhoto` swallowed API failures and fabricated a local request id — the rider saw success while the server never received the photo. It now rejects with a clear, retryable error and nothing is lost.
- **DPDeliveryDetail**: status buttons await the request, disable while in flight (double-tap safe), show "Updating…", and surface failures with a "nothing was lost — tap to retry" message; dead "⋯" header button removed.
- **AdminDeliveryDetail**: "Delivery Location" section — when geocoding failed, a clear warning + **Set Location Manually** modal (address + exact coordinates) saved via `PATCH /deliveries/:id`.
- CreateDelivery double-tap guard; delivery-slice debug console noise removed; latent wrong route (`/deliveries/my`) fixed.

### Phase C — monitoring
- `src/services/errorMonitoring.ts`: global unhandled-error + promise-rejection handlers report to `POST /monitoring/client-errors` (rate-limited, de-duplicated, never recursive) — dependency-free so it works in Expo Go, dev builds and web. Installed from the app entry point.

## Tests (all executed against a locally booted API + throwaway Postgres)
- **`test/chunk1.acceptance.ts` (npm run test:chunk1): 58/58 PASS** — status-machine legality/idempotency/ownership, rider-403 sweep across 12 admin/financial endpoints, cross-tenant denial (incl. header spoofing), Free-plan personnel limit + upgrade message, POD photo upload → durable `db:`/`cld:` key → byte-identical auth-gated streaming → tenant isolation → approve/double-approve(409)/stock deduction, record CRUD + zipCode alias + delete guards + pagination + search, reset-password/deactivate audit rows, client-error intake.
- **`test/acceptance.ts`: 32/32 PASS** — accounting invariants (trial balance, balance sheet, posting idempotency, period lock, concurrency) untouched.
- Backend jest: 16/16. `tsc --noEmit`: 0 errors both repos (frontend `node_modules/expo-file-system` warnings pre-exist on a clean tree). Backend `npm run build`: clean.

## Ops notes (deploy)
1. Deploy backend (`git push heroku main`), then run `heroku run node dist/database/apply-chunk1-schema.js -a finmatrix-api-prod`.
2. Set **`CLOUDINARY_URL`** to move POD photos to the CDN (photos persist in Postgres until then — durable either way).
3. Set **`SENTRY_DSN`** to activate error monitoring (no-op until set).
4. `GOOGLE_MAPS_API_KEY` (already documented) powers customer-shipping + delivery geocoding.
5. Rider background tracking requires a dev/standalone app build (not Expo Go).
