Extend FinMatrix (React Native + Expo) and FinMatrix-Backend (NestJS + TypeORM + PostgreSQL) with a
professional subscription lifecycle covering THREE flows, plan-based feature gating for delivery
personnel, and full accounting access on all plans. Reuse the EXISTING manual bank-transfer flow (bill +
platform bank details + screenshot upload + super-admin approval). CRITICAL: expiry never deletes company
data — it only blocks login until renewed. Audit first, implement in phases, commit per phase.

EXISTING PLATFORM BANK ACCOUNT (already configured; reuse): Muhammad Waleed Hassan / Allied Bank / IBAN.

PLANS
- Free — no expiry. Delivery personnel limit = 1. Full accounting features.
- Standard — Rs 1,000/month for 6 months. Delivery personnel limit = 3. Full accounting features.
- Pro — Rs 2,000 for 3 months. Delivery personnel limit = 3. Full accounting features.
All accounting features (invoicing, bills, POs, inventory, reports, journal, tax, payroll, etc.) are FULLY
available on EVERY plan including Free. The ONLY plan difference right now is the delivery-personnel limit.

CORE MODEL — keep two concepts separate (do not conflate):
- accountStatus: 'pending' | 'active' | 'inactive' | 'rejected'   (can the user log in / use the app?)
- subscriptionStatus: 'active' | 'expiring' | 'expired'           (is the plan current?)
Deactivation = accountStatus 'inactive' + login blocked. It NEVER deletes/archives/purges any company,
ledger, invoice, inventory, delivery, or user data. Renewal/upgrade restores access to the exact same data.

PHASE 0 — AUDIT (produce SUBSCRIPTION_AUDIT.md, then STOP for review)
Report: current account/subscription fields; the existing signup payment flow (submit->review->approve);
the company Settings screen; the delivery-personnel create/manage screens + endpoints; and any
notification mechanism. Confirm what exists so we reuse, not duplicate. Output, then proceed.

PHASE A — BACKEND
1. Fields on company/account (add/confirm): subscriptionPlan ('free'|'standard'|'pro'), subscriptionStatus,
   subscriptionStartDate, subscriptionExpiryDate (nullable; null on Free), accountStatus, paymentStatus,
   lastSubmissionId. Migration included.
2. PLAN CONFIG (single source of truth, server-side): a map of plan -> { priceMinorUnits, durationMonths,
   deliveryPersonnelLimit }. Free={0, null, 1}; Standard={100000, 6, 3}; Pro={200000, 3, 3}. (Amounts in
   minor units; adjust to your currency handling.)
3. On plan APPROVAL (used by ALL three flows): set subscriptionPlan, subscriptionStartDate=now,
   subscriptionExpiryDate = now + durationMonths (null for Free), subscriptionStatus='active',
   paymentStatus='paid', accountStatus='active'. For RENEWAL/UPGRADE of an account that already had a paid
   plan, extend expiry from the later of (now, current expiry) so early action loses no paid days. Record
   ONE platform_revenue row keyed by submissionId (idempotent).
4. DELIVERY-PERSONNEL LIMIT ENFORCEMENT (server-side, authoritative):
   - When creating a delivery-personnel account, reject with a clear error if the company already has
     >= deliveryPersonnelLimit active personnel for its current plan (Free=1, paid=3).
   - Expose GET /billing/plan-limits (auth) returning the current plan, deliveryPersonnelLimit, and current
     personnel count so the UI can show "1 of 1 used / upgrade for more".
   - If a company DOWNGRADES or lapses to Free while having >1 personnel: do NOT delete extras — keep their
     data, but block creating new ones until they're within the limit (document this behavior).
5. Scheduled @Cron (daily, idempotent):
   - Paid plans within 10 days before expiry: subscriptionStatus='expiring' + create ONE reminder
     notification PER DAY (no duplicate for the same day) with days remaining.
   - On/after expiry if not renewed: subscriptionStatus='expired', accountStatus='inactive' (login blocked).
     DO NOT touch business data. Create an "account deactivated — renew to restore" notification.
   - Free plans skipped.
