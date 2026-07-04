ROLE: Act as a senior full-stack engineer + QA lead shipping to production. You are working across two
repos: FinMatrix (React Native + Expo, Redux Toolkit) and FinMatrix-Backend (NestJS + TypeORM +
PostgreSQL, deployed on Heroku with Cloudinary for file storage).

MISSION: CHUNK 1 of 2 — take the NON-LEDGER operational surface to FULLY PRODUCTION-READY: every "More"
section screen, Customer/Vendor RECORD management, and the COMPLETE DELIVERY module (admin + personnel
portal + inventory-approval loop). After this prompt runs and its acceptance passes, this entire surface
must be deployable to real warehouse users with zero dead ends, zero mock data, and no known defects.
Do NOT implement or modify any posting/journal/report logic — that is Chunk 2. Where delivery approval
must eventually commit stock/ledger, leave a clearly marked `// CHUNK2: commit stock on approval`
integration point and do not post inventory movements now.

THIS IS PRODUCTION SOFTWARE FOR A WAREHOUSE IN CONTINUOUS DAILY USE. Treat every screen as something a
real user will hit repeatedly under real conditions (flaky network, concurrent users, large lists).

================================ ABSOLUTE DEFINITION OF "PRODUCTION READY" ================================
A feature is NOT done until ALL of these are true. This applies to every screen and endpoint you touch:
1. FUNCTIONAL: every button, field, and navigation path works end to end against real endpoints. No dead
   ends, no placeholder screens, no TODO stubs, no "coming soon" on shipped features.
2. NO MOCK DATA anywhere in shipped paths. All data comes from real backend endpoints. Remove every
   hardcoded/sample array. Grep for and eliminate mock/fixture usage in production screens.
3. STATES: every list and form handles loading, empty, error, and success states explicitly. Lists have
   pull-to-refresh and pagination where data can grow. No infinite spinners; every failure shows a
   retryable, human-readable message.
4. VALIDATION: enforced on the SERVER (client validation is convenience only). Bad input returns a clear
   4xx with a message the UI surfaces; it never 500s and never corrupts data.
5. SECURITY: companyId and role derived from the JWT server-side, NEVER trusted from the client. Every
   endpoint is tenant-scoped and role-guarded on the backend. Cross-tenant and cross-role access is
   impossible (add tests proving it).
6. ERRORS: no unhandled promise rejections; no raw stack traces to users; all errors logged (Sentry or
   equivalent) with enough context to debug. Network failures degrade gracefully.
7. TYPES: `npx tsc --noEmit` passes clean in BOTH repos. No new `any`. No `@ts-ignore` without a written
   reason. No console errors/warnings on the touched screens.
8. FILES: all uploads go to Cloudinary with ACCESS-CONTROLLED (signed/authenticated) delivery — NEVER the
   Heroku local filesystem (it is ephemeral and wipes on restart/deploy). Store only the reference in
   Postgres. Validate type + size server-side.
9. PERFORMANCE: list endpoints are paginated and indexed; no N+1 queries; screens remain responsive with
   1,000+ records. Images use caching (expo-image or equivalent).
10. TESTS: automated tests for the critical paths exist and pass in CI. Existing test/acceptance.ts stays
    green (you must not affect accounting).

FORBIDDEN (automatic fail if present in shipped code): mock/sample data in production screens; writing
uploads to local disk; trusting client-sent companyId/role; unhandled errors; new `any` types; dead
buttons; screens unreachable from navigation; deleting any user/business data to enforce a rule.

================================ PHASE 0 — AUDIT (produce CHUNK1_AUDIT.md, then STOP) ================================
Do not change code yet. Deliver a report:
- Every More-stack screen + its wiring state: ✅ works / ⚠️ partial / ❌ broken, with the exact missing
  endpoint or broken action for each ⚠️/❌.
- Every Customer/Vendor record screen and its state.
- Every Delivery screen (admin create/assign/monitor, personnel portal status machine, inventory
  approvals) and its state.
- Where uploads currently write (flag any local-disk usage as a production defect to fix).
- Any mock/hardcoded data in these screens (list file + line).
- Current pagination/index status of the list endpoints involved.
Then propose the phase order and proceed only after the report is complete.

================================ PHASE A — MORE SECTIONS & RECORDS (to production bar) ================================
Bring every More-stack screen to the Definition-of-Production-Ready above: Customers, Vendors, Chart of
Accounts (record CRUD only — NO posting), Settings/Company Profile, Tax settings (rate config only),
Delivery management entry, Inventory Approvals entry, and any others the audit finds.
- Customer/Vendor: full CRUD, payment terms, credit limit, addresses (customer shipping geocoded),
  running-balance DISPLAY (read-only in this chunk), searchable + paginated lists.
- Zero orphan screens, zero dead thunks/endpoints. Wire real features into navigation; never delete a
  feature to "fix" it.
ACCEPTANCE A:
- [ ] Every More screen loads real data, every action works, all four states present, lists paginated +
      refreshable.
