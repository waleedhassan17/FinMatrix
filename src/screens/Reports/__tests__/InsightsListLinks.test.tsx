// What stands out links each insight to its report — but only to a report
// this tier has. A budget insight on a tier without budgets reads as plain
// text, never as a link that does nothing.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import InsightsList from '../shared/InsightsList';
import type { BusinessInsight } from '../../../models/insightModel';

const INSIGHTS: BusinessInsight[] = [
  { key: 'revenue', tone: 'positive', title: 'Revenue up 12%', detail: 'Against the previous period.', report: { key: 'profitLoss', params: {} } },
  { key: 'budget', tone: 'warning', title: 'Over budget', detail: 'Spending is 8% over plan.', report: { key: 'budgets', params: { budgetId: 'b1' } } },
];

const linked = (tree: renderer.ReactTestRenderer) =>
  new Set(
    tree.root
      .findAll(n => typeof n.props?.onPress === 'function' && typeof n.props?.accessibilityLabel === 'string')
      .map(n => String(n.props.accessibilityLabel)),
  );

describe('InsightsList links', () => {
  it('links only the insights whose report can be opened', () => {
    const onOpen = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <InsightsList insights={INSIGHTS} onOpen={onOpen} canOpen={i => i.report.key !== 'budgets'} />,
      );
    });
    const labels = [...linked(tree)];
    expect(labels).toHaveLength(1);
    expect(labels[0]).toContain('Revenue up 12%');
    expect(labels.some(l => l.includes('Over budget'))).toBe(false);
    act(() => tree.unmount());
  });
});
