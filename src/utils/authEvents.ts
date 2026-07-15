// ═══════════════════════════════════════════════════════
// FinMatrix — Auth Events (session-expired bridge)
// ═══════════════════════════════════════════════════════
// The axios client (networks/network/apiHelpers.ts) cannot import the Redux
// store — the store imports slices, slices import networks, networks import
// the client, so the cycle would break module init. When the 401-refresh
// flow exhausts its options it calls emitSessionExpired(); AppContainer
// registers a handler that dispatches signOut() so the UI actually returns
// to the sign-in screen instead of sitting on dead screens whose every
// request 401s until the next cold start.

type SessionExpiredHandler = () => void;

let handler: SessionExpiredHandler | null = null;

export const setSessionExpiredHandler = (h: SessionExpiredHandler | null) => {
  handler = h;
};

export const emitSessionExpired = () => {
  handler?.();
};
