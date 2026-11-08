// The Reports hub's Today tiles: each opens the report it comes from, so a
// tile whose report this tier does not have is not shown at all.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import TodayRow from '../ReportsHub/TodayRow';
import { remoteDone } from '../../../models/remoteModel';
import type { HubToday } from '../ReportsHub/reportsHubSlice';

const TODAY: HubToday = {
  cash: remoteDone(125000),
  overdueAr: remoteDone({ overdue: 40000, parties: 2 }),
  apDue: remoteDone({ dueThisWeek: 9000, overdue: 0 }),
  belowReorder: remoteDone(3),
};

/** One pressable per tile — the renderer reports a touchable and its host view alike. */
const tiles = (tree: renderer.ReactTestRenderer) => {
  const seen = new Map<string, renderer.ReactTestInstance>();
  tree.root
    .findAll(n => typeof n.props?.accessibilityLabel === 'string' && typeof n.props?.onPress === 'function')
    .forEach(n => {
      const label = String(n.props.accessibilityLabel).split(',')[0];
      if (!seen.has(label)) seen.set(label, n);
    });
  return seen;
};
const labels = (tree: renderer.ReactTestRenderer) => [...tiles(tree).keys()];

const render = (el: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  return tree;
};

describe('TodayRow', () => {
  it('shows every tile when the tier has every report', () => {
    const tree = render(<TodayRow today={TODAY} onOpen={jest.fn()} onRetry={jest.fn()} />);
    expect(labels(tree)).toEqual([
      'Cash on hand',
      'Customers overdue',
      'Bills due this week',
      'Below reorder point',
    ]);
    act(() => tree.unmount());
  });

  it('leaves out the reorder tile on a tier without inventory, instead of a tap that opens nothing', () => {
    const onOpen = jest.fn();
    const mounted = ['CashFlow', 'ARAging', 'APAging'];
    const tree = render(
      <TodayRow today={TODAY} onOpen={onOpen} onRetry={jest.fn()} canOpen={t => mounted.includes(t)} />,
    );
    expect(labels(tree)).not.toContain('Below reorder point');
    expect(labels(tree)).toHaveLength(3);
    // Every tile still shown opens a report the tier has.
    tiles(tree).forEach(n => act(() => n.props.onPress()));
    expect(onOpen.mock.calls.map(c => c[0])).toEqual(mounted);
    act(() => tree.unmount());
  });
});
