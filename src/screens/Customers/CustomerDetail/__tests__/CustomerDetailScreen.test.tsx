// Every action on a customer goes to the right screen, with this customer.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { customerId: 'c1' } }),
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../../utils/alert', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('../../../../components/shared/messaging/ContactWhatsappRow', () => 'ContactWhatsappRow');
jest.mock('../../../../utils/statementPdf', () => ({ statementSerializer: jest.fn(), shareStatementPdf: jest.fn() }));
jest.mock('../../../../utils/companyInfo', () => ({ useCompanyInfo: () => ({}) }));
jest.mock('../../CustomerList/customerListSlice', () => ({ toggleCustomerActive: jest.fn(), upsertCustomer: jest.fn() }));
jest.mock('../customerDetailSlice', () => ({
  selectCustomerDetailTab: (s: { tab: string }) => s.tab,
  selectCustomerDetail: (s: { customer: unknown }) => s.customer,
  selectCustomerDetailStatus: (s: { status: string }) => s.status,
  selectCustomerDetailError: (): string => '',
  selectCustomerDetailInvoices: (s: { invoices: unknown }) => s.invoices,
  selectCustomerDetailPayments: (s: { payments: unknown }) => s.payments,
  setActiveTab: jest.fn(key => ({ type: 'setActiveTab', key })),
  resetCustomerDetail: jest.fn(() => ({ type: 'reset' })),
  upsertDetailCustomer: jest.fn(),
  fetchCustomerDetail: jest.fn(),
  fetchCustomerInvoices: jest.fn(),
  fetchCustomerPayments: jest.fn(),
}));
let mockState: Record<string, unknown>;
const mockDispatch = jest.fn();
jest.mock('../../../../hooks/useReduxHooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

import React from 'react';
import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import CustomerDetailScreen from '../CustomerDetailScreen';
import { setActiveTab } from '../customerDetailSlice';

const address = { street: 'Mall Road', city: 'Lahore', state: 'Punjab', zipCode: '54000', country: 'Pakistan' };
const customer = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'abc',
  code: 'C-0008',
  email: 'abc@example.com',
  phone: '',
  company: 'abctextile',
  balance: 600,
  totalPurchases: 3900,
  creditLimit: 0,
  paymentTerms: 'net30',
  isActive: true,
  billingAddress: address,
  shippingAddress: address,
  createdAt: '2026-09-09',
  updatedAt: '2026-09-09',
  ...over,
});
const emptyList = { rows: [] as unknown[], status: 'loaded', error: '', page: 1, totalPages: 1 };

const render = (over: Record<string, unknown> = {}) => {
  mockState = { tab: 'overview', customer: customer(), status: 'loaded', invoices: emptyList, payments: emptyList, ...over };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<CustomerDetailScreen />);
  });
  return tree;
};
const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

beforeEach(() => jest.clearAllMocks());

