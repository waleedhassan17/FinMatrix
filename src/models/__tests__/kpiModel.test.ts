import {
  STATUS_CAPTION,
  asKpiStatus,
  asKpiUnit,
  assessmentLabel,
  deltaTone,
  formatKpiChange,
  formatKpiValue,
  inputLabel,
  kpiContext,
  kpiDelta,
} from '../kpiModel';

describe('formatKpiValue', () => {
  it('formats each unit', () => {
    expect(formatKpiValue(125000, 'money')).toBe('Rs 125,000.00');
    expect(formatKpiValue(1.8, 'ratio')).toBe('1.80×');
    expect(formatKpiValue(42.4, 'days')).toBe('42 days');
    expect(formatKpiValue(1, 'days')).toBe('1 day');
    expect(formatKpiValue(5.24, 'months')).toBe('5.2 months');
    expect(formatKpiValue(41.25, 'percent')).toBe('41.3%');
  });

  it('puts a negative amount in parentheses, and the rest behind a minus', () => {
    expect(formatKpiValue(-500, 'money')).toBe('(Rs 500.00)');
    expect(formatKpiValue(-3.1, 'percent')).toBe('−3.1%');
    expect(formatKpiValue(-0.4, 'ratio')).toBe('−0.40×');
    expect(formatKpiValue(-12, 'days')).toBe('−12 days');
  });

  it('shows a dash for a KPI the server could not compute', () => {
    expect(formatKpiValue(null, 'ratio')).toBe('—');
  });
});

describe('kpi direction', () => {
  it('colours a falling DSO as good and a falling revenue as bad', () => {
    expect(deltaTone('dso', -4)).toBe('good');
    expect(deltaTone('dso', 4)).toBe('bad');
    expect(deltaTone('revenue', -100)).toBe('bad');
    expect(deltaTone('revenue', 100)).toBe('good');
  });

  it('never colours a zero move or an unfamiliar KPI', () => {
    expect(deltaTone('revenue', 0)).toBe('neutral');
    expect(deltaTone('revenue', null)).toBe('neutral');
    expect(deltaTone('somethingNew', 10)).toBe('neutral');
  });
});

describe('kpiDelta', () => {
  it('prefers the server percentage change', () => {
    expect(kpiDelta({ key: 'revenue', unit: 'money', change: 1200, changePct: 12.34 })).toEqual({
      text: '+12.3%',
      tone: 'good',
      rising: true,
    });
  });

  it('gives a margin its change in points', () => {
    expect(kpiDelta({ key: 'grossMarginPct', unit: 'percent', change: -2.5, changePct: -6.1 })).toEqual({
      text: '−2.5 pts',
      tone: 'bad',
      rising: false,
    });
  });

  it('falls back to the change in the KPI unit', () => {
    expect(kpiDelta({ key: 'dso', unit: 'days', change: 4, changePct: null })?.text).toBe('+4 days');
    expect(formatKpiChange(-1200, 'money')).toBe('−Rs 1,200.00');
  });

  it('says nothing when there is nothing to compare', () => {
    expect(kpiDelta({ key: 'dso', unit: 'days', change: null, changePct: null })).toBeNull();
  });
});

describe('payload hygiene', () => {
  it('reads unknown units and statuses safely', () => {
    expect(asKpiUnit('furlongs')).toBe('money');
    expect(asKpiStatus('weird', null)).toBe('no_denominator');
    expect(asKpiStatus(undefined, 3)).toBe('ok');
    expect(asKpiStatus('cash_positive', null)).toBe('cash_positive');
  });

  it('names an input in words', () => {
    expect(inputLabel('currentLiabilities')).toBe('Current liabilities');
    expect(inputLabel('cogs_trailing_90d')).toBe('Cogs trailing 90d');
  });
});

describe('KPI verdicts and figures — the website’s words', () => {
  it('names the three verdicts, and nothing for neutral or none', () => {
    expect(assessmentLabel({ level: 'healthy', guide: '' })).toBe('Healthy');
    expect(assessmentLabel({ level: 'watch', guide: '' })).toBe('Watch');
    expect(assessmentLabel({ level: 'risk', guide: '' })).toBe('At risk');
    expect(assessmentLabel({ level: 'neutral', guide: '' })).toBeNull();
    expect(assessmentLabel(null)).toBeNull();
  });

  it('reads the inputs back in short words, and the cash cycle as its sum', () => {
    expect(kpiContext({ key: 'currentRatio', inputs: { currentAssets: 1_470_000, currentLiabilities: 774_000 } })).toBe(
      'Rs 1.5M current assets · Rs 774K current liabilities',
    );
    expect(kpiContext({ key: 'ccc', inputs: { dso: 92.6, dio: 2873.7, dpo: 785.9 } })).toBe('93 + 2,874 − 786 days');
    expect(kpiContext({ key: 'cashAndBank', inputs: { cashAndBank: 5 } })).toBeNull();
  });

  it('labels inputs and missing values as the website does', () => {
    expect(inputLabel('revenue90')).toBe('Revenue, last 90 days');
    expect(inputLabel('someNewInput')).toBe('Some new input');
    expect(STATUS_CAPTION.cash_positive).toBe('Cash-positive — no burn');
    expect(STATUS_CAPTION.no_denominator).toBe('Not enough activity to measure');
  });
});
