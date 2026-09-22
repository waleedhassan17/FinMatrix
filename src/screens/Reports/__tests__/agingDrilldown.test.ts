// Cut the network chain at its root, the same way profitLossDrilldown does:
// importing an aging slice reaches its network module AND its serializer, both
// of which land on apiHelpers → axios, expo-constants and AsyncStorage, none of
// which a reducer test needs.
jest.mock('../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import {
  agingDetailQueryFrom,
  arAgingSlice,
  type AgingSliceState,
} from '../ARAging/arAgingSlice';
import { apAgingSlice } from '../APAging/apAgingSlice';
import type { AgingPartyDocuments } from '../../../models/arAgingModel';

/**
 * The aging drill-down holds per-party fetch state in a map keyed by party id.
 * Three properties keep it honest:
 *
 *   • a party already fetched is not refetched when it is reopened;
 *   • changing the bucket set throws the whole investigation away;
 *   • a 404 is told apart from a failure, because it means this build is newer
 *     than the server and no amount of retrying will fix it.
 *
 * The second is the one that would be invisible: the figures would still be
 * right, and the documents underneath them would be bucketed by a scheme that
 * is no longer on screen.
 */
describe('aging drill-down', () => {
  const {
    setARAgingPreset,
    setARAgingCustomBuckets,
    setARAgingBucket,
    setARAgingSort,
    toggleARAgingParty,
    fetchARAgingPartyDocuments,
  } = arAgingSlice.actions;
  const reduce = arAgingSlice.reducer;
  const base = arAgingSlice.getInitialState();

  // Annotated, so a shape drift fails here rather than silently in the screen.
  const payload: AgingPartyDocuments = {
    partyType: 'customer',
    partyId: 'cust-1',
    partyName: 'Allama Traders',
    asOfDate: '2026-09-22',
    preset: 'monthly',
    buckets: [{ key: 'd1to30', label: '1–30', minDays: 1, maxDays: 30 }],
    bucket: null,
    outstandingTotal: 300,
    documents: [
      {
        documentId: 'i1',
        documentType: 'invoice',
        documentNumber: 'INV-1',
        issueDate: '2026-08-01',
        dueDate: '2026-09-01',
        daysOverdue: 21,
        bucketKey: 'd1to30',
        bucketLabel: '1–30',
        total: 500,
        amountPaid: 200,
        balance: 300,
        status: 'partial',
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
  };

  const invested = (over: Partial<AgingSliceState> = {}): AgingSliceState => ({
    ...base,
    selectedBucket: 'd1to30',
    sort: 'name',
    expanded: { 'cust-1': true },
    documents: {
      'cust-1': { status: 'succeeded', error: '', data: payload },
    },
    ...over,
  });

  it('opens one party without touching its neighbours', () => {
    const s1 = reduce(base, toggleARAgingParty('cust-1'));
    expect(s1.expanded['cust-1']).toBe(true);
    expect(s1.expanded['cust-2']).toBeUndefined();

    const s2 = reduce(s1, toggleARAgingParty('cust-1'));
    expect(s2.expanded['cust-1']).toBe(false);
  });

  it('writes fetch state under the right party only', () => {
    const pending = reduce(
      base,
      fetchARAgingPartyDocuments.pending('r1', { partyId: 'cust-1', query: {} }),
    );
    expect(pending.documents['cust-1'].status).toBe('loading');
    expect(pending.documents['cust-2']).toBeUndefined();

    const done = reduce(
      pending,
      fetchARAgingPartyDocuments.fulfilled(payload, 'r1', {
        partyId: 'cust-1',
        query: {},
      }),
    );
    expect(done.documents['cust-1'].status).toBe('succeeded');
    expect(done.documents['cust-1'].data?.documents).toHaveLength(1);
    expect(done.documents['cust-1'].data?.outstandingTotal).toBe(300);
  });

  it('marks a 404 unavailable rather than failed, so no retry is offered', () => {
    // A build newer than the server it is talking to. The panel says so and
    // offers no button, because retrying cannot deploy anything.
    const err = Object.assign(new Error('Not Found'), { status: 404 });
    const s = reduce(
      base,
      fetchARAgingPartyDocuments.rejected(err, 'r1', { partyId: 'cust-1', query: {} }),
    );
    expect(s.documents['cust-1'].status).toBe('unavailable');
  });

  it('marks a real failure failed, so a retry is offered', () => {
    const err = Object.assign(new Error('Network request timed out'), { status: 500 });
    const s = reduce(
      base,
      fetchARAgingPartyDocuments.rejected(err, 'r1', { partyId: 'cust-1', query: {} }),
    );
    expect(s.documents['cust-1'].status).toBe('failed');
    expect(s.documents['cust-1'].error).toMatch(/timed out/i);
  });

  it('throws the whole investigation away when the preset changes', () => {
    // The invisible one. A d1to30 selection means nothing under days3, and the
    // cached documents were bucketed by the scheme being replaced.
    const s = reduce(invested(), setARAgingPreset('days3'));
    expect(s.selectedBucket).toBeNull();
    expect(s.sort).toBeNull();
    expect(s.expanded).toEqual({});
    expect(s.documents).toEqual({});
    expect(s.preset).toBe('days3');
  });

  it('throws it away when custom boundaries change too', () => {
    const s = reduce(invested(), setARAgingCustomBuckets('3,6,9,12'));
    expect(s.selectedBucket).toBeNull();
    expect(s.documents).toEqual({});
    expect(s.preset).toBe('custom');
  });

  it('closes open panels when the bucket filter changes', () => {
    // Their documents were fetched under a filter that no longer applies.
    const s = reduce(invested(), setARAgingBucket('d31to60'));
    expect(s.selectedBucket).toBe('d31to60');
    expect(s.expanded).toEqual({});
    expect(s.documents).toEqual({});
  });

  it('keeps the investigation when only the sort changes', () => {
    // Reordering rows does not invalidate what is inside them.
    const s = reduce(invested(), setARAgingSort('total'));
    expect(s.sort).toBe('total');
    expect(s.expanded['cust-1']).toBe(true);
    expect(s.documents['cust-1'].status).toBe('succeeded');
  });

  it('sends the report bucket spec, and the filter, down to the drill-down', () => {
    // Without this the server resolves the company default and the detail's
    // labels disagree with the column that was tapped.
    expect(
      agingDetailQueryFrom({ ...base, preset: 'days3', selectedBucket: 'd4to6' }),
    ).toMatchObject({ preset: 'days3', bucket: 'd4to6' });

    // No selection means no bucket param — every open document.
    expect(agingDetailQueryFrom({ ...base, preset: 'monthly' })).not.toHaveProperty(
      'bucket',
    );
  });

  it('gives the payables side the same guarantees', () => {
    // One state shape, two slices. A property proved on A/R and broken on A/P
    // is exactly what deduplicating the screen was meant to prevent.
    const ap = apAgingSlice.reducer;
    const apBase = apAgingSlice.getInitialState();
    const {
      setAPAgingPreset,
      toggleAPAgingParty,
      fetchAPAgingPartyDocuments,
    } = apAgingSlice.actions;

    const opened = ap(apBase, toggleAPAgingParty('vend-1'));
    expect(opened.expanded['vend-1']).toBe(true);

    const loaded = ap(
      opened,
      fetchAPAgingPartyDocuments.fulfilled({ ...payload, partyType: 'vendor' }, 'r1', {
        partyId: 'vend-1',
        query: {},
      }),
    );
    expect(loaded.documents['vend-1'].data?.partyType).toBe('vendor');

    const reset = ap(loaded, setAPAgingPreset('weekly'));
    expect(reset.expanded).toEqual({});
    expect(reset.documents).toEqual({});
  });
});
