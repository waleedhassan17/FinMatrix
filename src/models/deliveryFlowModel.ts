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
