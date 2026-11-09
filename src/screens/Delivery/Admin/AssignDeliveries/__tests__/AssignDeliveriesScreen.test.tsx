// The queue must show all the work. A date filter used to hide anything not
// scheduled for the chosen day, while the screen said "Everything is assigned".
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../../../networks/network/apiHelpers', () => ({
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
jest.mock('../../../../../utils/alert', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('../../../../../hooks/useCreditLimitPrompt', () => ({
  useCreditLimitPrompt: (): { prompt: () => boolean; modal: null } => ({ prompt: () => false, modal: null }),
}));
jest.mock('../../InventoryApproval/inventoryApprovalSlice', () => ({
  selectPendingApprovalCount: (s: { pendingApprovals: number }) => s.pendingApprovals,
}));
jest.mock('../deliverySlice', () => ({
  selectDeliveries: (s: { deliveries: unknown[] }) => s.deliveries,
  selectDeliveryPersonnel: (s: { personnel: unknown[] }) => s.personnel,
  assignSelectedDeliveries: jest.fn(arg => ({ type: 'assign', arg })),
  deleteDelivery: jest.fn(id => ({ type: 'delete', id })),
  fetchDeliveries: jest.fn(() => ({ type: 'fetchDeliveries' })),
  fetchDeliveryPersonnel: jest.fn(() => ({ type: 'fetchPersonnel' })),
}));
let mockState: Record<string, unknown>;
const mockDispatch = jest.fn((_action: unknown) => ({ unwrap: () => Promise.resolve({}) }));
jest.mock('../../../../../hooks/useReduxHooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector(mockState),
  useAppDispatch: () => mockDispatch,
}));

import React from 'react';
import { StyleSheet, Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import dayjs from 'dayjs';

import AssignDeliveriesScreen from '../AssignDeliveriesScreen';
import { assignSelectedDeliveries, deleteDelivery } from '../deliverySlice';
import { Alert } from '../../../../../utils/alert';
import { PRIORITY_CONFIG } from '../../../../../utils/theme';

const day = (offset: number) => dayjs().add(offset, 'day').format('YYYY-MM-DD');
const delivery = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  referenceNo: `DEL-${id}`,
  customerName: `Customer ${id}`,
  zone: 'Zone A',
  status: 'unassigned',
  priority: 'medium',
  scheduledDate: day(0),
  ...over,
});
const rider = { userId: 'r1', displayName: 'Saim Raza', vehicleType: 'motorcycle', status: 'active', currentLoad: 2, maxLoad: 10 };

const render = (state: { deliveries?: unknown[]; selected?: string[]; tab?: string; personnel?: unknown[] }) => {
  mockState = {
    assignDeliveries: {
      activeTab: state.tab ?? 'assign',
      showCreateForm: false,
      selectedDeliveryIds: state.selected ?? [],
      selectedPersonnelId: '',
    },
    deliveries: state.deliveries ?? [],
    personnel: state.personnel ?? [rider],
    pendingApprovals: 0,
  };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<AssignDeliveriesScreen />);
  });
  return tree;
};

const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

beforeEach(() => jest.clearAllMocks());

describe('Delivery Management: the queue', () => {
  it('has no date field, and lists deliveries scheduled on any day', () => {
    const tree = render({
      deliveries: [
        delivery('old', { scheduledDate: day(-60) }),
        delivery('today'),
        delivery('later', { scheduledDate: day(5) }),
      ],
    });
    const all = texts(tree);
    expect(all).not.toContain('Schedule Date');
    expect(all).toEqual(expect.arrayContaining(['DEL-old', 'DEL-today', 'DEL-later']));
    expect(all).not.toContain('Everything is assigned');
  });

  it('says "Everything is assigned" only when nothing is waiting', () => {
    expect(texts(render({ deliveries: [] }))).toContain('Everything is assigned');
    expect(texts(render({ deliveries: [delivery('a', { status: 'delivered' })] }))).toContain('Everything is assigned');
  });

  it('puts the longest overdue first and names the date on each row', () => {
    const all = texts(render({
      deliveries: [
        delivery('later', { scheduledDate: day(5) }),
        delivery('tomorrow', { scheduledDate: day(1) }),
        delivery('today'),
        delivery('old', { scheduledDate: day(-3) }),
      ],
    }));
    const order = all.filter(t => t.startsWith('DEL-'));
    expect(order).toEqual(['DEL-old', 'DEL-today', 'DEL-tomorrow', 'DEL-later']);
    expect(all).toEqual(expect.arrayContaining(['Today', 'Tomorrow']));
    expect(all.some(t => t.startsWith('Overdue · '))).toBe(true);
  });

  it('reads a timestamped date by its date part', () => {
    const all = texts(render({ deliveries: [delivery('a', { scheduledDate: `${day(0)}T00:00:00.000Z` })] }));
    expect(all).toContain('Today');
  });

  it('copes with a delivery that has no date or zone', () => {
    const all = texts(render({ deliveries: [delivery('a', { scheduledDate: '', zone: '' })] }));
    expect(all).toContain('DEL-a');
    expect(all).toContain('Customer a');
  });

  it('marks only a priority worth noticing, and an urgent chip stays readable', () => {
    const tree = render({
      deliveries: [
        delivery('m'),
        delivery('l', { priority: 'low' }),
        delivery('h', { priority: 'high' }),
        delivery('u', { priority: 'urgent' }),
      ],
    });
    const all = texts(tree);
    expect(all).toEqual(expect.arrayContaining(['High', 'Urgent']));
    expect(all).not.toContain('Medium');
    expect(all).not.toContain('Low');
    const urgent = tree.root.findAllByType(Text).find(t => t.props.children === 'Urgent')!;
    expect(StyleSheet.flatten(urgent.props.style).color).toBe(PRIORITY_CONFIG.urgent.color);
    expect(StyleSheet.flatten(urgent.parent!.props.style).backgroundColor).toBe(PRIORITY_CONFIG.urgent.bg);
  });
});

