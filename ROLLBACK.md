# ROLLBACK POINTS — three-tier deploy (2026-07-08)

Everything needed to return to the exact pre-tiering state if anything misbehaves.

## Pre-deploy state (the "known good" you can return to)

| What | Value |
|---|---|
| Backend — last commit BEFORE tiering | `2440297` ("delivery E2E acceptance: phase2.md scenarios in every build") |
| Backend — tiering commits being deployed | `adc7dc1` (Phase 1) → `c925855` (Phase 4) → `2cccafa` (Phase 5) |
| Frontend — last commit BEFORE tiering | `0906910` ("CreateDelivery: whole-number quantity guard") |
| Frontend — tiering commits being pushed | `cadf098` → `6bf69cb` → `fcced2a` → `1b775e6` |
| Heroku app | `finmatrix-api-prod` |
| **Heroku release BEFORE this deploy** | **v56** |
| Heroku release AFTER this deploy | **v57** (commit `2cccafa`) — verified live: schema applied, demo seed ALL TIES HOLD, tiering acceptance **80/80 against prod** |
| Follow-up release | **v61** (BE `7d0adef`, FE `e0c638c`) — Sign Out (signout.md): access tokens gain a `jti`, `POST /auth/logout` (+ `/auth/signout` alias, now public/idempotent) revokes refresh tokens AND denylists the access jti in new additive table `revoked_access_tokens` (migration `1783760000000`, ran at boot via DB_MIGRATIONS_RUN); JwtStrategy 401s denylisted tokens. App: Sign Out on all three Settings screens + full Redux store reset. Roll back with `heroku rollback v60` — old code ignores the extra table; optionally `DROP TABLE revoked_access_tokens` + `DELETE FROM migrations WHERE name='RevokedAccessTokens1783760000000'`. Verified live post-deploy: signin→logout→old access 401, old refresh 401, repeat logout 200. Local pre-deploy: unit 46/46, signout acceptance 25/25 (all three roles). |
| Follow-up release | **v60** (BE `aeb0bbc`, FE `b109a4a`) — PDF payslips (payslip.md): new read-only endpoint `GET /payroll/runs/:runId/payslip/:employeeId/pdf` + app view/download/share; payroll calc/JE unchanged, NO schema change — roll back with `heroku rollback v59`. Verified live: health 200, route auth-guarded (401). Pre-deploy: five-features 49/49, payslip smoke 23/23. |
| Follow-up release | **v59** (BE `ddb01d0`, FE `f3f9942`) — phase3 four-feature hardening (payroll idempotency, budget months+prefill, bank-rec guards+report, bank-rec all-tier). Backup **`b002`** taken before deploy; NO schema change — roll back with `heroku rollback v58`. |
| Follow-up release | **v58** (BE `8051b3a`, FE `e03c896`) — super-admin plans now serve the six tier plans from PLAN_CONFIG (verified live: 6 plans, edit → 400 PLANS_CONFIG_DEFINED). Roll back this one alone with `heroku rollback v57`. |
| Prod DB backup (pre-migration, VERIFIED) | **`b001`** — captured 2026-07-08 16:14 UTC, Completed, 326 KB |

## How to roll back

**Fastest (server code only, seconds, no git):**
```bash
heroku rollback v56 -a finmatrix-api-prod
```
The tiering DB columns are additive and harmless to old code — v56 simply ignores them.

**Instant feature un-gating WITHOUT any rollback** (if gating misbehaves but you want to stay
on the new release): flip the kill switch —
```bash
heroku config:set FEATURES_DISABLED=true -a finmatrix-api-prod        # global, all companies
# or per company:
heroku pg:psql -a finmatrix-api-prod -c "UPDATE companies SET all_features_unlocked=true WHERE id='<companyId>';"
```

**Full git rollback (backend):**
```bash
cd FinMatrix-Backend/FinMatrix-Backend
git revert --no-edit 2cccafa c925855 adc7dc1     # keeps history
# or hard: git reset --hard 2440297 && git push origin main --force-with-lease
git push heroku main
```

**Full git rollback (frontend):**
```bash
cd FinMatrix
git revert --no-edit 1b775e6 fcced2a 6bf69cb cadf098
# or hard: git reset --hard 0906910 && git push origin main --force-with-lease
git push origin main
```

**Schema rollback (only if you truly want the columns gone — not required):**
```bash
heroku pg:psql -a finmatrix-api-prod <<'SQL'
ALTER TABLE companies DROP COLUMN IF EXISTS all_features_unlocked;
ALTER TABLE companies DROP COLUMN IF EXISTS inventory_enabled;
ALTER TABLE companies DROP COLUMN IF EXISTS company_type;
DELETE FROM migrations WHERE name = 'CompanyTiering1783750000000';
SQL
```
(The widened varchar(32) plan columns are left widened on purpose — narrowing could truncate data.)

**Demo-data rollback:** the tier-demos seed rewrites ONLY Sukoon / MetroMatrix / Warehouse Co.
To restore the pre-deploy MetroMatrix books exactly, restore the backup taken above:
```bash
heroku pg:backups -a finmatrix-api-prod            # find the backup id (bNNN)
heroku pg:backups:restore bNNN DATABASE_URL -a finmatrix-api-prod --confirm finmatrix-api-prod
```
⚠️ restore replaces the WHOLE database with the snapshot — use only if the demo data matters
more than anything written after the deploy.
