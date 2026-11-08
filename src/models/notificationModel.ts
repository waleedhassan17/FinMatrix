// ═══════════════════════════════════════════════════════
// FinMatrix — In-app notification model
// ═══════════════════════════════════════════════════════
// One row of the server's per-user notification feed, as the app uses it.
// Same shape as the web's model, so both clients describe a notification the
// same way: the server's `message` is called `body` here because the screen
// puts it under a title.

export interface AppNotification {
  id: string;
  /** Server type key, e.g. `delivery_assigned`, `inventory_approvals`, `subscription_expiring`. */
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  /** ISO timestamp. */
  createdAt: string;
  /** Free-form server payload (`route`, `deliveryId`, `requestId`, …). */
  data: Record<string, unknown>;
}
