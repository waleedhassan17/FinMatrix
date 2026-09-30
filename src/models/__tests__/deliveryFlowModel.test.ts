import {
  RIDER_ACTIVE_STATUSES,
  compareRiderQueue,
  isRiderActive,
  riderNextAction,
  riderQueue,
} from '../deliveryFlowModel';
import type { DeliveryRecord } from '../deliveryModel';

/**
 * Copied verbatim from the server's LEGAL_TRANSITIONS
 * (FinMatrix-Backend/src/modules/deliveries/deliveries.service.ts).
 *
 * This fixture is the point of the suite: the rider UI may only ever send a hop
 * the server will accept, and the server rejects a skip with
 * ILLEGAL_STATUS_TRANSITION. Pinning the table here means a future divergence
 * fails in CI rather than in a rider's hands, halfway through a delivery.
 */
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  unassigned: ['pending', 'cancelled'],
  pending: ['picked_up', 'cancelled', 'failed'],
  picked_up: ['in_transit', 'cancelled', 'failed', 'returned'],
  in_transit: ['arrived', 'cancelled', 'failed', 'returned'],
  arrived: ['delivered', 'cancelled', 'failed', 'returned'],
  delivered: [],
  failed: [],
  returned: [],
  cancelled: [],
};

const ALL_STATUSES = Object.keys(LEGAL_TRANSITIONS);

const d = (over: Partial<DeliveryRecord>): DeliveryRecord =>
  ({
    id: 'x',
    referenceNo: 'DEL-X',
    status: 'pending',
    priority: 'medium',
    scheduledDate: '2026-09-30T09:00:00Z',
    ...over,
  }) as DeliveryRecord;

describe('riderNextAction', () => {
  it('never offers a hop the server would reject', () => {
    // The property that matters. Every advance this model can produce must
    // appear in the server's own table for the status it came from.
    for (const from of ALL_STATUSES) {
      const action = riderNextAction(from);
      if (action?.kind === 'advance') {
        expect(LEGAL_TRANSITIONS[from]).toContain(action.status);
      }
    }
  });

  it('advances one step at a time, never skipping', () => {
    // A shortcut that always sent 'in_transit' failed on every new job, because
    // pending → in_transit is not a legal hop.
    expect(riderNextAction('pending')).toMatchObject({ kind: 'advance', status: 'picked_up' });
    expect(riderNextAction('picked_up')).toMatchObject({ kind: 'advance', status: 'in_transit' });
    expect(riderNextAction('in_transit')).toMatchObject({ kind: 'advance', status: 'arrived' });
  });

  it('sends the rider to the capture flow once they have arrived', () => {
    // Completion is not a status PATCH — it needs a signed bill.
    expect(riderNextAction('arrived')).toEqual({
      kind: 'navigate',
      route: 'BillPhotoCapture',
      label: 'Capture Signed Bill',
    });
  });

  it('offers nothing on a terminal or unassigned delivery', () => {
    for (const s of ['delivered', 'failed', 'returned', 'cancelled', 'unassigned']) {
      expect(riderNextAction(s)).toBeNull();
    }
    expect(riderNextAction(undefined)).toBeNull();
  });

  it('labels every action it offers', () => {
    for (const s of ALL_STATUSES) {
      const a = riderNextAction(s);
      if (a) expect(a.label.length).toBeGreaterThan(0);
    }
  });
});

describe('isRiderActive', () => {
  it('covers exactly the statuses that still need the rider', () => {
    for (const s of RIDER_ACTIVE_STATUSES) expect(isRiderActive(s)).toBe(true);
    for (const s of ['delivered', 'failed', 'returned', 'cancelled', 'unassigned']) {
      expect(isRiderActive(s)).toBe(false);
    }
  });

  it('agrees with riderNextAction about who has work to do', () => {
    for (const s of ALL_STATUSES) {
      expect(isRiderActive(s)).toBe(riderNextAction(s) !== null);
    }
  });
});

describe('compareRiderQueue', () => {
  it('puts the job closest to done first', () => {
    // Reproduces the ordering the dashboard card has always used, so moving it
    // here cannot quietly change which delivery a rider is offered.
    const rows = [
      d({ id: 'pend', status: 'pending' }),
      d({ id: 'arr', status: 'arrived' }),
      d({ id: 'tran', status: 'in_transit' }),
      d({ id: 'pick', status: 'picked_up' }),
    ];
    expect([...rows].sort(compareRiderQueue('time')).map(r => r.id)).toEqual([
      'arr',
      'tran',
      'pick',
      'pend',
    ]);
  });

  it('breaks a status tie by the scheduled time', () => {
    const rows = [
      d({ id: 'late', status: 'pending', scheduledDate: '2026-09-30T17:00:00Z' }),
      d({ id: 'early', status: 'pending', scheduledDate: '2026-09-30T08:00:00Z' }),
    ];
    expect([...rows].sort(compareRiderQueue('time')).map(r => r.id)).toEqual(['early', 'late']);
  });

  it('leads on priority when asked, and still falls back to status', () => {
    const rows = [
      d({ id: 'lowArrived', status: 'arrived', priority: 'low' }),
      d({ id: 'highPending', status: 'pending', priority: 'high' }),
    ];
    expect([...rows].sort(compareRiderQueue('priority')).map(r => r.id)).toEqual([
      'highPending',
      'lowArrived',
    ]);
    expect([...rows].sort(compareRiderQueue('time')).map(r => r.id)).toEqual([
      'lowArrived',
      'highPending',
    ]);
  });

  it('survives a missing or unparseable scheduled date', () => {
    const rows = [
      d({ id: 'noDate', status: 'pending', scheduledDate: undefined as never }),
      d({ id: 'dated', status: 'pending' }),
    ];
    expect([...rows].sort(compareRiderQueue('time')).map(r => r.id)).toEqual(['dated', 'noDate']);
  });
});

describe('riderQueue', () => {
  it('drops finished work and orders the rest', () => {
    const rows = [
      d({ id: 'done', status: 'delivered' }),
      d({ id: 'pend', status: 'pending' }),
      d({ id: 'tran', status: 'in_transit' }),
    ];
    expect(riderQueue(rows).map(r => r.id)).toEqual(['tran', 'pend']);
  });

  it('does not mutate what it was given', () => {
    const rows = [d({ id: 'pend', status: 'pending' }), d({ id: 'arr', status: 'arrived' })];
    const before = rows.map(r => r.id);
    riderQueue(rows);
    expect(rows.map(r => r.id)).toEqual(before);
  });
});
