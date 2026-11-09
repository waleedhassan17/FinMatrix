// A rider with no history has no measurements, and the management actions stay
// behind their confirmations.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]),
}));
jest.mock('../../../../../utils/alert', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('../../../../../hooks/useReduxHooks', () => ({
  useAppSelector: (): null => null,
  useAppDispatch: () => jest.fn(),
}));
const mockDetail = jest.fn();
const mockDeliveries = jest.fn();
const mockUpdate = jest.fn();
const mockToggle = jest.fn();
jest.mock('../../../../../networks/delivery/deliveryNetwork', () => ({
  getPersonnelDetailAPI: (...a: unknown[]) => mockDetail(...a),
  getDeliveriesAPI: (...a: unknown[]) => mockDeliveries(...a),
  updatePersonnelAPI: (...a: unknown[]) => mockUpdate(...a),
  togglePersonnelAvailabilityAPI: (...a: unknown[]) => mockToggle(...a),
  resetPersonnelPasswordAPI: jest.fn(),
}));

import React from 'react';
import { Text } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import DeliveryPersonnelDetailScreen from '../DeliveryPersonnelDetailScreen';

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
const route = { params: { userId: 'u1' } };
const Screen = DeliveryPersonnelDetailScreen as unknown as React.FC<{ navigation: unknown; route: unknown }>;

const render = async (profile: Record<string, unknown>, deliveries: unknown[] = []) => {
  mockDetail.mockResolvedValue({ data: { userId: 'u1', name: 'munawar', status: 'active', isAvailable: true, zones: [], ...profile } });
  mockDeliveries.mockResolvedValue({ data: deliveries });
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Screen navigation={navigation} route={route} />);
  });
  return tree;
};
const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).filter(c => typeof c !== 'object').join(''));
const press = async (tree: ReactTestRenderer, labelStart: string) => {
  const row = tree.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith(labelStart) && typeof n.props.onPress === 'function')[0];
  await act(async () => { await row.props.onPress(); });
};

beforeEach(() => jest.clearAllMocks());

describe('Rider details', () => {
  it('shows a dash, not 100% and 5.0, for a rider who has delivered nothing', async () => {
    const all = texts(await render({ totalDeliveries: 0, onTimeRate: 100, rating: 5 }));
    expect(all.filter(t => t === '—')).toHaveLength(2);
    expect(all).not.toContain('100%');
    expect(all).not.toContain('5.0');
    expect(all).toContain('No completed deliveries yet');
  });

  it('shows the measurements once there is a record', async () => {
    const all = texts(await render({ totalDeliveries: 12, onTimeRate: 92, rating: 4.5 }));
    expect(all).toEqual(expect.arrayContaining(['12', '92%', '4.5']));
    expect(all).not.toContain('—');
  });

  it('counts delivered from the rider\'s own deliveries, because the server\'s counter stays at 0', async () => {
    const delivered = { referenceNo: 'DEL-1', customerName: 'Bismillah Mart', status: 'delivered', items: [{}] };
    const all = texts(await render({ totalDeliveries: 0, onTimeRate: 100, rating: 5 }, [
      { ...delivered, id: 'd1' },
      { ...delivered, id: 'd2' },
      { ...delivered, id: 'd3', status: 'returned' },
    ]));
    expect(all).toContain('2');
    expect(all).not.toContain('No completed deliveries yet');
    // Nothing measures these yet, so they stay blank rather than read as a perfect record.
    expect(all.filter(t => t === '—')).toHaveLength(2);
    expect(all).not.toContain('100%');
  });

  it('marks a missing vehicle and zones "Not set" rather than a dash in a card of its own', async () => {
    const all = texts(await render({ vehicleType: '', vehicleNumber: '' }));
    expect(all.filter(t => t === 'Not set').length).toBeGreaterThanOrEqual(2);
  });

  it('joins the vehicle and plate into one line', async () => {
    const all = texts(await render({ vehicleType: 'motorcycle', vehicleNumber: 'LHR-9087' }));
    expect(all).toContain('Motorcycle · LHR-9087');
  });

  it('lists current deliveries and opens one', async () => {
    const tree = await render({}, [{ id: 'd1', referenceNo: 'DEL-1', customerName: 'Bismillah Mart', status: 'in_transit', items: [{}] }]);
    const all = texts(tree);
    expect(all).toContain('Bismillah Mart');
    expect(all).toContain('In Transit');
    const row = tree.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && n.findAllByType(Text).some(t => t.props.children === 'Bismillah Mart'))[0];
    act(() => row.props.onPress());
    expect(navigation.navigate).toHaveBeenCalledWith('AdminDeliveryDetail', { deliveryId: 'd1' });
  });

  it('asks before deactivating, and only then calls the server', async () => {
    const tree = await render({});
    mockUpdate.mockResolvedValue({});
    await press(tree, 'Deactivate');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('Deactivate Rider');
    // The red button in the modal; the row behind it carries the same title.
    const confirm = tree.root.findAll(n => n.props.title === 'Deactivate' && n.props.variant === 'danger')[0];
    await act(async () => { await confirm.props.onPress(); });
    expect(mockUpdate).toHaveBeenCalledWith('u1', { status: 'inactive' });
  });

  it('offers Reactivate, and blocks the availability switch, for a deactivated rider', async () => {
    const tree = await render({ status: 'inactive', isAvailable: false });
    const all = texts(tree);
    expect(all).toContain('Deactivated');
    expect(all).toContain('Reactivate');
    expect(all).not.toContain('Deactivate');
    const toggle = tree.root.findAll(n => String(n.props.accessibilityLabel ?? '').startsWith('Set available') && n.props.disabled !== undefined)[0];
    expect(toggle.props.disabled).toBe(true);
  });

  it('shows the error, with a way to retry, when the rider cannot be loaded', async () => {
    mockDetail.mockRejectedValue(new Error('Rider not found'));
    mockDeliveries.mockResolvedValue({ data: [] });
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<Screen navigation={navigation} route={route} />);
    });
    expect(texts(tree)).toContain('Rider not found');
    expect(tree.root.findAll(n => n.props.title === 'Retry').length).toBeGreaterThan(0);
  });
});
