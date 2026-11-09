// The dashboard's delivery card: the bar agrees with the percentage above it,
// and each legend row names one of the bar's colours.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (): null => null,
  useAppDispatch: () => jest.fn(),
}));
jest.mock('../../../hooks/useWhatsappConnect', () => ({ useWhatsappConnect: () => ({}) }));
jest.mock('../CollectionsWhatsAppCard', () => 'CollectionsWhatsAppCard');
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

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { DeliveryProgressCard } from '../AdminDashboardScreen';
import { C } from '../dashboardTheme';

const render = (delivery: { pending: number; assigned: number; inTransit: number; delivered: number; total: number }) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <DeliveryProgressCard
        delivery={delivery}
        completedPct={delivery.total ? Math.round((delivery.delivered / delivery.total) * 100) : 0}
      />,
    );
  });
  return tree;
};

// The bar's segments: bare flex views. Legend rows are also flex: 1, but set a direction.
const segments = (tree: ReactTestRenderer) =>
  tree.root
    .findAllByType(View)
    .map(v => StyleSheet.flatten(v.props.style) ?? {})
    .filter(s => typeof s.flex === 'number' && !s.flexDirection);

const textOf = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

describe('DeliveryProgressCard', () => {
  it('leaves orders in no listed status as bare track, so green matches the percentage', () => {
    // The user's own numbers: 63% of 38, with 29 in the four listed statuses.
    const segs = segments(render({ pending: 5, assigned: 0, inTransit: 0, delivered: 24, total: 38 }));
    const whole = segs.reduce((sum, s) => sum + (s.flex as number), 0);
    expect(whole).toBe(38);
    const green = segs.find(s => s.backgroundColor === C.pos);
    expect((green!.flex as number) / whole).toBeCloseTo(24 / 38);
    const bare = segs.filter(s => !s.backgroundColor);
    expect(bare.map(s => s.flex)).toEqual([9]);
  });

  it('gives every status with deliveries its own legend colour on the bar', () => {
    const colours = segments(render({ pending: 5, assigned: 3, inTransit: 2, delivered: 24, total: 34 }))
      .map(s => s.backgroundColor);
    expect(colours).toEqual([C.pos, C.indigo, C.info, C.warn]);
  });

  it('draws an empty grey track for a company with no deliveries', () => {
    const segs = segments(render({ pending: 0, assigned: 0, inTransit: 0, delivered: 0, total: 0 }));
    expect(segs).toHaveLength(1);
    expect(segs[0].backgroundColor).toBe(C.lineSoft);
  });

  it('lists the statuses in sentence case, in the order a delivery moves', () => {
    const labels = textOf(render({ pending: 1, assigned: 1, inTransit: 1, delivered: 1, total: 4 }))
      .filter(t => /^[A-Z][a-z ]+$/.test(t) && t !== 'Completion rate');
    expect(labels).toEqual(['Pending', 'Assigned', 'In transit', 'Delivered']);
  });
});
