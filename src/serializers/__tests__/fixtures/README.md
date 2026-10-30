# Reports v2 fixtures

JSON responses the reports v2 serializer tests read. Each file's `_source` key says where it came
from, and the serializers ignore that key.

## Hand-written (this folder)

These are shaped to the response interfaces in FinMatrix-Backend
`src/modules/reports/reports.types.ts` and `docs/reports-api-v2.md`. Each pins an edge case with
known figures: a synthetic equity line, a flagged trial-balance row, a split cash payment, an
over-limit customer, an unvalued item. The `*Serializer.test.ts` files read them.

## Captured (`captured/`)

These are real responses from the local v2 API, saved by
`scripts/capture-report-fixtures.js`. That script sends GET requests only, after sign-in, and
refuses any non-local URL. Each file has the shape
`{ _source, _status, response }`. `reportsV2Captured.test.ts` runs every app serializer and
model over them and checks the server's identities as the app reads them: A = L + E, debits =
credits in every trial-balance mode, cash-flow sections = net change, Σ schedule = open total,
register closing = last running balance.

- **Current capture:** 2026-10-27, company **MetroMatrix** (`metromatrix@gmail.com`), against
  the FinMatrix-Backend working tree — with KPI assessments, analytics insights and shares, the
  cash flow's `monthly[]` and the aging assessments.
- **Why not Warehouse Co:** its subscription has lapsed in the local database, so every report
  answers `403 COMPANY_NOT_ACTIVE`.
- **To re-capture** (the local API must be running):
  ```
  CAPTURE_PASSWORD=<local demo password> node scripts/capture-report-fixtures.js src/serializers/__tests__/fixtures/captured metromatrix@gmail.com
  ```

The web can use the same captured files for its parity checks.
