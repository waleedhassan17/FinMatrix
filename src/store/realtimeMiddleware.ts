import type { Middleware } from '@reduxjs/toolkit';

/**
 * A pass-through. It used to turn delivery and approval actions into local
 * notification-centre entries. The notification centre now reads the server's
 * feed instead (screens/Notifications/notificationsSlice, opened from the bell
 * on the dashboard header), so nothing is synthesised on the client. The hook
 * is kept so real-time pushes can be wired in later without touching store
 * configuration.
 */
export const realtimeMiddleware: Middleware = () => next => action => next(action);
