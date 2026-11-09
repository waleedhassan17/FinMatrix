// The list says who owes what in two lines, and its totals are the company's,
// not the sum of the pages loaded so far.
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
  useFocusEffect: jest.fn(),
}));
let mockState: { customerList: Record<string, unknown> };
const mockDispatch = jest.fn();
jest.mock('../../../../hooks/useReduxHooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

import React from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import CustomerListScreen from '../CustomerListScreen';
import { THEME } from '../../../../utils/theme';

const customer = (over: Record<string, unknown>) => ({
  id: String(over.name),
  name: 'Customer',
  code: 'C-0001',
  company: '',
  email: '',
  phone: '',
  balance: 0,
  creditLimit: 0,
  paymentTerms: 'net30',
  isActive: true,
  ...over,
});

let mounted: ReactTestRenderer | undefined;
const render = (customers: unknown[], over: Record<string, unknown> = {}) => {
  mockState = {
    customerList: {
      customers,
      searchQuery: '',
      statusFilter: 'all',
      sortField: 'name',
      isLoading: false,
      isLoadingMore: false,
      error: '',
      page: 1,
      totalPages: 1,
      totalCustomers: customers.length,
      summary: null,
      ...over,
    },
  };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<CustomerListScreen />);
  });
  mounted = tree;
  return tree;
};
const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));
const pressByLabel = (tree: ReactTestRenderer, label: string) => {
  const hit = tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  act(() => hit.props.onPress());
};
const dispatched = (type: string) =>
  mockDispatch.mock.calls.map(c => c[0]).filter(a => a?.type === type).map(a => a.payload);

beforeEach(() => jest.clearAllMocks());
// FlatList schedules work on a timer; unmounting stops it outliving the test.
afterEach(() => act(() => mounted?.unmount()));

describe('Customers', () => {
  it('takes its totals from the server, not from the loaded rows', () => {
    const all = texts(render([customer({ name: 'A', balance: 50 })], {
      totalPages: 5,
      summary: { total: 240, outstandingBalance: 122115.14 },
    }));
    expect(all).toContain('Rs 122,115.14');
    expect(all).toContain('240');
  });

  it('falls back to the loaded rows when the server sends no summary', () => {
    const all = texts(render([customer({ name: 'A', balance: 50 }), customer({ name: 'B', balance: 25 })]));
    expect(all).toContain('Rs 75.00');
    expect(all).toContain('2');
  });

  it('marks only the exception, and no row carries an emoji', () => {
    const all = texts(render([customer({ name: 'A' }), customer({ name: 'B', isActive: false })]));
    expect(all.filter(t => t === 'Inactive').length).toBeGreaterThanOrEqual(2); // the row and the filter chip
    expect(all.filter(t => t === 'Active')).toHaveLength(1); // the filter chip alone
    expect(all.join('')).not.toMatch(/✉|📞/);
  });

  it('labels a customer who has paid ahead, in green, instead of their terms', () => {
    const tree = render([customer({ name: 'Bismillah Mart', balance: -57250.8 })]);
    const all = texts(tree);
    expect(all).toContain('In credit');
    expect(all).not.toContain('Net 30');
    // The last match: the headline figure above the list shows the same amount here.
    const amount = tree.root.findAllByType(Text).filter(t => String(t.props.children).includes('57,250.80')).pop()!;
    expect(StyleSheet.flatten(amount.props.style).color).toBe(THEME.colors.success);
  });

  it('colours a balance by how near it is to the limit, and leaves zero quiet', () => {
    const tree = render([
      customer({ name: 'Near', balance: 90, creditLimit: 100 }),
      customer({ name: 'Mid', balance: 60, creditLimit: 100 }),
      customer({ name: 'Zero', balance: 0 }),
    ]);
    const colour = (amount: string) =>
      StyleSheet.flatten(tree.root.findAllByType(Text).find(t => t.props.children === amount && Array.isArray(t.props.style))!.props.style).color;
    expect(colour('Rs 90.00')).toBe(THEME.colors.danger);
    expect(colour('Rs 60.00')).toBe(THEME.colors.warning);
    expect(colour('Rs 0.00')).toBe(THEME.colors.textTertiary);
  });

  it('does not repeat a company that is just the name, and falls back to the phone', () => {
    const all = texts(render([
      customer({ name: 'Bismillah Mart', company: 'Bismillah Mart', code: 'C-0003', phone: '0300-5552211' }),
      customer({ name: 'abc', company: 'abctextile', code: 'C-0008' }),
    ]));
    expect(all).toContain('C-0003 · 0300-5552211');
    expect(all).toContain('C-0008 · abctextile');
  });

  it('copes with a customer that has no ID or contact details', () => {
    expect(texts(render([customer({ name: 'Bare', code: '' })]))).toContain('Bare');
  });

  it('closing search clears the query, so the list is not left filtered invisibly', () => {
    const tree = render([customer({ name: 'A' })], { searchQuery: 'abc' });
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
    pressByLabel(tree, 'Close search');
    expect(dispatched('customerList/setSearchQuery')).toEqual(['']);
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  });

  it('opens the search field on demand, and sends what is typed', () => {
    const tree = render([customer({ name: 'A' })]);
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    pressByLabel(tree, 'Search customers');
    act(() => tree.root.findByType(TextInput).props.onChangeText('bis'));
    expect(dispatched('customerList/setSearchQuery')).toEqual(['bis']);
  });

  it('sets the status filter from a chip', () => {
    const tree = render([customer({ name: 'A' })]);
    pressByLabel(tree, 'Inactive');
    expect(dispatched('customerList/setStatusFilter')).toEqual(['inactive']);
  });

  it('chooses the order from a sheet, and the control names the current one', () => {
    const tree = render([customer({ name: 'A' })], { sortField: 'balance' });
    expect(texts(tree)).toContain('Sort: Balance');
    pressByLabel(tree, 'Sort by Highest balance');
    let row = tree.root.findAllByType(Text).find(t => t.props.children === 'Recently added')!.parent!;
    while (typeof row.props.onPress !== 'function') row = row.parent!;
    act(() => row.props.onPress());
    expect(dispatched('customerList/setSortField')).toEqual(['recent']);
  });

  it('opens a customer from their row', () => {
    const tree = render([customer({ id: 'c9', name: 'Allama Iqbal', balance: 50 })]);
    pressByLabel(tree, 'Allama Iqbal, balance Rs 50.00');
    expect(mockNavigate).toHaveBeenCalledWith('CustomerDetail', { customerId: 'c9' });
  });
});
