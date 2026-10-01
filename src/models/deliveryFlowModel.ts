// ═══════════════════════════════════════════════════════
// FinMatrix — What a rider can do next, and in what order
// ═══════════════════════════════════════════════════════
// One place decides the rider's next legal action, because there used to be
// three and they did not agree: the dashboard card computed it, the dashboard's
// button label fell back to a fourth string, and the delivery detail screen
// kept its own copy — the only one that knew `arrived` opens the bill capture.
//
// The server allows exactly one hop at a time
// (deliveries.service.ts LEGAL_TRANSITIONS):
//
//     pending → picked_up → in_transit → arrived → delivered
//
// and rejects a skip with ILLEGAL_STATUS_TRANSITION, because collecting stock
// from the warehouse and setting off with it are separate events its history
// and monitor rely on. A shortcut that always sent 'in_transit' failed on every
// new job for exactly that reason.
//
// What the server does NOT do is sequence one delivery against another. A rider
// may legally hold several at picked_up / in_transit / arrived at once, so the
// rider picks which to work on and this model never assumes an order.

import type { DeliveryRecord } from './deliveryModel';
import { toIsoDate } from './reportModel';

/** The execution statuses a rider may move a delivery into. */
export type RiderAdvanceStatus = 'picked_up' | 'in_transit' | 'arrived';

export type RiderAction =
  | { kind: 'advance'; status: RiderAdvanceStatus; label: string; done: string }
  | { kind: 'navigate'; route: 'BillPhotoCapture'; label: string }
  | null;

/** Statuses that still need something from the rider. */
export const RIDER_ACTIVE_STATUSES = [
  'pending',
  'picked_up',
  'in_transit',
  'arrived',
] as const;

export const isRiderActive = (status: string): boolean =>
  (RIDER_ACTIVE_STATUSES as readonly string[]).includes(status);

/**
 * The single legal step forward, or null when the rider has nothing to do.
 *
 * Never returns a status more than one hop away — see the module note.
 */
export const riderNextAction = (status: string | undefined): RiderAction => {
  switch (status) {
    case 'pending':
      return { kind: 'advance', status: 'picked_up', label: 'Pick Up Items', done: 'Items picked up' };
    case 'picked_up':
      return { kind: 'advance', status: 'in_transit', label: 'Start Delivery', done: 'Delivery started' };
    case 'in_transit':
      return { kind: 'advance', status: 'arrived', label: 'Mark as Arrived', done: 'Arrived' };
    case 'arrived':
      // Completion is a capture flow, not a status PATCH.
      return { kind: 'navigate', route: 'BillPhotoCapture', label: 'Capture Signed Bill' };
    default:
      return null;
  }
};

export type RiderQueueSort = 'time' | 'priority';

/** Closest to done first, so a job already under way is not buried. */
const STATUS_RANK = ['arrived', 'in_transit', 'picked_up', 'pending'];
const PRIORITY_RANK = ['urgent', 'high', 'medium', 'low'];

const rank = (list: string[], v: string | undefined): number => {
  const i = list.indexOf(String(v));
  return i === -1 ? list.length : i;
};

const scheduled = (d: DeliveryRecord): number => {
  const t = new Date(d.scheduledDate as unknown as string).getTime();
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
};

/**
 * The order the rider's queue is shown in.
 *
 * `time` is the order the dashboard has always used, lifted here verbatim so
 * the list and the dashboard cannot disagree about what is next.
 */
export const compareRiderQueue =
  (sortBy: RiderQueueSort = 'time') =>
  (a: DeliveryRecord, b: DeliveryRecord): number => {
    if (sortBy === 'priority') {
      const p = rank(PRIORITY_RANK, a.priority) - rank(PRIORITY_RANK, b.priority);
      if (p !== 0) return p;
    }
    const s = rank(STATUS_RANK, a.status) - rank(STATUS_RANK, b.status);
    if (s !== 0) return s;
    return scheduled(a) - scheduled(b);
  };

/** The rider's outstanding jobs, in the order they should be offered. */
export const riderQueue = (
  deliveries: DeliveryRecord[],
  sortBy: RiderQueueSort = 'time',
): DeliveryRecord[] =>
  deliveries.filter(d => isRiderActive(d.status)).sort(compareRiderQueue(sortBy));

// ─── The rider's day ────────────────────────────────────

/**
 * Which local day a delivery was closed on.
 *
 * `deliveredAt` is the server's `completedAt`; `updatedAt` is the fallback for
 * records without one, which is every status but `delivered` — the server
 * stamps `completedAt` only on delivery (deliveries.service.ts), so a failed
 * job has no completion time of its own and a later edit can move its
 * `updatedAt`. That is the best available, and the same compromise the
 * Deliveries list has always made.
 *
 * `toIsoDate` reads the LOCAL date. `toISOString().slice(0, 10)` would read
 * UTC, which in Pakistan is the previous day between midnight and 5am — the
 * server's own unused stats endpoint got this wrong, and it is the reason the
 * day key is built in one place rather than at each call site.
 */
export const completedOn = (
  d: Pick<DeliveryRecord, 'deliveredAt' | 'updatedAt'>,
  dayKey: string,
): boolean => {
  const t = new Date((d.deliveredAt ?? d.updatedAt) as unknown as string);
  return Number.isFinite(t.getTime()) && toIsoDate(t) === dayKey;
};

export interface RiderDayStats {
  /** Delivered, and delivered TODAY. */
  completed: number;
  /** Failed, and failed today. */
  failed: number;
  /** Open right now — not "pending today", which means nothing. */
  pending: number;
  inProgress: number;
  total: number;
  /** completed / total, and 0 rather than NaN when there is nothing to do. */
  progress: number;
}

/**
 * What the rider has done today, and what is still on their plate.
 *
 * The dashboard used to filter on `scheduledDate === today` and label the
 * result "completed". Those are different questions, and it got both wrong at
 * once: a job scheduled for today but finished yesterday counted, and a job
 * finished today but scheduled for tomorrow did not. A rider who delivered one
 * parcel was shown "2 of 2 completed, 100%", the two being yesterday's work.
 *
 * So: completion is counted by when the work was DONE, and the open counts are
 * a fact about NOW with no date filter at all — they describe the same jobs the
 * queue lists directly below them, which the date filter also used to hide.
 */
export const riderDayStats = (
  deliveries: DeliveryRecord[],
  now: Date = new Date(),
): RiderDayStats => {
  const dayKey = toIsoDate(now);
  let completed = 0;
  let failed = 0;
  let pending = 0;
  let inProgress = 0;

  for (const d of deliveries) {
    if (d.status === 'delivered') {
      if (completedOn(d, dayKey)) completed += 1;
    } else if (d.status === 'failed') {
      if (completedOn(d, dayKey)) failed += 1;
    } else if (d.status === 'pending') {
      pending += 1;
    } else if (isRiderActive(d.status)) {
      inProgress += 1;
    }
  }

  const total = completed + failed + pending + inProgress;
  return { completed, failed, pending, inProgress, total, progress: total === 0 ? 0 : completed / total };
};
