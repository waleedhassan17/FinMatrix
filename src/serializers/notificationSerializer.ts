// ═══════════════════════════════════════════════════════
// FinMatrix — Notification serializers
// ═══════════════════════════════════════════════════════
// The server wraps every response in `{ success, data }`. The list arrives as
// `{ success, data: [...rows], pagination }` and the unread count as
// `{ success, data: { count } }`. Both readers also accept the bare inner value,
// so a change in the envelope degrades to "no notifications" rather than a crash.

import type { AppNotification } from '../models/notificationModel';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

function listRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return [];
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (isObject(data) && Array.isArray(data.data)) return data.data;
  return [];
}

export function notificationSerializer(raw: unknown): AppNotification | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    type: str(raw.type, 'system'),
    title: str(raw.title),
    body: str(raw.message ?? raw.body),
    isRead: raw.isRead === true,
    createdAt: str(raw.createdAt),
    data: isObject(raw.data) ? raw.data : {},
  };
}

export function notificationListSerializer(payload: unknown): AppNotification[] {
  return listRows(payload)
    .map(notificationSerializer)
    .filter((n): n is AppNotification => n !== null);
}

export function unreadCountSerializer(payload: unknown): number {
  const inner = isObject(payload) && isObject(payload.data) ? payload.data : payload;
  const raw = isObject(inner) ? inner.count : inner;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}