6. RENEWAL/UPGRADE endpoints (reuse the manual-payment flow):
   - GET /billing/bank-details?plan=... -> bill (plan, amountDue from PLAN CONFIG) + platform bank account.
   - POST /billing/submit (multipart screenshot, plan) -> create payment_submission tagged NEW | RENEWAL |
     UPGRADE based on the account's current state; set paymentStatus='submitted'. Amount is server-set from
     PLAN CONFIG (never trust client).
   - Super-admin: GET /admin/payment-submissions[?status], PATCH .../:id/approve (runs step 3),
     PATCH .../:id/reject (reason). Approvals idempotent.
   - IMPORTANT: an 'inactive' (expired) account MUST be allowed to hit the renew endpoints — renewing is the
     one action an inactive account can take.
7. LOGIN/ACCESS GATE (server-enforced, never client-trusted):
   - accountStatus='inactive' -> login returns a state that routes the app to ONLY the Renew screen.
   - accountStatus='active' -> full app.

ACCEPTANCE (A)
- Approval activates plan+account and sets the correct expiry for all three flows; revenue recorded once.
- Free allows creating 1 delivery personnel; the 2nd is rejected with an upgrade message. Paid allows 3.
- 10 days pre-expiry -> 'expiring' + one reminder/day; at expiry -> 'inactive', login blocked, ALL data
  intact (count-before/after test).
- Inactive account CAN submit a renewal; approval restores 'active' + new expiry + same data.
- Early renewal/upgrade extends from current expiry (no lost days). Cron idempotent. Non-super-admin -> 403.

PHASE B — FRONTEND (three flows)
FLOW 1 — Signup + plan (existing): keep as-is (pay -> upload -> admin approves -> account+plan active).

FLOW 2 — Renewal on expiry:
- If accountStatus='inactive', after login show ONLY a "Renew Subscription" screen (no other screens
  reachable): current/last plan, expiry passed, reassurance that data is safe, and the SAME
  bill->bank-details->upload-screenshot flow. After submit: "Awaiting admin verification". On approval the
  user logs back in with data intact and a fresh expiry.

FLOW 3 — Upgrade from Free (or change plan) via Settings:
- Company Administrator SETTINGS screen: a "Subscription" section showing current plan, status, expiry, and
  delivery-personnel usage ("1 of 1 used"). A "Subscribe / Change Plan" button ALWAYS available (including
  on Free) that opens the SAME bill->bank-details->upload-screenshot flow. After admin approval the new plan
  activates. Data is untouched throughout.

Shared:
- Notifications: show daily renew reminders in-app (and push if Expo notifications exist); tapping deep-links
  to the renew flow.
- Delivery-personnel screen: show "X of LIMIT used"; when at the limit, disable "Add" with an "Upgrade your
  plan to add more delivery personnel" prompt (from GET /billing/plan-limits). Do NOT hide/delete existing
  personnel if over-limit after a downgrade.
- Super-admin review screen: label each submission NEW / RENEWAL / UPGRADE; show plan, amount, screenshot,
  Approve/Reject(reason).

ACCEPTANCE (B)
- Flow 2: an expired user sees only the Renew screen, pays+uploads, admin approves, logs back in with all
  invoices/ledger/inventory intact.
- Flow 3: a Free user opens Settings, sees current plan + "1 of 1 delivery personnel used", subscribes a
  paid plan via pay+upload, admin approves -> plan active, can now create up to 3 personnel.
- Free plan blocks a 2nd delivery personnel with an upgrade prompt; paid allows 3.
- All accounting features work identically on every plan.

VERIFY & DELIVER
- `npx tsc --noEmit` clean both repos; backend builds; existing test/acceptance.ts still green (subscription
  revenue stays OUT of company books; accounting engine untouched).
- Tests: three-flow approval sets correct plan/expiry; delivery-personnel limit (1 free / 3 paid) enforced
  server-side; expiry deactivation keeps data (count-before/after); inactive-can-renew; reminder/day
  idempotency; approval-idempotent revenue; downgrade keeps extra personnel data but blocks new; login gate;
  admin role-guard.
- Deliver SUBSCRIPTION_AUDIT.md, small commits per phase, and a CHANGELOG confirming: data never discarded
  on expiry, one reusable pay->upload->admin-approve flow across all three flows, plan-based delivery limits,
  and full accounting access on all plans.