describe('Delivery Management: acting on a selection', () => {
  const assignButton = (tree: ReactTestRenderer) => tree.root.findAll(n => n.props.title === 'Assign to rider');

  it('offers the actions only once something is selected', () => {
    expect(assignButton(render({ deliveries: [delivery('a')] }))).toHaveLength(0);
    expect(assignButton(render({ deliveries: [delivery('a')], selected: ['a'] })).length).toBeGreaterThan(0);
  });

  it('drops a delivery assigned elsewhere from the count and from what it sends', async () => {
    const tree = render({
      deliveries: [delivery('a'), delivery('gone', { status: 'pending' })],
      selected: ['a', 'gone'],
    });
    expect(texts(tree)).toContain('1 selected');

    act(() => assignButton(tree)[0].props.onPress());
    const pick = tree.root.findAll(n => n.props.accessibilityLabel === 'Assign to Saim Raza' && typeof n.props.onPress === 'function');
    await act(async () => { await pick[0].props.onPress(); });

    expect(assignSelectedDeliveries).toHaveBeenCalledWith({ deliveryIds: ['a'], personnelId: 'r1', overrideReason: undefined });
    expect(Alert.alert).toHaveBeenCalledWith('Assigned', expect.stringContaining('1 delivery assigned to Saim Raza'));
  });

  it('offers only riders who can take work', () => {
    const tree = render({
      deliveries: [delivery('a')],
      selected: ['a'],
      personnel: [
        rider,
        { ...rider, userId: 'r2', displayName: 'On Leave', status: 'on_leave' },
        { ...rider, userId: 'r3', displayName: 'Gone', status: 'inactive' },
        { ...rider, userId: 'r4', displayName: 'Locked', status: 'plan_locked' },
      ],
    });
    act(() => assignButton(tree)[0].props.onPress());
    const all = texts(tree);
    expect(all).toContain('Saim Raza');
    expect(all).not.toEqual(expect.arrayContaining(['On Leave']));
    expect(all).not.toContain('Gone');
    expect(all).not.toContain('Locked');
  });

  it('confirms before deleting, and deletes only what is still selected', async () => {
    const tree = render({
      deliveries: [delivery('a'), delivery('gone', { status: 'pending' })],
      selected: ['a', 'gone'],
    });
    const del = tree.root.findAll(n => n.props.accessibilityLabel === 'Delete 1 delivery' && typeof n.props.onPress === 'function');
    act(() => del[0].props.onPress());
    expect(deleteDelivery).not.toHaveBeenCalled();

    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => { await buttons.find((b: { text: string }) => b.text === 'Delete').onPress(); });
    expect((deleteDelivery as unknown as jest.Mock).mock.calls.map(c => c[0])).toEqual(['a']);
  });

  it('selects every delivery in the queue with Select all', () => {
    const tree = render({ deliveries: [delivery('a'), delivery('b')] });
    let control = tree.root.findAllByType(Text).find(t => t.props.children === 'Select all')!.parent!;
    while (typeof control.props.onPress !== 'function') control = control.parent!;
    act(() => control.props.onPress());
    const toggles = mockDispatch.mock.calls
      .map(c => c[0] as { type?: string; payload?: string })
      .filter(a => a?.type === 'assignDeliveries/toggleDeliverySelection');
    expect(toggles.map(a => a.payload)).toEqual(['a', 'b']);
  });
});

describe('Delivery Management: the other tabs', () => {
  it('Monitor names the rider rather than printing their id, and links to the full monitor', () => {
    const tree = render({
      tab: 'monitor',
      deliveries: [delivery('a', { status: 'in_transit', assignedTo: 'r1' })],
    });
    const all = texts(tree);
    expect(all).toContain('Customer a · Saim Raza');
    expect(all).toContain('In Transit');
    expect(all).toContain('Open monitor');
  });

  it('Approvals lists failed and returned deliveries, with their notes', () => {
    const all = texts(render({
      tab: 'approvals',
      deliveries: [delivery('a', { status: 'failed', notes: 'Shop closed' }), delivery('b')],
    }));
    expect(all).toContain('Customer a · Shop closed');
    expect(all).not.toContain('DEL-b');
    expect(all).toContain('Inventory approvals');
  });
});
