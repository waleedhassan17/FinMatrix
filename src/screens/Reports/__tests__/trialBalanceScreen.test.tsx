// The trial balance reads like the other statements: headline figures, the
// title block and whether it balances, one card per group, and a group whose
// accounts sit on both sides footed on two lines rather than one that wraps.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../utils/invoicePdf', () => ({ DEFAULT_COMPANY: { name: 'Warehouse Co', addressLine1: '' } }));
jest.mock('../shared/useShareReportPdf', () => ({ useShareReportPdf: () => ({ busy: false, share: jest.fn() }) }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: (): { params: undefined } => ({ params: undefined }),
  useFocusEffect: (): void => undefined,
}));
jest.mock('../TrialBalance/trialBalanceSlice', () => ({
  selectTrialBalanceState: 'trialBalance',
  fetchTrialBalanceReport: () => ({ type: 'tb/fetch' }),
  setTrialBalanceMode: () => ({ type: 'tb/mode' }),
  setTrialBalanceRange: () => ({ type: 'tb/range' }),
  refreshTrialBalanceRange: () => ({ type: 'tb/refresh' }),
}));

import type { TrialBalanceReport, TrialBalanceRow } from '../../../models/trialBalanceModel';

const row = (code: string, name: string, group: string, debit: number, credit: number, flags: string[] = []): TrialBalanceRow => ({
  accountCode: code,
  accountName: name,
  debit,
  credit,
  accountType: null,
  subType: null,
  group,
  flags,
  synthetic: false,
  pairs: null,
});

const mockReport: TrialBalanceReport = {
  range: { startDate: '2026-01-01', endDate: '2026-11-09' },
  rows: [
    row('1000', 'Cash', 'cashAndBank', 0, 596776.57, ['abnormal_balance']),
    row('1010', 'Business Checking', 'cashAndBank', 3371237.22, 0),
    row('3900', 'Opening Balance Equity', 'equity', 0, 2774460.65),
  ],
  totalDebits: 3371237.22,
  totalCredits: 3371237.22,
  isBalanced: true,
  mode: 'closing',
  asOfDate: '2026-11-09',
  fiscalYearStart: '2026-01-01',
  groups: [
    { key: 'cashAndBank', label: 'Cash and Bank', debit: 3371237.22, credit: 596776.57, pairs: null },
    { key: 'equity', label: 'Equity', debit: 0, credit: 2774460.65, pairs: null },
  ],
  totals: null,
  balanced: null,
  warnings: [],
};

const mockState = {
  range: mockReport.range,
  isCustomRange: false,
  mode: 'closing',
  report: mockReport,
  isLoading: false,
  error: '',
};

jest.mock('../../../hooks/useReduxHooks', () => ({
  useAppSelector: (sel: unknown) => (sel === 'trialBalance' ? mockState : null),
  useAppDispatch: () => jest.fn(),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TrialBalanceScreen from '../TrialBalance/TrialBalanceScreen';

const drawnText = (tree: renderer.ReactTestRenderer | renderer.ReactTestInstance): string =>
  ('root' in tree ? tree.root : tree)
    .findAll(() => true)
    .flatMap(n => {
      const c = n.props?.children;
      return Array.isArray(c) ? c : [c];
    })
    .filter(c => typeof c === 'string' || typeof c === 'number')
    .map(String)
    .join(' ')
    .replace(/\s+/g, ' ');

describe('TrialBalanceScreen', () => {
  let tree: renderer.ReactTestRenderer;
  beforeEach(() => {
    act(() => {
      tree = renderer.create(<TrialBalanceScreen />);
    });
  });
  afterEach(() => act(() => tree.unmount()));

  it('opens with the headline figures, the title block and the verdict', () => {
    const text = drawnText(tree);
    expect(text).toContain('Every account, debits against credits');
    expect(text).toContain('Total debits');
    expect(text).toContain('Flagged accounts');
    expect(text).toContain('Balances worth a second look');
    expect(text).toContain('Warehouse Co');
    expect(text).toContain('As of November 9, 2026');
    expect(text).toContain('Balanced — Debits = Credits');
  });

  it('puts each group in its own card with its total', () => {
    const text = drawnText(tree);
    expect(text).toContain('Cash and Bank');
    expect(text).toContain('2 accounts');
    expect(text).toContain('Total Cash and Bank');
    expect(text).toContain('Equity');
    expect(text).toContain('1 account');
  });

  it('foots a two-sided group on two lines, not one', () => {
    const text = drawnText(tree);
    expect(text).not.toContain('Dr · ');
    const total = tree.root.find(n => /^Total Cash and Bank, debit/.test(String(n.props?.accessibilityLabel ?? '')));
    const figures = drawnText(total);
    expect(figures).toContain('Rs 3,371,237.22 Dr');
    expect(figures).toContain('Rs 596,776.57 Cr');
  });

  it('pads the header by the window inset, not a per-screen measurement', () => {
    const padded = tree.root.findAll(n => n.props?.style && JSON.stringify(n.props.style).includes('"paddingTop":24'));
    expect(padded.length).toBeGreaterThan(0);
  });
});
