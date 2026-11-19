// The reported bug: an order half shipped and then invoiced offered no way to
// ship the rest. These check the buttons the detail screen offers in each
// state, and that a partial shipment is sent as a running total.
jest.mock('@expo/vector-icons', () => ({ Feather: Object.assign((): null => null, { glyphMap: {} }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  toApiError: (e: unknown) => e,
  unwrapEnvelope: (r: unknown) => r,
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { salesOrderId: 'so1' } }),
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../utils/alert', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('../../../utils/companyInfo', () => ({ useCompanyInfo: () => ({}) }));
jest.mock('../../../utils/salesOrderShare', () => ({ shareSalesOrderPdf: jest.fn() }));
jest.mock('../../../utils/documentPdfAdapters', () => ({ salesOrderForPdf: jest.fn() }));
jest.mock('../../../components/shared/CreditLimitModal', () => 'CreditLimitModal');
let mockOwner = true;
jest.mock('../../../hooks/useCapability', () => ({ useIsOwner: () => mockOwner }));
jest.mock('../salesOrderSlice', () => ({
  selectSalesOrderState: (s: unknown) => s,
  fetchSalesOrder: jest.fn(() => ({ type: 'fetch' })),
  fulfillSalesOrder: jest.fn((arg: unknown) => ({ type: 'fulfill', arg })),
  convertSalesOrderInvoice: jest.fn((arg: unknown) => ({ type: 'convert', arg })),
  cancelSalesOrder: jest.fn(() => ({ type: 'cancel' })),
  removeSalesOrder: jest.fn(() => ({ type: 'remove' })),
  closeSalesOrder: jest.fn(() => ({ type: 'close' })),
  reopenSalesOrder: jest.fn(() => ({ type: 'reopen' })),
}));
let mockState: Record<string, unknown>;
const mockDispatch = jest.fn(async () => ({ meta: { requestStatus: 'fulfilled' }, payload: {} }));
jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

import React from 'react';
import { Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import SalesOrderDetailScreen from '../SalesOrderDetailScreen';
import { fulfillSalesOrder } from '../salesOrderSlice';
import type { SalesOrder, SalesOrderActions, SalesOrderLine } from '../../../models/salesOrderModel';

const line = (id: string, quantity: number, shipped = 0, invoiced = 0): SalesOrderLine => ({
  id,
  itemId: 'item',
  description: `Paint ${id}`,
  quantity,
  quantityFulfilled: shipped,
  quantityInvoiced: invoiced,
  toInvoice: Math.max(shipped - invoiced, 0),
  toShip: Math.max(quantity - shipped, 0),
  unitPrice: 100,
  taxRate: 0,
  lineTotal: quantity * 100,
});
const none: SalesOrderActions = {
  ship: false, invoice: false, close: false, reopen: false, cancel: false, delete: false, edit: false, editLines: false,
};
const order = (over: Partial<SalesOrder>): SalesOrder => ({
  id: 'so1', orderNumber: 'SO-2026-0007', customerId: 'c1', customerName: 'Buyer',
  orderDate: '2026-11-18', expectedDate: null, status: 'partial', lines: [line('a', 10, 5, 5)],
  subtotal: 1000, discountType: 'none', discountValue: 0, discountAmount: 0, taxAmount: 0, total: 1000,
  notes: '', invoiceId: 'i1',
  invoices: [{ id: 'i1', invoiceNumber: 'INV-2026-0001', invoiceDate: '2026-11-18', total: 500, balance: 500, status: 'sent' }],
  nextInvoice: null,
  totals: { ordered: 10, shipped: 5, invoiced: 5, toInvoice: 0, toShip: 5, billedNotShipped: 0 },
  actions: { ...none, ship: true, close: true, edit: true },
  deliveryId: null, deliveryReference: null,
  ...over,
});

const render = (o: SalesOrder) => {
  mockState = { current: o, isLoading: false, isSaving: false, error: '' };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<SalesOrderDetailScreen />);
  });
  return tree;
};
const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));
const press = (tree: ReactTestRenderer, title: string) =>
  act(() => tree.root.findAll(n => n.props.title === title && typeof n.props.onPress === 'function')[0].props.onPress());
const hasButton = (tree: ReactTestRenderer, title: string) =>
  tree.root.findAll(n => n.props.title === title && typeof n.props.onPress === 'function').length > 0;

beforeEach(() => {
  jest.clearAllMocks();
  mockOwner = true;
});

describe('Sales order detail', () => {
  it('half shipped and invoiced: Record Shipment is still offered for the rest', () => {
    const tree = render(order({}));
    expect(hasButton(tree, 'Record Shipment')).toBe(true);
    expect(texts(tree).join(' ')).toContain('still to ship');
    expect(texts(tree)).toContain('INV-2026-0001');
  });

  it('records part of the rest as a running total', async () => {
    const tree = render(order({}));
    press(tree, 'Record Shipment');
    const input = tree.root.findAllByType(TextInput)[0];
    act(() => input.props.onChangeText('3'));
    await act(async () => {
      tree.root.findAll(n => n.props.title === 'Save Shipment' && typeof n.props.onPress === 'function')[0].props.onPress();
    });
    expect(fulfillSalesOrder).toHaveBeenCalledWith({ id: 'so1', lines: [{ lineId: 'a', quantityFulfilled: '8' }] });
    // Saved: back to the order, out of shipping mode.
    expect(hasButton(tree, 'Save Shipment')).toBe(false);
  });

  it('an order invoiced in full the old way can record the goods not delivered', () => {
    const tree = render(order({
      status: 'invoiced',
      lines: [line('a', 10, 4, 10)],
      totals: { ordered: 10, shipped: 4, invoiced: 10, toInvoice: 0, toShip: 6, billedNotShipped: 6 },
      actions: { ...none, ship: true },
    }));
    expect(hasButton(tree, 'Record Shipment')).toBe(true);
    expect(texts(tree).join(' ')).toContain('invoiced but not delivered yet');
  });

  it('shipped goods not billed yet: invoicing leads, shipping the rest is beside it', () => {
    const tree = render(order({
      lines: [line('a', 10, 8, 5)],
      totals: { ordered: 10, shipped: 8, invoiced: 5, toInvoice: 3, toShip: 2, billedNotShipped: 0 },
      nextInvoice: { mode: 'shipped', isFinal: false, lines: [{ salesOrderLineId: 'a', description: 'Paint a', quantity: 3 }], total: 300 },
      actions: { ...none, ship: true, invoice: true, edit: true },
    }));
    expect(hasButton(tree, 'Invoice Shipped')).toBe(true);
    expect(hasButton(tree, 'Record Shipment')).toBe(true);
  });

  it('staff request the invoice instead', () => {
    mockOwner = false;
    const tree = render(order({
      lines: [line('a', 10, 8, 5)],
      nextInvoice: { mode: 'shipped', isFinal: false, lines: [], total: 300 },
      actions: { ...none, ship: true, invoice: true },
      totals: { ordered: 10, shipped: 8, invoiced: 5, toInvoice: 3, toShip: 2, billedNotShipped: 0 },
    }));
    expect(hasButton(tree, 'Request Invoice')).toBe(true);
  });

  it("a delivery's own order offers no manual actions", () => {
    const tree = render(order({ deliveryId: 'd1', deliveryReference: 'DLV-0001', actions: none }));
    expect(hasButton(tree, 'Record Shipment')).toBe(false);
    expect(texts(tree).join(' ')).toContain('DLV-0001');
  });
});
