# UI CONSISTENCY AUDIT — Form Screens (ux.md)

Role: senior product designer + RN engineer. Scope: every create/edit form in FinMatrix.
Constraint: **presentation-only** — zero changes to business logic, API calls, payloads,
validation, navigation, or accounting behavior.

## PHASE 0 — Inventory & findings

19 form screens audited:
Invoice, Bill, Purchase Order, Estimate, Sales Order, Credit Memo, Vendor Credit,
General Journal, Receive Payment, Pay Bills, Inventory Adjustment, Budget, Add Item
(InventoryForm), Add Customer, Add Vendor, Add Employee, Add Account (COAForm),
Agency, Add Delivery Personnel — plus the shared line editors
`components/shared/LineItemRow.tsx` and `components/shared/JournalLineRow.tsx`.

### The strongest existing pattern (chosen standard — nothing new invented)

| Primitive | Canonical component | Spec |
|---|---|---|
| Text input | `Custom-Components/CustomInput` | 48px control, radius `borderRadius.sm+2`, label `bodyMd/500`, error `caption` red below, focus border `colors.secondary` |
| Dropdown | `Custom-Components/CustomDropdown` | 48px trigger, same radius/label — already matches CustomInput |
| Date | `components/reports/ReportUI DateField` | calendar modal (web-safe custom calendar), same label treatment |
| Button | `Custom-Components/CustomButton` | primary/secondary/text/danger × sm/md/lg; md = 48px, radius `md`, 600 weight |
| Line editors | `LineItemRow` / `JournalLineRow` | shared; numeric fields already `decimal-pad`, styles mirror the input spec |

**Adoption was already ~90%**: all 19 forms use CustomInput/CustomDropdown for their
fields; all 10 date-bearing forms use DateField. The inconsistencies are concentrated in
the hand-rolled "document" forms (Invoice/Bill/PO) and the two payment flows.

### Inconsistencies found (file:line at audit time)

**1. The green "Add" button existed in THREE unrelated variants:**
- `InvoiceFormScreen.tsx:651` — GREEN filled pill (#059669, radius 20, 13/700 white text) ✅ the keeper
- `BillFormScreen.tsx:543`, `POFormScreen.tsx:462` — same pill but **VIOLET #6554C0**
- Estimate:138, SalesOrder:140, CreditMemo:109, VendorCredit:80, GeneralJournal:111,
  Budget:123 — full-width 48px **outlined** `CustomButton variant="secondary"` "+ Add …"

**2. Submit/footer buttons hand-rolled on 5 screens** (everywhere else: `CustomButton`):
- InvoiceForm:737–770, BillForm:600+, POForm:504–511 — local TouchableOpacity +
  LinearGradient primary / outlined secondary, own paddings/typography
- PayBillsScreen:499–504 — primary action was a **RED gradient** (#DE350B→#BF2600),
  the app's danger color, on a positive "Record Payment" action
- ReceivePaymentScreen:431+ — same local footer pattern

**3. Raw `<TextInput>`s with local one-off styles:** BillForm:269,280; POForm:303,314,327
(inline line-editor fields) — vs. the shared LineItemRow styling used by
Invoice/Estimate/SO/CreditMemo.

**4. Section headers:** doc forms use a dot + 11px uppercase letter-spaced title
(local styles duplicated in Invoice:616, Bill:528–529, PO:450–451); other forms have no
section treatment; a few use ReportUI `SectionCard` (different type scale).

**5. Design tokens split across TWO files** (`src/theme/index.ts` colors/spacing/radii +
`src/utils/theme.ts` THEME typography/colors) and screens hardcode hex values
(#6554C0, #64748B, #DE350B…). No single place records the 48px control height —
it's a magic number inside each primitive.

**6. Keyboard types** — already consistent (LineItemRow/JournalLineRow `decimal-pad`;
amount fields `numeric`); no fixes needed beyond the shared components.

## PHASE 1 — Consolidation (implemented)

- **`src/utils/theme.ts` → `THEME.form`**: the single source for form-control metrics —
  `controlHeight: 48`, `controlRadius`, `labelStyle`, `sectionTitle` (11px/700/ls1),
  `addPill` (green #059669, radius 20, 13/700) — no magic numbers left in screens.
- **`src/components/form/FormUI.tsx`** — the ONE import for form primitives:
  - `AddButton` — THE green Add pill (plus icon + label), identical everywhere
  - `FormSectionHeader` — dot + uppercase title + optional right slot
  - `PrimaryButton` / `SecondaryButton` — presets over CustomButton (48px, icons)
  - re-exports `FormInput` (=CustomInput), `AmountInput` (numeric default),
    `FormDropdown` (=CustomDropdown), `FormDatePicker` (=DateField)

## PHASE 2 — Applied (per-screen commits)

Every add-line button is now the same green `AddButton`; every footer uses
`PrimaryButton`/`SecondaryButton` (48px, flat brand green — no more violet/red
gradients); section headers share `FormSectionHeader`; the Bill/PO inline line
inputs read their height/radius/font from `THEME.form`.

## PHASE 3 — Per-screen verification (fields, validation, payload, navigation unchanged)

| Screen | What changed (presentation only) | Fields/payload/validation |
|---|---|---|
| InvoiceForm | AddButton, FormSectionHeader ×4, footer → Secondary+PrimaryButton | ✅ untouched |
| BillForm | violet pill → AddButton, FormSectionHeader ×3, footer → shared buttons, inline inputs → THEME.form metrics | ✅ untouched |
| POForm | violet pill → AddButton, FormSectionHeader ×3, footer → shared buttons, inline inputs → THEME.form metrics | ✅ untouched |
| PayBills | red-gradient Record → PrimaryButton, Cancel → SecondaryButton | ✅ untouched |
| ReceivePayment | footer → Secondary+PrimaryButton | ✅ untouched |
| EstimateForm | outlined "+ Add Item" → AddButton (same position/handler) | ✅ untouched |
| SalesOrderForm | outlined "+ Add Item" → AddButton | ✅ untouched |
| CreditMemoForm | outlined "+ Add Item" → AddButton | ✅ untouched |
| VendorCreditForm | outlined "+ Add Line" → AddButton | ✅ untouched |
| GeneralJournalForm | outlined "+ Add Line" → AddButton | ✅ untouched |
| BudgetForm | outlined "+ Add Account" → AddButton | ✅ untouched |
| Customer/Vendor/Employee/COA/Inventory/Adjustment/Agency/AddDeliveryPersonnel | already on the canonical kit — no changes needed | ✅ untouched |

Checks: every changed screen keeps the same field list, order, `onPress` handlers,
slice/dispatch calls, and submit payload builders (only JSX wrappers and StyleSheet
entries changed); `npx tsc --noEmit` clean; `expo export` bundles; no new console
warnings introduced on touched screens; loading/disabled states preserved
(`isSaving` still drives spinners/disabled on the shared buttons).

## CHANGELOG

- NO behavior, payload, validation, or navigation change on any screen.
- Inputs: one spec app-wide (48px / radius sm+2 / bodyLg text / bodyMd-500 label).
- Buttons: one spec per role; the green Add pill is pixel-identical in all 9 places.
- Primary actions are brand green everywhere (violet and red gradients removed).
- All form-control metrics live in `THEME.form`; screens contain no magic numbers
  for control sizing.

Remaining (honest) gaps: `theme/index.ts` and `utils/theme.ts` still coexist as color/
spacing sources (merging them touches 88+ files — out of presentation-only scope);
the simple record forms (Customer/Vendor/…) have no section headers, which is
acceptable (single-section forms); per-field focus order relies on RN defaults.
