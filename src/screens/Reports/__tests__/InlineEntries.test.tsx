// Feather reaches for expo-font → expo-modules-core, which has no native side
// under Jest; the gradient is a native view. Host-component stubs are enough.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
// react-redux ships ESM the preset does not transform; the kit only reads the
// company name through it.
jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (): null => null,
  useAppDispatch: () => jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
// The kit's company fallback lives beside the invoice PDF, which loads expo-print.
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Your Company', addressLine1: '' } }));
jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';

import InlineEntries from '../shared/InlineEntries';
import { KpiCard, TieOutBadge } from '../../../components/reports/ReportUI';
import type { AccountRegister, RegisterState } from '../../../models/accountRegisterModel';

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

// Every tree is unmounted after its test: the skeleton's pulse is an endless
// animation loop, and a mounted one keeps Jest from exiting.
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

const register = (n: number, total: number): AccountRegister => ({
  account: { accountCode: '4000', accountName: 'Sales Revenue', accountType: 'revenue', subType: '' },
  range: { startDate: '2026-01-01', endDate: '2026-03-31' },
  openingBasis: 'cumulative',
  openingBalance: 0,
  periodDebit: 0,
  periodCredit: 0,
  closingBalance: 0,
  periodNet: null,
  entries: Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    date: '2026-03-0' + (i + 1),
    reference: `JE-00${i}`,
    memo: '',
    debit: 0,
    credit: 100,
    amount: i === 0 ? -250 : 100,
    runningBalance: 0,
    sourceType: i === 0 ? 'payment' : 'invoice',
    sourceId: `id${i}`,
    sourceLabel: i === 0 ? 'Payment' : 'Invoice',
    documentNumber: `INV-${i}`,
    counterpartyName: 'Acme Ltd',
  })),
  total,
  page: 1,
  limit: 5,
});

const ok = (data: AccountRegister): RegisterState => ({ status: 'succeeded', error: '', data });

describe('InlineEntries', () => {
  it('skeletons a first load', () => {
    const tree = render(<InlineEntries state={undefined} onRetry={jest.fn()} />);
    expect(tree.root.findAll(n => n.props?.accessibilityLabel === 'Loading').length).toBeGreaterThan(0);
  });

  it('lists the latest postings, the document first, negatives in parentheses', () => {
    const tree = render(<InlineEntries state={ok(register(3, 3))} onRetry={jest.fn()} onOpenRegister={jest.fn()} />);
    const text = drawnText(tree);
    expect(text).toContain('INV-0');
    expect(text).toContain('Acme Ltd');
    expect(text).toContain('(Rs 250.00)');
    expect(text).toContain('Open register');
    expect(text).not.toContain('all 3');
  });

  it('says how many more the register holds', () => {
    const tree = render(<InlineEntries state={ok(register(5, 23))} onRetry={jest.fn()} onOpenRegister={jest.fn()} />);
    expect(drawnText(tree)).toContain('all 23');
  });

  it('opens only the documents that have a screen', () => {
    const onOpen = jest.fn();
    const tree = render(<InlineEntries state={ok(register(2, 2))} onRetry={jest.fn()} onOpenSource={onOpen} />);
    const rows = tree.root.findAll(
      n => typeof n.props?.onPress === 'function' && typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes('INV-'),
    );
    const payment = rows.find(r => r.props.accessibilityLabel.startsWith('Payment'));
    const invoice = rows.find(r => r.props.accessibilityLabel.startsWith('Invoice'));
    expect(payment?.props.disabled).toBe(true);
    expect(invoice?.props.disabled).toBe(false);
    act(() => invoice!.props.onPress());
    expect(onOpen).toHaveBeenCalledWith('invoice', 'id1');
  });

  it('offers a retry on failure, but not for a server without registers', () => {
    const failed = render(
      <InlineEntries state={{ status: 'failed', error: 'Network unreachable', data: null }} onRetry={jest.fn()} />,
    );
    expect(drawnText(failed)).toContain('Network unreachable');
    expect(drawnText(failed)).toContain('Try again');

    const missing = render(
      <InlineEntries state={{ status: 'failed', error: 'Not Found', data: null, notFound: true }} onRetry={jest.fn()} />,
    );
    expect(drawnText(missing)).toContain('not available');
    expect(drawnText(missing)).not.toContain('Try again');
  });

  it('says so when the period is empty', () => {
    const tree = render(<InlineEntries state={ok(register(0, 0))} onRetry={jest.fn()} />);
    expect(drawnText(tree)).toContain('No transactions in this period.');
  });
});

describe('KpiCard', () => {
  it('formats the value, colours the move, and explains a missing figure', () => {
    const tree = render(
      <KpiCard kpi={{ key: 'dso', label: 'DSO', value: 38, unit: 'days', status: 'ok', change: -4, changePct: null, prior: 42 }} />,
    );
    const text = drawnText(tree);
    expect(text).toContain('38 days');
    expect(text).toContain('−4 days');
    expect(text).toContain('vs 42 days');

    const none = render(
      <KpiCard kpi={{ key: 'runwayMonths', label: 'Runway', value: null, unit: 'months', status: 'cash_positive' }} />,
    );
    expect(drawnText(none)).toContain('—');
    expect(drawnText(none)).toContain('no burn');
  });

  it('opens its formula from the info button', () => {
    const onInfo = jest.fn();
    const tree = render(
      <KpiCard kpi={{ key: 'currentRatio', label: 'Current ratio', value: 1.8, unit: 'ratio', status: 'ok' }} onInfo={onInfo} />,
    );
    const info = tree.root.find(n => n.props?.accessibilityLabel === 'How Current ratio is worked out' && typeof n.props?.onPress === 'function');
    act(() => info.props.onPress());
    expect(onInfo).toHaveBeenCalled();
  });
});

describe('TieOutBadge', () => {
  it('states the verdict and any gap', () => {
    expect(drawnText(render(<TieOutBadge state="balanced" />))).toContain('Balanced');
    expect(drawnText(render(<TieOutBadge state="gap" gap={-12.5} />))).toContain('Gap (Rs 12.50)');
    expect(drawnText(render(<TieOutBadge state="gap" label="Ending cash = Balance Sheet cash" />))).toContain(
      'does not tie',
    );
  });
});
