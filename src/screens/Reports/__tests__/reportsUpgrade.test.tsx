// The report pieces the app shares with the website: KPI cards with the
// server's verdict and their figures, the donut and its table, what stands
// out, and the cash flow month by month.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (): null => null,
  useAppDispatch: () => jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { KpiCard } from '../../../components/reports/ReportUI';
import DonutChart from '../shared/DonutChart';
import InsightsList from '../shared/InsightsList';
import CashFlowMonthly from '../CashFlow/CashFlowMonthly';
import { OTHER_KEY } from '../../../models/chartSlicesModel';
import { CATEGORY_PALETTE } from '../../../theme/theme';

const drawnText = (tree: renderer.ReactTestRenderer): string =>
  tree.root
    .findAll(() => true)
    .flatMap(n => {
      const c = n.props?.children;
      return Array.isArray(c) ? c : [c];
    })
    .filter(c => typeof c === 'string' || typeof c === 'number')
    .map(String)
    .join(' ')
    .replace(/\s+/g, ' ');

const mounted: renderer.ReactTestRenderer[] = [];
afterEach(() => {
  act(() => mounted.splice(0).forEach(t => t.unmount()));
});
const render = (el: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(el);
  });
  mounted.push(tree);
  return tree;
};
const pressable = (tree: renderer.ReactTestRenderer, label: string) =>
  tree.root.find(n => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function');

describe('KpiCard v2', () => {
  it('wears the server’s verdict and reads its figures under the value', () => {
    const tree = render(
      <KpiCard
        kpi={{
          key: 'currentRatio',
          label: 'Current ratio',
          value: 1.89,
          unit: 'ratio',
          status: 'ok',
          inputs: { currentAssets: 1_470_000, currentLiabilities: 774_000 },
          assessment: { level: 'healthy', guide: 'Above 1.5× is generally comfortable.' },
        }}
      />,
    );
    const text = drawnText(tree);
    expect(text).toContain('1.89×');
    expect(text).toContain('Healthy');
    expect(text).toContain('Rs 1.5M current assets · Rs 774K current liabilities');
  });

  it('says why a value is missing in its place, not as a dash', () => {
    const tree = render(<KpiCard kpi={{ key: 'runwayMonths', label: 'Cash runway', value: null, unit: 'months', status: 'cash_positive' }} />);
    const text = drawnText(tree);
    expect(text).toContain('Cash-positive — no burn');
    // No text node is the bare dash a missing value used to print.
    expect(tree.root.findAll(n => n.props?.children === '—')).toHaveLength(0);
  });

  it('shows no pill from a server that sent no verdict', () => {
    const tree = render(<KpiCard kpi={{ key: 'dso', label: 'DSO', value: 38, unit: 'days', status: 'ok' }} />);
    expect(drawnText(tree)).not.toMatch(/Healthy|Watch|At risk/);
  });
});

describe('DonutChart', () => {
  const slices = [
    { key: 'grocery', label: 'Grocery', value: 7500, count: 12 },
    { key: 'tools', label: 'Tools', value: 2000, count: 3 },
    { key: OTHER_KEY, label: 'Other (4)', value: 500, count: 6 },
  ];

  it('names every slice with its value and share, and the whole at the foot', () => {
    const tree = render(
      <DonutChart
        title="Stock value by category"
        slices={slices}
        palette={CATEGORY_PALETTE}
        centerLabel="Stock value"
        labelHeader="Category"
        countLabel={n => `${n} items`}
      />,
    );
    const text = drawnText(tree);
    expect(text).toContain('Grocery');
    expect(text).toContain('75%');
    expect(text).toContain('5.0%');
    expect(text).toContain('12 items');
    expect(text).toContain('Total');
    expect(text).toContain('Rs 10K');
  });

  it('makes each named slice a choice, and never Other', () => {
    const onSelect = jest.fn();
    const tree = render(
      <DonutChart
        title="Stock value by category"
        slices={slices}
        palette={CATEGORY_PALETTE}
        centerLabel="Stock value"
        labelHeader="Category"
        onSelect={onSelect}
        selectVerb="List the items in"
      />,
    );
    act(() => pressable(tree, 'List the items in Grocery: (Rs 7,500.00), 75%'.replace('(Rs 7,500.00)', 'Rs 7,500.00')).props.onPress());
    expect(onSelect).toHaveBeenCalledWith('grocery');
    expect(tree.root.findAll(n => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('List the items in Other'))).toHaveLength(0);
  });
});

describe('InsightsList', () => {
  it('says each finding with a spoken tone, and opens its report', () => {
    const onOpen = jest.fn();
    const insight = {
      key: 'collections',
      tone: 'negative' as const,
      title: 'Customers take 93 days to pay',
      detail: 'The aging report shows who to chase first.',
      report: { key: 'arAging', params: {} },
    };
    const tree = render(<InsightsList insights={[insight]} onOpen={onOpen} />);
    expect(drawnText(tree)).toContain('Customers take 93 days to pay');
    expect(drawnText(tree)).toContain('AR Aging ›');
    act(() =>
      pressable(
        tree,
        'Needs attention. Customers take 93 days to pay. The aging report shows who to chase first. Opens AR Aging',
      ).props.onPress(),
    );
    expect(onOpen).toHaveBeenCalledWith(insight);
  });
});

describe('CashFlowMonthly', () => {
  it('names the strongest and weakest month from the server’s months', () => {
    const tree = render(
      <CashFlowMonthly
        months={[
          { period: '2026-08', label: 'Aug 26', inflow: 90000, outflow: 50000, net: 40000, endingCash: 440000 },
          { period: '2026-09', label: 'Sep 26', inflow: 100000, outflow: 40000, net: 60000, endingCash: 500000 },
        ]}
      />,
    );
    const text = drawnText(tree);
    expect(text).toMatch(/Strongest month ?: Sep 26 · \+Rs 60,000\.00 net/);
    expect(text).toMatch(/Weakest month ?: Aug 26 · \+Rs 40,000\.00 net/);
    expect(text).toContain('Ends Rs 500,000.00');
  });
});
