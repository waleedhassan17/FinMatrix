// The item explorer's cards, as the website draws them: the figures that
// choose the chart, the item at a glance, where its revenue came from, where
// its stock stands and what a unit earns.
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

import MetricTiles from '../shared/MetricTiles';
import ItemIdentityCard from '../InventoryItemReport/ItemIdentityCard';
import ItemRevenueBreakdown from '../InventoryItemReport/ItemRevenueBreakdown';
import ItemStockPosition from '../InventoryItemReport/ItemStockPosition';
import ItemPriceMargin from '../InventoryItemReport/ItemPriceMargin';
import type { ItemFacts, ItemPerformance } from '../../../models/inventoryValuationModel';

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
const pressables = (tree: renderer.ReactTestRenderer, label: RegExp) =>
  tree.root.findAll(n => label.test(String(n.props?.accessibilityLabel ?? '')) && typeof n.props?.onPress === 'function');

const FACTS: ItemFacts = {
  category: 'FMCG',
  unitOfMeasure: 'unit',
  sellingPrice: 2350,
  unitCost: 1800,
  qtyOnHand: 45,
  stockValue: 81000,
  reorderPoint: 20,
  isActive: true,
  lastSoldDate: '2026-07-24',
  imageUrl: 'https://api.test/display.jpg',
  thumbnailUrl: 'https://api.test/thumb.jpg',
  location: null,
  stockStatus: 'ok',
  suggestedOrderQty: null,
  daysOfCover: 387,
  cover: { level: 'risk', guide: 'Two weeks to two months of stock is healthy.' },
  deadStock: false,
  lastOutboundDate: '2026-07-24',
};

const PERF: ItemPerformance = {
  itemId: 'i1',
  itemName: 'Cooking Oil 5L',
  sku: 'WC-OIL-5L',
  range: { startDate: '2026-01-01', endDate: '2026-10-28' },
  points: [],
  totals: { unitsSold: 35, revenue: 82250, cogs: 63000, grossProfit: 19250, marginPct: 23.4 },
  costHistoryFrom: null,
  estimatedCogsShare: 0,
  item: FACTS,
  customers: [
    { customerId: 'k1', customerName: 'Karim Store', unitsSold: 19, revenue: 44650, grossProfit: 10450, sharePct: 54.29 },
    { customerId: null, customerName: '(no customer)', unitsSold: 16, revenue: 37600, grossProfit: 8800, sharePct: 45.71 },
  ],
  otherCustomers: { count: 0, unitsSold: 0, revenue: 0, grossProfit: 0, sharePct: null },
  channels: [
    { key: 'invoice', unitsSold: 32, revenue: 75200, grossProfit: 17600, documents: 4, sharePct: 91.43 },
    { key: 'delivery', unitsSold: 3, revenue: 7050, grossProfit: 1650, documents: 1, sharePct: 8.57 },
  ],
  returns: { unitsSold: -1, revenue: -2350, grossProfit: -550, documents: 1 },
};

const breakdown = (props: Partial<React.ComponentProps<typeof ItemRevenueBreakdown>> = {}) =>
  render(
    <ItemRevenueBreakdown
      perf={PERF}
      dimension="customer"
      view="pie"
      onDimension={() => {}}
      onView={() => {}}
      windowLabel="Jan 1 – Oct 28, 2026"
      {...props}
    />,
  );

describe('MetricTiles v2', () => {
  it('shows each figure’s move, and reads it out with the figure', () => {
    const tree = render(
      <MetricTiles
        items={[
          { key: 'revenue', label: 'Revenue', value: 'Rs 82,250.00', change: { text: '+75%', tone: 'good' }, trend: [0, 1, 0, 2] },
          { key: 'margin', label: 'Margin', value: '—', caption: 'No sales in this window' },
        ]}
        selected="revenue"
        onSelect={() => {}}
      />,
    );
    const text = drawnText(tree);
    expect(text).toContain('▲ +75%');
    expect(text).toContain('No sales in this window');
    expect(pressables(tree, /^Revenue, Rs 82,250.00, \+75%\. Chart it$/).length).toBeGreaterThan(0);
  });
});

