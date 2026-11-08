// ═══════════════════════════════════════════════════════
// FinMatrix — "Needs attention" items
// ═══════════════════════════════════════════════════════
// The dashboard summary's alerts, worded as rows for the Notifications screen.
//
// They used to sit on the dashboard as tinted banners with a coloured left
// edge, which read as errors. They are standing conditions rather than
// failures (an invoice past its due date, a delivery without a rider), so they
// now live behind the bell as ordinary rows: a title that names the thing and
// its count, a detail line, and a link to the screen where it is dealt with.
//
// Pure, so the wording is tested without rendering anything.

import type { Feather } from '@expo/vector-icons';
import type { DashboardAlert } from '../../models/dashboardModel';
import { formatCurrency } from '../../utils/formatters';

export type AttentionTone = 'neg' | 'warn' | 'info';

/** Screens an item can open. All are registered on DashboardStack, so back returns to where the user was. */
export type AttentionRoute = 'ARAging' | 'APAging' | 'DeliveryMonitor';

export interface AttentionItem {
  id: string;
  title: string;
  detail?: string;
  icon: keyof typeof Feather.glyphMap;
  tone: AttentionTone;
  route?: AttentionRoute;
}

const TONE: Record<DashboardAlert['severity'], AttentionTone> = {
  red: 'neg',
  amber: 'warn',
  blue: 'info',
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/**
 * One alert as a row. An id this build does not know keeps the server's own
 * sentence as its title and gets no link, rather than a guessed destination.
 *
 * The links match the web's (FinMatrix-Web models/dashboard.ts ALERT_TARGETS):
 * overdue invoices → AR aging, unpaid bills → AP aging, deliveries → the
 * delivery monitor.
 */
export function toAttentionItem(alert: DashboardAlert): AttentionItem {
  const tone = TONE[alert.severity] ?? 'info';
  const { count, amount } = alert;

  switch (alert.id) {
    case 'overdue':
      return {
        id: alert.id,
        tone,
        icon: 'clock',
        title: count ? plural(count, 'overdue invoice', 'overdue invoices') : 'Overdue invoices',
        detail: amount ? `${formatCurrency(amount)} past due` : 'Past their due date',
        route: 'ARAging',
      };
    case 'pending_bills':
      return {
        id: alert.id,
        tone,
        icon: 'file-text',
        title: 'Unpaid bills',
        detail: amount ? `${formatCurrency(amount)} owed to suppliers` : alert.message,
        route: 'APAging',
      };
    case 'pending_delivery':
      return {
        id: alert.id,
        tone,
        icon: 'truck',
        title: count ? plural(count, 'delivery to assign', 'deliveries to assign') : 'Deliveries to assign',
        detail: 'Waiting for a rider',
        route: 'DeliveryMonitor',
      };
    default:
      return { id: alert.id, tone, icon: 'info', title: alert.message };
  }
}

/**
 * The rows the bell counts and the Notifications screen lists.
 *
 * Deliveries are left out when the company cannot see deliveries, which is
 * what the web's Needs-attention card does too. The server raises the alert
 * from the deliveries table regardless of the company's features, so without
 * this a tier with no delivery screen would be told to assign deliveries it
 * has no way to open.
 */
export function attentionItems(
  alerts: DashboardAlert[],
  opts: { showDelivery: boolean },
): AttentionItem[] {
  return alerts
    .filter(a => opts.showDelivery || a.id !== 'pending_delivery')
    .map(toAttentionItem);
}

/** The overdue-invoice count, for the quiet line on the Receivables card. */
export function overdueInvoiceCount(alerts: DashboardAlert[]): number {
  return alerts.find(a => a.id === 'overdue')?.count ?? 0;
}
