// Cut the network chain at its root, as the other slice tests do: importing a
// list slice reaches its network module AND its serializer, both of which land
// on apiHelpers → axios, expo-constants and AsyncStorage, none of which a
// selector test needs.
jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));
// billNetwork imports this one directly for receipt uploads, and it ships
// untranspiled ESM. Same stub payBills.test.ts uses.
jest.mock('expo-file-system/legacy', () => ({}));

import { invoiceListSlice, selectInvoicePaging } from '../../screens/Invoices/InvoiceList/invoiceListSlice';
import { billListSlice, selectBillPaging } from '../../screens/Bills/BillList/billListSlice';
import { payBillsSlice, selectPayBillProof } from '../../screens/Bills/PayBills/payBillsSlice';
// From the pure module, not ReportUI: the component file pulls in the whole
// React Native UI tree, which a predicate test has no use for.
import { refreshingOverContent } from '../../components/reports/reportFormat';

/**
 * A selector that builds an object must return the SAME object when nothing it
 * reads has changed.
 *
 * `useSelector` compares by reference, so one that assembles `{ page,
 * totalPages }` inline returns a fresh object every call and re-renders its
 * screen on every store action anywhere in the app — a keystroke in an
 * unrelated form, a background refresh, anything. React-Redux notices and logs
 * a warning per render, which is how these were found.
 *
 * Reference equality is the whole contract, so that is what these assert. A
 * value-equality check (`toEqual`) would pass on the broken version and prove
 * nothing.
 */
describe('memoized selectors return stable references', () => {
  it('selectInvoicePaging', () => {
    const state = { invoiceList: invoiceListSlice.getInitialState() };

    expect(selectInvoicePaging(state)).toBe(selectInvoicePaging(state));

    // …and a genuine change still produces a new one.
    const moved = {
      invoiceList: { ...state.invoiceList, page: state.invoiceList.page + 1 },
    };
    expect(selectInvoicePaging(moved)).not.toBe(selectInvoicePaging(state));
    expect(selectInvoicePaging(moved).page).toBe(state.invoiceList.page + 1);
  });

  it('selectBillPaging', () => {
    const state = { billList: billListSlice.getInitialState() };

    expect(selectBillPaging(state)).toBe(selectBillPaging(state));

    const moved = { billList: { ...state.billList, totalPages: 7 } };
    expect(selectBillPaging(moved)).not.toBe(selectBillPaging(state));
    expect(selectBillPaging(moved).totalPages).toBe(7);
  });

  it('selectPayBillProof', () => {
    const state = { payBills: payBillsSlice.getInitialState() };

    expect(selectPayBillProof(state)).toBe(selectPayBillProof(state));

    const uploaded = {
      payBills: { ...state.payBills, proofName: 'receipt.jpg' },
    };
    expect(selectPayBillProof(uploaded)).not.toBe(selectPayBillProof(state));
    expect(selectPayBillProof(uploaded).name).toBe('receipt.jpg');
  });

  it('an unrelated change does not mint a new reference', () => {
    // The actual failure mode: something elsewhere in the slice moves and the
    // screen re-renders anyway because the selector rebuilt its object.
    const state = { billList: billListSlice.getInitialState() };
    const first = selectBillPaging(state);
    const noisy = { billList: { ...state.billList, searchQuery: 'anything' } };
    expect(selectBillPaging(noisy)).toBe(first);
  });
});

/**
 * The list screens pair a RefreshControl with a LoadingBlock. Both used to read
 * the same `isLoading` flag, so a cold load drew two overlapping spinners.
 * These two states must be mutually exclusive.
 */
describe('refreshingOverContent', () => {
  it('leaves the empty first load to the LoadingBlock', () => {
    expect(refreshingOverContent(true, 0)).toBe(false);
  });

  it('spins while refreshing rows that are already on screen', () => {
    expect(refreshingOverContent(true, 5)).toBe(true);
  });

  it('is off when nothing is in flight', () => {
    expect(refreshingOverContent(false, 0)).toBe(false);
    expect(refreshingOverContent(false, 5)).toBe(false);
  });

  it('is never true at the same time as the LoadingBlock', () => {
    // The LoadingBlock's condition, verbatim from the screens.
    const loadingBlockShows = (isLoading: boolean, count: number) =>
      isLoading && count === 0;

    for (const isLoading of [true, false]) {
      for (const count of [0, 1, 25]) {
        expect(
          refreshingOverContent(isLoading, count) && loadingBlockShows(isLoading, count),
        ).toBe(false);
      }
    }
  });
});
