// ═══════════════════════════════════════════════════════
// FinMatrix — Notification row helpers
// ═══════════════════════════════════════════════════════
// Where a server notification opens, and how old it is. Pure, so both are
// tested without rendering.

import type { AppNotification } from '../../models/notificationModel';

/**
 * A screen on DashboardStack, with its params. Only routes that stack registers
 * are returned. Navigating to a name it does not hold is silently dropped
 * ("not handled by any navigator"), which looks like a dead row, so it is
 * better for a row to stay inert.
 */
export type NotificationTarget =
  | { screen: 'InventoryApproval' }
  | { screen: 'DeliveryMonitor' }
  | { screen: 'AdminDeliveryDetail'; params: { deliveryId: string } }
  | { screen: 'DeliveryPersonnelList' };

const idOf = (data: Record<string, unknown>, key: string): string | null => {
  const v = data[key];
  return typeof v === 'string' && v.trim() !== '' ? v : null;
};

/**
 * Mapped by `type`, the same way the web maps it (FinMatrix-Web
 * models/notificationTarget.ts). The server's `data.route` names screens from
 * several stacks (a rider's DPHistory, for one), so it is not trusted.
 *
 * Every current target is a delivery screen, so none is offered when the
 * company cannot see deliveries. The subscription notices have no screen in
 * this build because the billing screens are switched off, so they stay
 * readable but are not links.
 */
export function notificationTarget(
  n: Pick<AppNotification, 'type' | 'data'>,
  opts: { showDelivery: boolean },
): NotificationTarget | null {
  if (!opts.showDelivery) return null;
  switch (n.type) {
    case 'inventory_approvals':
    case 'approval_results':
      return { screen: 'InventoryApproval' };
    case 'delivery_assigned': {
      const deliveryId = idOf(n.data, 'deliveryId');
      return deliveryId
        ? { screen: 'AdminDeliveryDetail', params: { deliveryId } }
        : { screen: 'DeliveryMonitor' };
    }
    case 'personnel_plan_locked':
      return { screen: 'DeliveryPersonnelList' };
    default:
      return null;
  }
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "Just now", "12m ago", "3h ago", "Yesterday", then a date: "Nov 2", with
 * the year added once it is not this year. An unreadable timestamp gives ''
 * rather than "Invalid Date".
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const t = then.getTime();
  if (!iso || Number.isNaN(t)) return '';
  const diff = now.getTime() - t;
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t >= startOfToday) return `${Math.floor(diff / HOUR)}h ago`;
  if (t >= startOfToday - DAY) return 'Yesterday';

  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(then.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}
