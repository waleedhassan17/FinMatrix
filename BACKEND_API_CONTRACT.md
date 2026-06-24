# FinMatrix — BACKEND_API_CONTRACT.md

Base URL: `https://finmatrix-api-prod-665c6b5cb6a1.herokuapp.com/api/v1`
(frontend `src/network/apiHelpers.ts`).

**Conventions**
- Auth: `Authorization: Bearer <accessToken>` (global `JwtAuthGuard`). Tenant: `x-company-id` header, derived server-side; client-sent `companyId` in bodies is ignored.
- Envelope: most endpoints return `{ success, data }`. **Exception:** the reports controller uses `@Res()` and returns **raw JSON** (no envelope).
- Roles: financial controllers enforce `RolesGuard` + `@Roles('admin'|'staff')`; a `delivery` token is rejected (403). Verified: accounts, invoices, payments, bills, bill-payments, journal-entries, purchase-orders, credit-memos, vendor-credits, tax, inventory, reports.
- Idempotency: any `POST` may send `Idempotency-Key`; a retry returns the original response (no double-post).
- Money: strings, fixed 4-dp decimal end to end.

## Endpoints (✅ = implemented & contract-verified)

**Accounts** ✅ `GET /accounts` (→ `{accounts,summary}`), `GET /accounts/:id` (→ `{account,recentEntries}`), `GET /accounts/:id/transactions`, `POST /accounts` (opening balance auto-offsets to 3900), `PATCH /accounts/:id`, `PATCH /accounts/:id/toggle`

**Customers** ✅ `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id`, `GET /customers/:id/invoices|payments|statement`
**Vendors** ✅ `GET/POST /vendors`, `GET/PATCH/DELETE /vendors/:id`, `GET /vendors/:id/bills|payments`
**Inventory** ✅ `GET/POST /inventory/items`, `GET/PATCH /inventory/items/:id`, `GET /inventory/items/:id/movements`, `POST /inventory/items/:id/adjust` (posts JE), `POST /inventory/physical-counts` (reconciles + posts), `POST /inventory/transfers` (no P&L)
**Invoices** ✅ `GET/POST /invoices` (lines accept optional `itemId` → COGS), `GET/PATCH/DELETE /invoices/:id`, `POST /invoices/:id/send`, `POST /invoices/:id/void` (reversing + restock), `GET /invoices/:id/pdf`
**Payments** ✅ `GET/POST /payments` (`applications[]` or FIFO), `GET /payments/:id`, `GET /payments/customer/:id/outstanding`
**Bills** ✅ `GET/POST /bills`, `GET/PATCH/DELETE /bills/:id`, `GET /bills/:id/payments`, `POST /bills/pay`
**Purchase Orders** ✅ `GET/POST /purchase-orders`, `GET/PATCH/DELETE /purchase-orders/:id`, `POST /:id/receive` (→ Inventory/GRNI), `POST /:id/create-bill` (`defaultAccountId` optional; clears GRNI)
**Estimates / Sales Orders** ✅ create/convert/fulfill/cancel (non-posting until invoiced)
**Credit Memos** ✅ `GET/POST /credit-memos`, `GET/DELETE /credit-memos/:id`, `POST /:id/apply|refund|void`
**Vendor Credits** ✅ `GET/POST /vendor-credits`, `GET/DELETE /vendor-credits/:id`, `POST /:id/apply|void`
**Journal** ✅ `GET/POST /journal-entries`, `GET /journal-entries/:id`, `POST /:id/post|void`
**Taxes** ✅ `GET/POST /taxes/rates`, `PATCH/DELETE /taxes/rates/:id`, `GET /taxes/liability`, `POST /taxes/payments` (posts JE)
**Budgets** ✅ `GET/POST /budgets`, `GET/PATCH/DELETE /budgets/:id`, `GET /budgets/:id/vs-actual`
**Payroll** ✅ `GET/POST /payroll/runs`, `GET/DELETE /payroll/runs/:id`, `POST /:id/process`, `GET/POST /employees`, `GET/PATCH/DELETE /employees/:id`

**Reports** ✅ (raw JSON, ledger-derived where financial)
- `GET /reports/dashboard` → includes `setup` (first-run checklist signals) + KPIs
- `GET /reports/trial-balance` → `{rows[],totalDebits,totalCredits,isBalanced}` — **from the GL**
- `GET /reports/balance-sheet` → `{assets[],liabilities[],equity[],totals,isBalanced}` — **from the GL**
- `GET /reports/profit-loss` → `{revenue,cogs,grossProfit,expenses,netIncome}` — **from the GL**
- `GET /reports/ar-aging`, `/ap-aging`, `/inventory-valuation`, `/cash-flow` (sub-ledger/document-derived, consistent)
- `GET /ledger`, `/ledger/accounts` (General Ledger drill-down)

**Companies / Settings** ✅ `POST /companies`, `POST /companies/join`, `GET/PATCH /companies/:id` (`setupCompleted`, `booksLockedUntil`), members; settings.
**Deliveries / Delivery Personnel / Inventory Approvals / Shadow / Agencies** ✅ as Appendix A.
**Auth / Super-Admin** ✅ signin/refresh/verify/forgot, super-admin console.

## Known follow-ups
- Credit-memo return-to-inventory needs `itemId` on credit-memo lines (AR/revenue side correct today).
- Operational controllers (deliveries/agencies/settings/inventory-approvals/shadow-inventory) have `@Roles` not yet backed by `RolesGuard` — not the financial surface; needs per-endpoint review.