describe('ItemIdentityCard', () => {
  it('shows the photo to open, one stock badge, and the record’s facts', () => {
    const open = jest.fn();
    const tree = render(<ItemIdentityCard name="Cooking Oil 5L" sku="WC-OIL-5L" facts={FACTS} badge="dead" onOpenPhoto={open} />);
    const text = drawnText(tree);
    expect(text).toContain('Dead stock');
    expect(text).toContain('Nothing out in 180 days');
    expect(text).toContain('SKU WC-OIL-5L · FMCG');
    expect(text).toContain('Sold by unit');
    act(() => pressables(tree, /^View the photo of Cooking Oil 5L full size$/)[0].props.onPress());
    expect(open).toHaveBeenCalled();
  });
});

describe('ItemRevenueBreakdown', () => {
  it('rings revenue by customer, and only a real customer’s row opens', () => {
    const onCustomer = jest.fn();
    const tree = breakdown({ onCustomer });
    const text = drawnText(tree);
    expect(text).toContain('Revenue by customer');
    expect(text).toContain('Returns (Rs 2,350.00) · 1 unit — taken off revenue');
    const rows = pressables(tree, /^Open /);
    expect(rows.map(r => r.props.accessibilityLabel)).toEqual([expect.stringMatching(/^Open Karim Store:/)]);
    act(() => rows[0].props.onPress());
    expect(onCustomer).toHaveBeenCalledWith('k1');
  });

  it('offers the channel view when the item went out both ways', () => {
    const tree = breakdown({ dimension: 'channel' });
    const text = drawnText(tree);
    expect(text).toContain('Revenue by channel');
    expect(text).toContain('Invoices');
    expect(text).toContain('Deliveries');
  });

  it('offers no channel view for an item that went out one way', () => {
    const tree = breakdown({ perf: { ...PERF, channels: [PERF.channels![0]] }, dimension: 'channel' });
    const text = drawnText(tree);
    expect(text).toContain('Revenue by customer');
    expect(text).not.toContain('Channel');
  });

  it('draws bars, and says why, when a customer returned more than they bought', () => {
    const tree = breakdown({
      perf: { ...PERF, customers: [{ ...PERF.customers[0], revenue: -100, sharePct: null }] },
    });
    expect(drawnText(tree)).toContain('A customer returned more than they bought, so this shows as bars.');
  });

  it('says so when the item did not sell', () => {
    const tree = breakdown({
      perf: { ...PERF, totals: { unitsSold: 0, revenue: 0, cogs: 0, grossProfit: 0, marginPct: null }, customers: [], channels: [], returns: null },
    });
    expect(drawnText(tree)).toContain('Not sold in this window, so there is no revenue to break down.');
  });
});

describe('ItemStockPosition', () => {
  it('reads on hand against the reorder point, with the server’s verdict on cover', () => {
    const tree = render(<ItemStockPosition facts={FACTS} onHand={45} cover={{ days: 387, assessment: FACTS.cover }} sinceSold={96} />);
    const text = drawnText(tree);
    expect(text).toContain('45 units');
    expect(text).toContain('25 units above the reorder point');
    expect(text).toContain('Over a year');
    expect(text).toContain('At risk');
    expect(text).toContain('96 days ago');
  });

  it('suggests the reorder list’s order when low, but never for dead stock', () => {
    const low = render(
      <ItemStockPosition facts={{ ...FACTS, qtyOnHand: 12, suggestedOrderQty: 30 }} onHand={12} cover={null} sinceSold={null} />,
    );
    expect(drawnText(low)).toContain('Suggested order 30 units');
    const dead = render(
      <ItemStockPosition
        facts={{ ...FACTS, qtyOnHand: 5, suggestedOrderQty: 15, deadStock: true }}
        onHand={5}
        cover={null}
        sinceSold={null}
      />,
    );
    expect(drawnText(dead)).not.toContain('Suggested order');
    expect(drawnText(dead)).toContain('15 units below the reorder point');
  });
});

describe('ItemPriceMargin', () => {
  it('sets the price against cost and against what it sold for', () => {
    const tree = render(<ItemPriceMargin facts={FACTS} totals={{ revenue: 82250, unitsSold: 35 }} />);
    const text = drawnText(tree);
    expect(text).toContain('Rs 550.00');
    expect(text).toContain('23.4% of the price');
    expect(text).toContain('At list price');
    expect(text).toMatch(/Cost 76\.6 ?%/);
  });

  it('says a price below cost in words', () => {
    const tree = render(<ItemPriceMargin facts={{ ...FACTS, sellingPrice: 100, unitCost: 120 }} totals={null} />);
    const text = drawnText(tree);
    expect(text).toContain('Below cost');
    expect(text).toContain('(Rs 20.00)');
  });
});
