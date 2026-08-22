// expo-linear-gradient has no native side under Jest, and FilterTabs uses it only
// as a leaf for the edge fades — a host-component stub keeps this suite
// dependency-free (same approach as RevenueTrendCard's Feather stub).
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { FilterTabs, SegmentedTabs, type TabItem } from '../Tabs';

/**
 * These RENDER the tab controls rather than type-check them. The
 * scroll-into-view effect and the edge fades read layout out of refs and
 * state, which tsc cannot check — a stale ref or a bad measurement fails here
 * instead of on a phone.
 */

type V = 'all' | 'draft' | 'sent' | 'overdue' | 'paid';

const TABS: TabItem<V>[] = [
  { label: 'All', value: 'all', count: 12 },
  { label: 'Draft', value: 'draft', count: 3 },
  { label: 'Sent', value: 'sent', count: 0 },
  { label: 'Overdue', value: 'overdue', count: 2 },
  { label: 'Paid', value: 'paid', count: 7 },
];

const render = (active: V, onChange: (v: V) => void = () => {}) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<FilterTabs tabs={TABS} active={active} onChange={onChange} />);
  });
  return tree;
};

const tabNodes = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll(
    n => n.props?.accessibilityRole === 'tab' && typeof n.props?.onPress === 'function',
  );

/** Lay the row out: a viewport narrower than the content, so it can scroll. */
const layout = (tree: renderer.ReactTestRenderer, viewport = 320, content = 700) => {
  const scroll = tree.root.findByType(require('react-native').ScrollView);
  act(() => {
    tabNodes(tree).forEach((tab, i) => {
      tab.props.onLayout({ nativeEvent: { layout: { x: i * 140, width: 130 } } });
    });
    scroll.props.onLayout({ nativeEvent: { layout: { width: viewport } } });
    scroll.props.onContentSizeChange(content, 52);
  });
  return scroll;
};

describe('FilterTabs', () => {
  it('renders every tab with its count and selection state', () => {
    const tree = render('all');
    const tabs = tabNodes(tree);

    expect(tabs).toHaveLength(TABS.length);
    expect(tabs.map(t => t.props.accessibilityState.selected)).toEqual([
      true, false, false, false, false,
    ]);
    // The count belongs in the accessible name; a screen reader announcing
    // "Overdue" alone loses the number the sighted user can see.
    expect(tabs[3].props.accessibilityLabel).toBe('Overdue, 2 items');
    expect(tabs[1].props.accessibilityLabel).toBe('Draft, 3 items');
  });

  it('reports a single item without pluralising', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <FilterTabs tabs={[{ label: 'Void', value: 'all', count: 1 }]} active="all" onChange={() => {}} />,
      );
    });
    expect(tabNodes(tree)[0].props.accessibilityLabel).toBe('Void, 1 item');
  });

  it('reports the selected tab to onChange', () => {
    const onChange = jest.fn();
    const tree = render('all', onChange);
    act(() => {
      tabNodes(tree)[4].props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('paid');
  });

  it('scrolls the active tab into view once the row has been measured', () => {
    // "paid" is the last tab, well past a 320pt viewport — the case that used
    // to leave a filtered list looking unfiltered.
    const tree = render('paid');
    const scrollTo = jest.fn();
    tree.root.findByType(require('react-native').ScrollView).instance.scrollTo = scrollTo;
    layout(tree);

    expect(scrollTo).toHaveBeenCalled();
    const { x } = scrollTo.mock.calls[scrollTo.mock.calls.length - 1][0];
    // Centred on the pill (560 + 65 - 160 = 465), clamped to the scrollable
    // maximum (700 - 320 = 380) so the last tab sits flush to the edge.
    expect(x).toBe(380);
  });

  it('never scrolls to a negative offset for an early tab', () => {
    const tree = render('all');
    const scrollTo = jest.fn();
    tree.root.findByType(require('react-native').ScrollView).instance.scrollTo = scrollTo;
    layout(tree);

    expect(scrollTo.mock.calls[scrollTo.mock.calls.length - 1][0].x).toBe(0);
  });

  it('shows a trailing fade while there is more row, and none once scrolled to the end', () => {
    const tree = render('all');
    const scroll = layout(tree);
    const fades = () => tree.root.findAllByType('LinearGradient' as never);

    // At rest: more to the right, nothing to the left.
    expect(fades()).toHaveLength(1);

    act(() => {
      scroll.props.onScroll({ nativeEvent: { contentOffset: { x: 200 } } });
    });
    // Mid-scroll: both edges have more row behind them.
    expect(fades()).toHaveLength(2);

    act(() => {
      scroll.props.onScroll({ nativeEvent: { contentOffset: { x: 380 } } });
    });
    // At the end: only the leading fade remains.
    expect(fades()).toHaveLength(1);
  });

  it('does not fade either edge when the whole row fits', () => {
    const tree = render('all');
    layout(tree, 700, 700);
    expect(tree.root.findAllByType('LinearGradient' as never)).toHaveLength(0);
  });
});

describe('FilterTabs without counts', () => {
  const PLAIN: TabItem<'all' | 'active'>[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
  ];

  it('renders no badge, and leaves the label alone in the accessible name', () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<FilterTabs tabs={PLAIN} active="all" onChange={() => {}} />);
    });
    const tabs = tabNodes(tree);
    expect(tabs).toHaveLength(2);
    // With no count there is nothing to append — "All, 0 items" would be a lie.
    expect(tabs[0].props.accessibilityLabel).toBe('All');
    // The badge is the only Text beyond the label itself.
    expect(tree.root.findAllByType(Text).filter(t => typeof t.props.children === 'number')).toHaveLength(0);
  });
});

describe('SegmentedTabs', () => {
  type S = 'overview' | 'invoices' | 'payments';
  const SECTIONS: TabItem<S>[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Invoices', value: 'invoices' },
    { label: 'Payments', value: 'payments' },
  ];

  const renderSeg = (active: S, onChange: (v: S) => void = () => {}) => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SegmentedTabs tabs={SECTIONS} active={active} onChange={onChange} />);
    });
    return tree;
  };

  it('renders every section with its selection state', () => {
    const tree = renderSeg('invoices');
    const tabs = tabNodes(tree);
    expect(tabs).toHaveLength(3);
    expect(tabs.map(t => t.props.accessibilityState.selected)).toEqual([false, true, false]);
  });

  it('reports the tapped section to onChange', () => {
    const onChange = jest.fn();
    const tree = renderSeg('overview', onChange);
    act(() => {
      tabNodes(tree)[2].props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('payments');
  });

  it('does not scroll, so no section can be hidden', () => {
    const tree = renderSeg('overview');
    expect(tree.root.findAllByType(require('react-native').ScrollView)).toHaveLength(0);
  });
});
