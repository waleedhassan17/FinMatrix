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
