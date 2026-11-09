// A rider's status on the card, and the count on its tab, are one fact.
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
jest.mock('../../../../../utils/alert', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('../../AssignDeliveries/deliverySlice', () => ({
  selectDeliveryPersonnel: (s: { personnel: unknown[] }) => s.personnel,
  fetchDeliveryPersonnel: jest.fn(() => ({ type: 'fetchPersonnel' })),
}));
let mockState: { personnel: unknown[] };
jest.mock('../../../../../hooks/useReduxHooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) => selector(mockState),
  useAppDispatch: () => jest.fn(),
}));

import React from 'react';
import { Text, TextInput } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import DeliveryPersonnelListScreen from '../DeliveryPersonnelListScreen';

const rider = (over: Record<string, unknown>) => ({
  userId: String(over.displayName),
  displayName: 'Rider',
  vehicleType: 'motorcycle',
  vehicleNumber: '',
  zones: [] as string[],
  maxLoad: 0,
  currentLoad: 0,
  status: 'active',
  isAvailable: true,
  rating: 5,
  ...over,
});

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const Screen = DeliveryPersonnelListScreen as unknown as React.FC<{ navigation: unknown }>;
let mounted: ReactTestRenderer | undefined;
// FlatList schedules work on a timer; unmounting stops it outliving the test.
afterEach(() => act(() => mounted?.unmount()));
const render = (personnel: unknown[]) => {
  mockState = { personnel };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<Screen navigation={navigation} />);
  });
  mounted = tree;
  return tree;
};
const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).filter(c => typeof c !== 'object').join(''));
const tabLabel = (tree: ReactTestRenderer, label: string) =>
  tree.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel.startsWith(label))[0]?.props.accessibilityLabel;

describe('Delivery Team', () => {
  it('calls a deactivated rider Inactive, not on leave, and counts them there', () => {
    const tree = render([rider({ displayName: 'Abbas', status: 'inactive', isAvailable: false })]);
    const all = texts(tree);
    expect(all).toContain('Inactive');
    expect(all).not.toContain('Leave');
    expect(tabLabel(tree, 'Inactive')).toBe('Inactive, 1 item');
    expect(tabLabel(tree, 'On leave')).toBe('On leave, 0 items');
  });

  it('shows the Inactive and Paused tabs only when someone is in them', () => {
    const tree = render([rider({ displayName: 'A' })]);
    expect(tabLabel(tree, 'Inactive')).toBeUndefined();
    expect(tabLabel(tree, 'Paused')).toBeUndefined();
  });

  it('filters the list by the same status each card shows', () => {
    const tree = render([
      rider({ displayName: 'Free' }),
      rider({ displayName: 'Away', status: 'on_leave', isAvailable: false }),
      rider({ displayName: 'Gone', status: 'inactive', isAvailable: false }),
    ]);
    const tab = tree.root.findAll(n => n.props.accessibilityRole === 'tab' && String(n.props.accessibilityLabel).startsWith('On leave') && typeof n.props.onPress === 'function')[0];
    act(() => tab.props.onPress());
    const all = texts(tree);
    expect(all).toContain('Away');
    expect(all).not.toContain('Free');
    expect(all).not.toContain('Gone');
  });

  it('counts a full rider as busy, and one with no capacity set as available', () => {
    const tree = render([
      rider({ displayName: 'Full', maxLoad: 10, currentLoad: 10 }),
      rider({ displayName: 'NoCapacity', maxLoad: 0 }),
    ]);
    expect(tabLabel(tree, 'Busy')).toBe('Busy, 1 item');
    expect(tabLabel(tree, 'Available')).toBe('Available, 1 item');
  });

  it('does not print a meaningless load, a dangling separator or a default rating', () => {
    const all = texts(render([rider({ displayName: 'New', maxLoad: 0, vehicleNumber: '' })]));
    expect(all).toContain('No active deliveries');
    expect(all.join(' ')).not.toMatch(/0\/0|rating/);
    expect(all).toContain('· Motorcycle');
  });

  it('shows the load against capacity, with the plate and zones', () => {
    const all = texts(render([rider({ displayName: 'S', vehicleType: 'van', vehicleNumber: 'LEH-9946', maxLoad: 30, currentLoad: 12, zones: ['Zone A'] })]));
    expect(all).toContain('· Van · LEH-9946');
    expect(all).toContain('12 of 30 deliveries');
    expect(all).toContain(' · Zone A');
  });

  it('searches riders who have no email or phone without throwing', () => {
    const tree = render([rider({ displayName: 'Abbas' }), rider({ displayName: 'Bilal' })]);
    act(() => tree.root.findByType(TextInput).props.onChangeText('abb'));
    const all = texts(tree);
    expect(all).toContain('Abbas');
    expect(all).not.toContain('Bilal');
  });

  it('invites adding a rider only when the team is really empty', () => {
    expect(texts(render([]))).toContain('No riders yet');
    const tree = render([rider({ displayName: 'A', status: 'inactive', isAvailable: false })]);
    const tab = tree.root.findAll(n => n.props.accessibilityRole === 'tab' && String(n.props.accessibilityLabel).startsWith('Busy') && typeof n.props.onPress === 'function')[0];
    act(() => tab.props.onPress());
    const all = texts(tree);
    expect(all).toContain('No riders found');
    expect(all).not.toContain('Add rider');
  });
});