- [ ] Server-side validation on all writes; bad input handled cleanly.
- [ ] No mock data, no dead buttons, no orphan screens remain (prove via the audit re-check).

================================ PHASE B — DELIVERY MODULE: FULLY PRODUCTION-READY ================================
The delivery module must be robust enough for real riders and dispatchers using it all day. Deliver ALL:

Admin side:
- Create delivery (geocode the customer shipping address; handle geocode failure gracefully with a manual
  fallback). Assign and auto-assign to personnel. Live monitor: map pins, routes, ~30s refresh that does
  not leak timers or drain battery (clean up intervals on unmount). Track an individual rider.

Delivery-personnel portal (production-hardened):
- Status machine enforced SERVER-SIDE and idempotent: pending → picked_up → in_transit → arrived →
  bill-photo → customer-confirm → delivered. Illegal transitions are rejected. A retried/double-tapped
  status update cannot advance twice or corrupt state.
- Turn-by-turn navigation to the geocoded point.
- Proof-of-delivery photo: uploaded to Cloudinary, access-controlled (only owner company + admin can
  view), type/size validated, reference stored in Postgres. Must survive a backend restart/deploy (proves
  it is NOT on local disk).
- Offline/poor-network resilience: a status update or photo upload attempted on a bad connection must
  queue/retry or fail with a clear, non-destructive, retryable message — never silently lose a delivery
  update.
- Location updates: efficient, permissioned ("allow all the time" flow handled), and they stop when the
  rider is off-shift/unavailable (no needless battery/data drain).

Delivery-personnel management (plan-gated, server-enforced):
- Create/manage rider credentials. ENFORCE the plan limit on the SERVER: Free = 1 personnel, paid = 3.
  Creating beyond the limit returns a clear "upgrade your plan to add more delivery personnel" error; the
  UI shows "X of LIMIT used" from a real endpoint.
- On downgrade/lapse to a lower limit: do NOT delete extra personnel or their data — block creating new
  ones until within the limit. Document this behavior.
- Password reset / deactivate-rider flows work and are audited.

Inventory-approval loop:
- Delivered quantities enter the approval queue; admin approve/reject with real endpoints and live list
  updates. Wire the queue and actions fully, but leave the STOCK/LEDGER commit as the marked
  `// CHUNK2: commit stock on approval` integration point (do not post inventory movements in this chunk).

Role isolation (prove it):
- A delivery-personnel token is REJECTED (403) by every admin and financial endpoint, server-side. Add a
  test that asserts this.

ACCEPTANCE B (delivery must pass ALL):
- [ ] Admin can create → assign/auto-assign → monitor a delivery live; timers clean up; geocode failure
      has a fallback.
- [ ] Rider advances the full status machine; illegal/duplicate transitions rejected server-side; POD
      photo stored on Cloudinary, access-controlled, and survives a backend redeploy.
- [ ] Bad-network status update / photo upload retries or fails safely — never loses data.
- [ ] Personnel limit enforced server-side (Free 1 / paid 3) with upgrade prompt and live "X of LIMIT
      used"; downgrade deletes nothing.
- [ ] Inventory-approval queue + approve/reject work; stock-commit integration point clearly marked for
      Chunk 2.
- [ ] Delivery token gets 403 on all admin/financial endpoints (test included).

================================ PHASE C — PRODUCTION HARDENING (mandatory, whole chunk) ================================
- Remove ALL mock data and dead code from touched screens (grep and list what was removed).
- Confirm NO upload path writes to local disk anywhere; all on Cloudinary, access-controlled.
- Add pagination + DB indexes for every list endpoint in scope; eliminate N+1 queries (verify with query
  logs).
- Wire error monitoring (Sentry) on both API and app for the touched surface; verify a thrown test error
  is captured.
- Ensure all touched endpoints are tenant-scoped + role-guarded server-side, with tests for cross-tenant
  and cross-role denial.
- Verify the app handles token expiry/refresh gracefully on these screens (no silent logout mid-task).
- Confirm `npx tsc --noEmit` clean both repos; backend `npm run build` succeeds; no console warnings on
  touched screens.

================================ VERIFICATION & DELIVERABLES ================================
- Run a full manual UAT pass of Chunk 1 on staging as a real user (admin + rider) and report results
  against every acceptance box above.
- `npx tsc --noEmit` clean in both repos; backend builds; existing test/acceptance.ts still green (you did
  not touch accounting).
- New automated tests: delivery status-machine idempotency + illegal-transition rejection; personnel-limit
  enforcement; Cloudinary upload + access control; cross-tenant/cross-role denial; list pagination.
Deliver: CHUNK1_AUDIT.md, small reviewable commits per phase, a CHANGELOG, and a filled-in PRODUCTION
READINESS CHECKLIST mapping every Definition-of-Production-Ready item (1–10) and every acceptance box to
where it was satisfied. Explicitly confirm: no mock data, no local-disk uploads, delivery module
production-hardened, and Chunk 2 accounting untouched.