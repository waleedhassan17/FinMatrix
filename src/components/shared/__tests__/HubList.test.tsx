// The hub list is what makes the Transactions, Reports and More tabs read as
// one product: same row anatomy, one line of subtitle, and a count that is
// only red when it is work waiting on the person looking.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (): null => null,
  useAppDispatch: () => jest.fn(),
}));
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
// Cut the network chain at its root: the hubs' slices reach axios, expo-constants
// and AsyncStorage through apiHelpers, none of which a render or copy test needs.
jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../networks/sales/customerNetwork', () => ({ getCustomersAPI: jest.fn() }));
jest.mock('../../../networks/purchases/vendorNetwork', () => ({ getVendorsAPI: jest.fn() }));
jest.mock('../../../screens/Delivery/Admin/AssignDeliveries/deliverySlice', () => ({
  selectUnassignedDeliveries: (): unknown[] => [],
}));
jest.mock('../../../screens/Approvals/approvalsSlice', () => ({
  fetchPendingCount: jest.fn(),
  selectPendingApprovalCount: (): number => 0,
}));

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { HubRow, HubSection, HUB_SUBTITLE_MAX } from '../HubList';
import { THEME } from '../../../theme';
import { SALES_ROWS, PURCHASE_ROWS, ACCOUNTING_ROWS } from '../../../screens/Transactions/TransactionsHubScreen';
import { SECTIONS as MORE_SECTIONS } from '../../../screens/More/MoreHubScreen';
import { STAFF_SECTIONS } from '../../../screens/More/StaffMoreHubScreen';
import { reportsHubSlice } from '../../../screens/Reports/ReportsHub/reportsHubSlice';

const render = (el: React.ReactElement): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return tree;
};

const texts = (tree: ReactTestRenderer) => tree.root.findAllByType(Text);
// Host views only: the composite View and the host View it renders both carry the testID.
const countPill = (tree: ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.type === 'string' && n.props.testID === 'hub-row-count');

describe('HubRow', () => {
  it('keeps the title and the subtitle to one line each', () => {
    const tree = render(<HubRow icon="file" title="Invoices" subtitle="Bill customers" onPress={jest.fn()} />);
    const [title, subtitle] = texts(tree);
    expect(title.props.children).toBe('Invoices');
    expect(title.props.numberOfLines).toBe(1);
    expect(subtitle.props.children).toBe('Bill customers');
    expect(subtitle.props.numberOfLines).toBe(1);
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const tree = render(<HubRow icon="file" title="Bills" subtitle="Vendor bills" onPress={onPress} />);
    act(() => {
      tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows no count at 0', () => {
    const tree = render(<HubRow icon="users" title="Customers" subtitle="x" count={0} onPress={jest.fn()} />);
    expect(countPill(tree)).toHaveLength(0);
  });

  it('draws a total as a neutral pill and work waiting as a red one', () => {
    const neutral = render(<HubRow icon="users" title="Customers" subtitle="x" count={8} onPress={jest.fn()} />);
    const alert = render(
      <HubRow icon="inbox" title="Staff Approvals" subtitle="x" count={3} countTone="alert" onPress={jest.fn()} />,
    );
    const bg = (tree: ReactTestRenderer) => StyleSheet.flatten(countPill(tree)[0].props.style).backgroundColor;
    expect(bg(neutral)).toBe(THEME.colors.neutral100);
    expect(bg(alert)).toBe(THEME.colors.danger);
  });

  it('caps a large count at 99+ and names it for a screen reader', () => {
    const tree = render(<HubRow icon="users" title="Customers" subtitle="Balances" count={250} onPress={jest.fn()} />);
    expect(texts(tree).map(t => t.props.children)).toContain('99+');
    expect(tree.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
      'Customers. Balances, 99+',
    );
  });

  it('draws a divider under every row but the last', () => {
    const bordered = (last: boolean) => {
      const tree = render(<HubRow icon="file" title="Bills" subtitle="x" last={last} onPress={jest.fn()} />);
      return tree.root
        .findAll(n => String(n.type) === 'View')
        .some(n => (StyleSheet.flatten(n.props.style)?.borderBottomWidth ?? 0) > 0);
    };
    expect(bordered(false)).toBe(true);
    expect(bordered(true)).toBe(false);
  });
});

describe('HubSection', () => {
  it('labels its card', () => {
    const tree = render(
      <HubSection title="Sales">
        <HubRow icon="file" title="Invoices" subtitle="x" onPress={jest.fn()} last />
      </HubSection>,
    );
    expect(texts(tree)[0].props.children).toBe('Sales');
  });
});

// Copy guard: a subtitle longer than this is cut with an ellipsis on a 360dp
// phone. A new row with longer copy fails here rather than on a device.
describe('hub copy fits one line', () => {
  const reportItems = reportsHubSlice.getInitialState().categories.flatMap(c => c.items);
  const cases: Array<[string, string]> = [
    ...[...SALES_ROWS, ...PURCHASE_ROWS, ...ACCOUNTING_ROWS].map(r => [`Transactions · ${r.label}`, r.subtitle] as [string, string]),
    ...MORE_SECTIONS.flatMap(s => s.rows).map(r => [`More · ${r.label}`, r.subtitle] as [string, string]),
    ...STAFF_SECTIONS.flatMap(s => s.rows).map(r => [`Staff More · ${r.label}`, r.subtitle] as [string, string]),
    ...reportItems.map(i => [`Reports · ${i.title}`, i.description] as [string, string]),
  ];

  it.each(cases)('%s', (_name, subtitle) => {
    expect(subtitle.length).toBeLessThanOrEqual(HUB_SUBTITLE_MAX);
  });
});
