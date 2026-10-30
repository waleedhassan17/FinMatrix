// Capture reports v2 responses from the LOCAL API and print the parity figures.
// GET requests only (plus the sign-in). Usage:
//   CAPTURE_PASSWORD=… node scripts/capture-report-fixtures.js src/serializers/__tests__/fixtures/captured [email] [apiBase]
// Credentials: a local demo login. The password comes from CAPTURE_PASSWORD
// and is never written here; the script refuses any API that is not local.
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const EMAIL = process.argv[3] || 'warehouse@gmail.com';
const API = process.argv[4] || 'http://localhost:3000/api/v1';
if (!/localhost|127\.0\.0\.1/.test(API)) {
  console.error('Refusing: this script only talks to a local API.');
  process.exit(1);
}
const PASSWORD = process.env.CAPTURE_PASSWORD;
if (!PASSWORD) {
  console.error('Set CAPTURE_PASSWORD to the local demo login\'s password.');
  process.exit(1);
}
const AS_OF = '2026-10-26';
const FY = { startDate: '2026-01-01', endDate: AS_OF };
const Q3 = { startDate: '2026-07-01', endDate: '2026-09-30' };

const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)).toString();

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const login = await fetch(`${API}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, email: EMAIL, password: PASSWORD, portal: 'admin' }),
  }).then(r => r.json());
  const d = login.data ?? login;
  const token = d.tokens?.accessToken ?? d.tokens?.access_token ?? d.accessToken;
  const companyId = d.companyId;
  if (!token) throw new Error(`sign-in failed: ${JSON.stringify(login.error ?? login).slice(0, 200)}`);
  const company = d.company?.name ?? EMAIL;
  const get = async (p, q = {}) => {
    const url = `${API}${p}${Object.keys(q).length ? `?${qs(q)}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'x-company-id': companyId } });
    const body = await r.json().catch(() => null);
    return { status: r.status, body, url: url.replace(API, '') };
  };
  const unwrap = b => (b && b.success && b.data !== undefined ? b.data : b);
  const saved = [];
  const save = (name, res) => {
    fs.writeFileSync(
      path.join(OUT, `${name}.captured.json`),
      JSON.stringify(
        {
          _source: `Captured ${new Date().toISOString().slice(0, 10)} from the local v2 API (FinMatrix-Backend working tree), ${company}, GET ${res.url}`,
          _status: res.status,
          response: res.body,
        },
        null,
        2,
      ) + '\n',
    );
    saved.push(`${name}(${res.status})`);
    if (res.status >= 400) throw new Error(`${name}: ${res.status} ${JSON.stringify(res.body?.error ?? res.body).slice(0, 200)}`);
    return unwrap(res.body);
  };

  const bs = save('balanceSheet', await get('/reports/balance-sheet', { asOfDate: AS_OF, compareTo: '2026-09-30' }));
  save('retainedEarnings', await get('/reports/balance-sheet/retained-earnings', { asOfDate: AS_OF }));
  const health = save('financialHealth', await get('/reports/financial-health', { asOfDate: AS_OF }));
  const tbC = save('trialBalance.closing', await get('/reports/trial-balance', { ...FY, mode: 'closing' }));
  const tbW = save('trialBalance.working', await get('/reports/trial-balance', { ...Q3, mode: 'working' }));
  const tbM = save('trialBalance.movement', await get('/reports/trial-balance', { ...FY, mode: 'movement' }));
  const cf = save('cashFlow', await get('/reports/cash-flow', FY));
  const keyed = [...cf.operating.lines, ...cf.investing.lines, ...cf.financing.lines].filter(l => l.lineKey);
  const firstLine = keyed.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  const cfl = firstLine ? save('cashFlowLine', await get(`/reports/cash-flow/lines/${firstLine.lineKey}/entries`, { ...FY, limit: 200 })) : null;
  const ar = save('arAging', await get('/reports/ar-aging'));
  const ap = save('apAging', await get('/reports/ap-aging'));
  const ih = save('inventoryHealth', await get('/reports/inventory-health'));
  const iv = save('inventoryValuation.asOf', await get('/reports/inventory-valuation', { asOfDate: '2026-06-30' }));
  const an = save('analytics', await get('/reports/analytics', Q3));
  const cashCode = bs.sections?.find(s => s.key === 'cashAndBank')?.lines?.[0]?.accountCode;
  const reg = cashCode ? save('register', await get(`/reports/accounts/${cashCode}/register`, { ...FY, limit: 200 })) : null;
  const revCode = bs && (tbM.rows ?? []).find(r => r.group === 'income')?.accountCode;
  const mv = revCode ? save('movement', await get(`/reports/accounts/${revCode}/movement`, Q3)) : null;

  // ── Parity figures ─────────────────────────────────────────────
  const r2 = n => Math.round(n * 100) / 100;
  const sum = (a, f) => (a ?? []).reduce((t, x) => t + (Number(f(x)) || 0), 0);
  const ok = b => (b ? 'OK' : 'MISMATCH');
  const out = [];
  const p = s => out.push(s);
  p(`Company: ${company}. Saved: ${saved.join(', ')}`);
  p('');
  p(`Balance sheet ${AS_OF} vs 2026-09-30`);
  p(`  assets ${bs.totalAssets} · liabilities ${bs.totalLiabilities} · equity ${bs.totalEquity} · L+E ${bs.totalLiabilitiesAndEquity} · gap ${bs.gap} · balanced ${bs.isBalanced} · FY start ${bs.fiscalYearStart}`);
  p(`  A = L + E: ${ok(Math.abs(bs.totalAssets - bs.totalLiabilitiesAndEquity) < 0.01)} · sections ${bs.sections.map(s => `${s.key}=${s.subtotal}`).join(' ')}`);
  const eq = (bs.equity ?? []).filter(l => l.accountCode);
  p(`  synthetic equity: ${(bs.equity ?? []).filter(l => l.synthetic).map(l => `${l.synthetic}=${l.amount}`).join(', ') || 'none'} · no duplicate equity codes: ${ok(new Set(eq.map(l => l.accountCode)).size === eq.length)}`);
  p('');
  for (const [name, tb] of [['closing', tbC], ['working', tbW], ['movement', tbM]]) {
    p(`Trial balance ${name}: debits ${tb.totalDebits} · credits ${tb.totalCredits} · balanced ${tb.isBalanced} · rows ${tb.rows?.length} · groups ${tb.groups?.length} · flagged ${(tb.rows ?? []).filter(r => r.flags?.length).length}${tb.warnings?.length ? ` · warnings ${tb.warnings.map(w => w.code).join(',')}` : ''}`);
  }
  p('');
  const secs = r2(cf.operating.total + cf.investing.total + cf.financing.total);
  p(`Cash flow FY: operating ${cf.operating.total} · investing ${cf.investing.total} · financing ${cf.financing.total} · net ${cf.netChange} · begin ${cf.beginningCash} · end ${cf.endingCash}`);
  p(`  sections = net change: ${ok(Math.abs(secs - cf.netChange) < 0.01)} · ending = BS cash (${cf.cashTie?.balanceSheetCash}): ${ok(cf.cashTie?.ties === true)} · Σ accounts.ending = ending: ${ok(Math.abs(sum(cf.accounts, a => a.ending) - cf.endingCash) < 0.01)} · indirect = direct operating: ${ok(Math.abs((cf.operatingIndirect?.total ?? NaN) - cf.operating.total) < 0.01)}`);
  if (cfl) p(`  line ${cfl.lineKey}: Σ allocatedAmount ${r2(sum(cfl.entries, e => e.allocatedAmount))} vs lineAmount ${cfl.lineAmount} (${cfl.entries.length}/${cfl.total} rows): ${ok(cfl.entries.length < cfl.total || Math.abs(sum(cfl.entries, e => e.allocatedAmount) - cfl.lineAmount) < 0.01)} · split rows ${cfl.entries.filter(e => e.allocationPct < 100).length}`);
  p('');
  for (const [name, ag] of [['AR', ar], ['AP', ap]]) {
    const i = ag.insights ?? {};
    const days = i.dso ?? i.dpo;
    p(`${name} aging: open ${i.totalOpen} (totals ${ag.totals?.total}) · overdue ${i.overdue} (${i.overduePct}%) · weighted days ${i.weightedAvgDaysOverdue} · top-5 ${i.top5SharePct}% · ${days?.key}=${days?.value} (${days?.status})`);
    p(`  Σ schedule = totalOpen: ${ok(Math.abs(sum(i.schedule, s => s.amount) - (i.totalOpen ?? 0)) < 0.01)} · over limit ${(ag.rows ?? []).filter(r => r.overLimit).length}`);
  }
  p('');
  p(`Inventory health: below reorder ${ih.belowReorder?.length} · dead ${ih.deadStock?.items?.length} worth ${ih.deadStock?.totalValue} · turnover ${ih.turnover?.value} (${ih.turnover?.status}) · DIO12 ${ih.dio?.value} · stock ${ih.totals?.stockValue} ≤ valuation ${ih.totals?.valuationTotal}: ${ok((ih.totals?.stockValue ?? 0) <= (ih.totals?.valuationTotal ?? 0) + 0.01)}`);
  p(`Dated valuation 2026-06-30: total ${iv.totalValue} · GL1200 ${iv.ledgerTie?.gl1200} · gap ${iv.ledgerTie?.gap} · coverage ${iv.coverage?.pct}%`);
  p('');
  p(`Financial health: ${(health.kpis ?? []).map(k => `${k.key}=${k.value === null ? `null(${k.status})` : k.value}`).join(' · ')}`);
  p('');
  const rev = (an.kpis ?? []).find(k => k.key === 'revenue');
  p(`Cockpit Q3 vs ${an.comparisonRange?.startDate}..${an.comparisonRange?.endDate}: ${(an.kpis ?? []).map(k => `${k.key}=${k.current}`).join(' · ')}`);
  p(`  Σ series.revenue ${r2(sum(an.series, s => s.revenue))} = revenue KPI ${rev?.current}: ${ok(Math.abs(sum(an.series, s => s.revenue) - (rev?.current ?? 0)) < 0.01)} · months ${an.series?.length} · budget ${an.budgetVsActual ? 'yes' : 'none'}`);
  if (reg) {
    p('');
    p(`Register ${cashCode} FY: opening ${reg.openingBalance} (${reg.openingBasis}) · Dr ${reg.periodDebit} · Cr ${reg.periodCredit} · net ${reg.periodNet} · closing ${reg.closingBalance} (${reg.entries.length}/${reg.total} rows)`);
    p(`  opening + Σ amount = closing: ${ok(reg.entries.length < reg.total || Math.abs(reg.openingBalance + sum(reg.entries, e => e.amount) - reg.closingBalance) < 0.01)} · last running = closing: ${ok(reg.entries.length < reg.total || Math.abs((reg.entries[reg.entries.length - 1]?.runningBalance ?? reg.openingBalance) - reg.closingBalance) < 0.01)}`);
  }
  if (mv) p(`Movement ${revCode} Q3: current ${mv.current} · prior ${mv.prior} · change ${mv.change} · Σ byCounterparty ${r2(sum(mv.byCounterparty, x => x.change))}: ${ok(Math.abs(sum(mv.byCounterparty, x => x.change) - mv.change) < 0.01)}`);
  console.log(out.join('\n'));
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
