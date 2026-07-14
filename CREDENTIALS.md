# FinMatrix — Demo Credentials (three-tier model)

> Seeded by `npm run seed:tier-demos` (FinMatrix-Backend). Currently seeded on the
> **local QA database only** — prod is untouched (per instruction: no GitHub push, no deploy).
> Idempotent: re-running the seed wipes and regenerates ONLY these three companies.

## Company admins (one per tier)

| Tier | Company | Email | Password | Plan |
|---|---|---|---|---|
| Small business | **Sukoon** | `sukoon@gmail.com` | `123456` | small_business_6mo (Rs 2,000/mo · Rs 12,000/6mo) |
| Large organization | **MetroMatrix** | `metromatrix@gmail.com` | `123456` | large_org_6mo (Rs 4,000/mo · Rs 24,000/6mo) |
| Warehouse | **Warehouse Co** | `warehouse@gmail.com` | `123456` | warehouse_3mo (Rs 4,000/mo · Rs 12,000/3mo) |

> **PROD note (2026-07-14):** MetroMatrix on prod was retyped to **warehouse**. A dedicated
> large-org verifier exists ON PROD: **LargeOrg Test Co** — `largeorg@gmail.com` / `123456`
> (large_org_6mo, approved/active; seeded by `npm run seed:largeorg-test`). It gets
> payroll/budgets/team/bank-rec but NO inventory, delivery, or agencies anywhere.

What each login shows:
- **Sukoon** — accounting only: service invoices (zero COGS), bills, customers/vendors, COA, tax, reports. No inventory/payroll/delivery anywhere in the app or API (server 403s).
- **MetroMatrix** — everything Sukoon has PLUS 3 employees with a **processed payroll run**, an active **budget vs actual**, team management and bank reconciliation. Inventory is off by default (per-company toggle); the delivery module is never available on this tier.
- **Warehouse Co** — everything PLUS full inventory (stocked via PO→GRNI 3-way match), purchase orders, sales orders, agencies, and **deliveries in all five states** (delivered+paid, delivered+unpaid → open invoice in A/R, returned → restocked, in-transit → value in Goods in Transit 1250, freshly assigned).

## Warehouse delivery personnel (rider portal)

| Name | Email | Password |
|---|---|---|
| Saim Raza | `rider1@warehouseco.com` | `123456` |
| Haseeb Ali | `rider2@warehouseco.com` | `123456` |

Riders land in the separate rider app (My Deliveries / mark delivered / upload proof) and get **403 on every accounting endpoint**, verified by the acceptance suites.

> Note: the legacy MetroMatrix riders (`saim@metromatrix.com`, `haseeb@metromatrix.com`) can
> still sign in but see no deliveries — MetroMatrix is now the large-organization demo and its
> delivery module is tier-gated off.

## Platform super-admin

| Email | Password |
|---|---|
| `waleedhassansfd@gmail.com` | `Waleed@104` |

Approves companies (`PATCH /admin/companies/:id/approve`), verifies payments
(`PATCH /admin/payment-submissions/:id/approve`), and controls the **kill switch**:

```
PATCH /super-admin/companies/:companyId/feature-override
{ "allFeaturesUnlocked": true }        ← bypasses ALL feature gates instantly
{ "companyType": "warehouse" }         ← change a company's tier
{ "inventoryEnabled": true }           ← large-org inventory toggle
```
DB fallback (no deploy needed): `UPDATE companies SET all_features_unlocked = true WHERE id = '<companyId>';`
Global env fallback: set `FEATURES_DISABLED=true` on the server.
