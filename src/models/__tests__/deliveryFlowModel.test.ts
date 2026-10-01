import {
  RIDER_ACTIVE_STATUSES,
  compareRiderQueue,
  completedOn,
  isRiderActive,
  riderDayStats,
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

// ─── The rider's day ────────────────────────────────────

/**
 * Local-time constructors throughout. `toIsoDate` reads the local date, so a
 * fixture built from a 'Z' string would land on a different day depending on
 * where the test runs — which is the very class of bug these cases pin.
 */
const at = (y: number, m: number, day: number, h = 12, min = 0): string =>
  new Date(y, m - 1, day, h, min).toISOString();

const NOW = new Date(2026, 9, 1, 14, 0); // 1 Oct 2026, local

describe('riderDayStats', () => {
  /**
   * The three rows this bug was reported from, as they stood in production on
   * 1 Oct 2026 for rider Saim Raza. The dashboard showed "2 of 2 completed,
   * 100%" for a day he delivered once.
   */
  const saimsDay = [
    // Delivered TODAY, but scheduled for tomorrow -- the one he actually did,
    // and the one the old filter could not see.
    d({ id: 'MUP32XA5', status: 'delivered', scheduledDate: '2026-10-02', deliveredAt: at(2026, 10, 1, 10, 21) }),
    // Both delivered YESTERDAY, scheduled today -- the phantom "2".
    d({ id: 'MUO68GBI', status: 'delivered', scheduledDate: '2026-10-01', deliveredAt: at(2026, 9, 30, 19, 0) }),
    d({ id: 'MUNQGJEB', status: 'delivered', scheduledDate: '2026-10-01', deliveredAt: at(2026, 9, 30, 11, 40) }),
  ];

  it('counts the delivery that was made today, once', () => {
    const s = riderDayStats(saimsDay, NOW);
    expect(s.completed).toBe(1);
    expect(s.total).toBe(1);
    expect(s.progress).toBe(1);
  });

  it('does not count work finished yesterday, however it was scheduled', () => {
    const s = riderDayStats(
      [d({ id: 'yest', status: 'delivered', scheduledDate: '2026-10-01', deliveredAt: at(2026, 9, 30, 19, 0) })],
      NOW,
    );
    expect(s.completed).toBe(0);
  });

  it('counts work finished today that was scheduled for another day', () => {
    const s = riderDayStats(
      [d({ id: 'tmrw', status: 'delivered', scheduledDate: '2026-10-02', deliveredAt: at(2026, 10, 1, 10, 21) })],
      NOW,
    );
    expect(s.completed).toBe(1);
  });

  it('falls back to updatedAt when there is no completion time', () => {
    const s = riderDayStats(
      [d({ id: 'noDelAt', status: 'delivered', deliveredAt: undefined, updatedAt: at(2026, 10, 1, 9, 0) })],
      NOW,
    );
    expect(s.completed).toBe(1);
  });

  it('counts open work regardless of the day it is scheduled for', () => {
    // The tiles sit directly above the queue, which never filtered by date.
    const s = riderDayStats(
      [
        d({ id: 'p', status: 'pending', scheduledDate: '2026-10-09' }),
        d({ id: 't', status: 'in_transit', scheduledDate: '2026-09-02' }),
        d({ id: 'a', status: 'arrived', scheduledDate: '2026-10-01' }),
      ],
      NOW,
    );
    expect(s).toMatchObject({ pending: 1, inProgress: 2, completed: 0, total: 3, progress: 0 });
  });

  it('counts a failure only on the day it failed', () => {
    const rows = [
      d({ id: 'ftoday', status: 'failed', updatedAt: at(2026, 10, 1, 8, 0) }),
      d({ id: 'fyest', status: 'failed', updatedAt: at(2026, 9, 30, 8, 0) }),
    ];
    expect(riderDayStats(rows, NOW).failed).toBe(1);
  });

  it('ignores statuses that are no longer the rider s problem', () => {
    const rows = [
      d({ id: 'ret', status: 'returned', updatedAt: at(2026, 10, 1, 8, 0) }),
      d({ id: 'can', status: 'cancelled', updatedAt: at(2026, 10, 1, 8, 0) }),
      d({ id: 'una', status: 'unassigned' }),
    ];
    expect(riderDayStats(rows, NOW)).toMatchObject({ total: 0, progress: 0 });
  });

  it('gives 0 rather than NaN for a rider with nothing to do', () => {
    const s = riderDayStats([], NOW);
    expect(s.total).toBe(0);
    expect(s.progress).toBe(0);
    expect(Number.isNaN(s.progress)).toBe(false);
  });

  it('splits the day at LOCAL midnight, not UTC', () => {
    // The assertion that fails the moment anyone reaches for toISOString():
    // in Pakistan (UTC+5) the UTC date is still yesterday until 5am.
    const rows = [
      d({ id: 'lateYesterday', status: 'delivered', deliveredAt: at(2026, 9, 30, 23, 59) }),
      d({ id: 'earlyToday', status: 'delivered', deliveredAt: at(2026, 10, 1, 0, 1) }),
    ];
    const s = riderDayStats(rows, NOW);
    expect(s.completed).toBe(1);
    expect(completedOn(rows[1], '2026-10-01')).toBe(true);
    expect(completedOn(rows[0], '2026-10-01')).toBe(false);
  });

  it('survives an unparseable timestamp instead of counting it', () => {
    const s = riderDayStats(
      [d({ id: 'junk', status: 'delivered', deliveredAt: 'not a date' })],
      NOW,
    );
    expect(s.completed).toBe(0);
  });

  it('burns down as the day goes on', () => {
    const start = [
      d({ id: 'a', status: 'pending' }),
      d({ id: 'b', status: 'pending' }),
    ];
    expect(riderDayStats(start, NOW)).toMatchObject({ total: 2, completed: 0, progress: 0 });

    const half = [d({ id: 'a', status: 'delivered', deliveredAt: at(2026, 10, 1, 11, 0) }), start[1]];
    expect(riderDayStats(half, NOW)).toMatchObject({ total: 2, completed: 1, progress: 0.5 });
  });
});
