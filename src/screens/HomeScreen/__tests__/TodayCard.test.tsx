// The dashboard's Today card: the day's three figures, a line when something
// needs a look, and one tap to the Day Summary.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), put: jest.fn() },
  extractErrorMessage: jest.fn(),
}));

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import TodayCard from '../TodayCard';
import { daySummarySerializer } from '../../../serializers/daySummarySerializer';
import { daySummaryOwner, daySummaryStaff } from '../../Reports/DaySummary/__fixtures__/daySummary';

const render = (props: Partial<React.ComponentProps<typeof TodayCard>>) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<TodayCard summary={null} loading={false} failed={false} onOpen={jest.fn()} {...props} />);
  });
  return tree;
};

const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));

describe('TodayCard', () => {
  it('shows sales, money received and orders booked with their counts', () => {
    const tree = render({ summary: daySummarySerializer(daySummaryOwner) });
    const t = texts(tree);
    expect(t).toEqual(expect.arrayContaining(['Sales', 'Rs 245K', '12 invoices', 'Received', 'Rs 180K', '5 receipts']));
    expect(t).toEqual(expect.arrayContaining(['Orders booked', 'Rs 70K', '3 sales orders']));
  });

  it('shows purchases instead when the plan has no sales orders', () => {
    const tree = render({ summary: daySummarySerializer({ ...daySummaryOwner, headline: { ...daySummaryOwner.headline, orders: null } }) });
    expect(texts(tree)).toEqual(expect.arrayContaining(['Purchases', '1 bill']));
  });

  it('says what needs a look, in one line', () => {
    const t = texts(render({ summary: daySummarySerializer(daySummaryOwner) }));
    expect(t.some(s => s.startsWith('2 back-dated entries · 1 draft not posted'))).toBe(true);
  });

  it('has no warning line on a clean day', () => {
    const t = texts(render({ summary: daySummarySerializer(daySummaryStaff) }));
    expect(t.some(s => s.includes('back-dated'))).toBe(false);
  });

  it('shows a dash, not a zero, when today could not be loaded', () => {
    const t = texts(render({ failed: true }));
    expect(t.filter(s => s === '—')).toHaveLength(3);
  });

  it('opens the Day Summary', () => {
    const onOpen = jest.fn();
    const tree = render({ summary: daySummarySerializer(daySummaryOwner), onOpen });
    act(() => tree.root.findByType(TouchableOpacity).props.onPress());
    expect(onOpen).toHaveBeenCalled();
  });
});