describe('Customer detail', () => {
  it.each([
    ['Create invoice', 'InvoiceForm', { customerId: 'c1' }],
    ['Record payment', 'ReceivePayment', { customerId: 'c1' }],
  ])('%s opens %s for this customer', (title, route, params) => {
    const tree = render();
    act(() => tree.root.findAll(n => n.props.title === title && typeof n.props.onPress === 'function')[0].props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(route, params);
  });

  it.each([
    ['Unpaid invoices', 'PartySummary', { partyType: 'customer', partyId: 'c1', partyName: 'abc' }],
    ['Ledger', 'GeneralLedger', { partyType: 'customer', partyId: 'c1', partyName: 'abc' }],
    ['History', 'PartyHistory', { partyType: 'customer', partyId: 'c1', partyName: 'abc' }],
  ])('%s opens %s for this customer', (label, route, params) => {
    const tree = render();
    act(() => tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0].props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(route, params);
  });

  it('Edit opens the form for this customer', () => {
    const tree = render();
    const edit = tree.root.findAll(n => typeof n.props.onPress === 'function' && n.props.label === 'Edit')[0];
    act(() => edit.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('CustomerForm', { customerId: 'c1' });
  });

  it('keeps the old action labels from coming back in capitals', () => {
    expect(texts(render()).join(' ')).not.toMatch(/SEND STATEMENT|CREATE INVOICE/);
  });

  it('marks only an inactive customer', () => {
    expect(texts(render())).not.toContain('Active');
    expect(texts(render({ customer: customer({ isActive: false }) }))).toContain('Inactive');
  });

  it('says "No limit" rather than a Rs 0.00 credit limit', () => {
    const all = texts(render());
    expect(all).toContain('No limit');
    expect(all).not.toContain('Credit Limit');
  });

  it('shows credit used against a real limit', () => {
    const all = texts(render({
      customer: customer({ creditLimit: 1000, credit: { exposure: 600, advances: 0, available: 400, limited: true, limit: 1000 } }),
    }));
    expect(all).toContain('Credit used');
    expect(all).toContain('60%');
    expect(all).not.toContain('No limit');
  });

  it('offers to apply advances, without recording new cash', () => {
    const tree = render({ customer: customer({ credit: { exposure: 0, advances: 250, available: 0, limited: false, limit: 0 } }) });
    expect(texts(tree)).toContain('Advances held');
    act(() => tree.root.findAll(n => n.props.title === 'Apply to invoices' && typeof n.props.onPress === 'function')[0].props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('ReceivePayment', { customerId: 'c1', useCredits: true });
  });

  it('merges the addresses only when they are the same', () => {
    expect(texts(render())).toContain('Billing and shipping address');
    const all = texts(render({ customer: customer({ shippingAddress: { ...address, street: 'Other Road' } }) }));
    expect(all).toEqual(expect.arrayContaining(['Billing address', 'Shipping address']));
  });

  it('switches tab through the store', () => {
    const tree = render();
    const tab = tree.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith('Invoices, 2 of 3') && typeof n.props.onPress === 'function')[0];
    act(() => tab.props.onPress());
    expect(setActiveTab).toHaveBeenCalledWith('invoices');
  });

  it('lists invoices, and omits the detail line when there is nothing to put on it', () => {
    const tree = render({
      tab: 'invoices',
      invoices: {
        ...emptyList,
        rows: [
          { id: 'i1', invoiceNumber: 'INV-1', date: '2026-09-09', dueDate: '2026-10-09', amount: 500, balance: 200, status: 'partial' },
          { id: 'i2', invoiceNumber: 'INV-2', date: '2026-09-09', dueDate: '', amount: 100, balance: 0, status: 'paid' },
        ],
      },
    });
    const all = texts(tree);
    expect(all).toContain('Due Oct 9, 2026 · Balance Rs 200.00');
    expect(all).toEqual(expect.arrayContaining(['Partial', 'Paid']));
    expect(all.filter(t => t === '')).toHaveLength(0);
    act(() => tree.root.findAll(n => n.props.accessibilityLabel === 'Open INV-1' && typeof n.props.onPress === 'function')[0].props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('InvoiceDetail', { invoiceId: 'i1' });
  });

  it('lists payments', () => {
    const all = texts(render({
      tab: 'payments',
      payments: { ...emptyList, rows: [{ id: 'p1', reference: 'PAY-1', date: '2026-09-09', amount: 500, method: 'Cash', applied: ['INV-1: Rs 500.00'] }] },
    }));
    expect(all).toEqual(expect.arrayContaining(['PAY-1', 'Rs 500.00', 'Method: Cash', 'INV-1: Rs 500.00']));
  });

  it('shows the loading and not-found states under the same header', () => {
    expect(texts(render({ customer: null, status: 'loading' }))).toContain('Loading customer…');
    const missing = render({ customer: null, status: 'failed' });
    expect(texts(missing)).toContain('Customer not found');
    expect(missing.root.findAll(n => n.props.title === 'Retry').length).toBeGreaterThan(0);
  });
});
