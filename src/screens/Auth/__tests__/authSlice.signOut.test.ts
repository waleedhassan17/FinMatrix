// ═══════════════════════════════════════════════════════
// FinMatrix — sign-out leads back through onboarding
// ═══════════════════════════════════════════════════════
// Every sign-out must end on the onboarding slides (behind the replayed
// splash), so ending a session resets hasSeenOnboarding. The cold-start
// reconciliation in bootstrapSession dispatches the same signOut on a device
// that is merely signed out; that one must NOT reset the flag, or the
// carousel would restart every time the app is opened.

import type { User } from '../../../types';
import { authSlice, setOnboardingSeen, setUser, signOut } from '../authSlice';

const reduce = (...actions: Parameters<typeof authSlice.reducer>[1][]) =>
  actions.reduce(authSlice.reducer, authSlice.reducer(undefined, { type: '@@init' }));

const user = { id: 'u1', role: 'admin', name: 'Owner' } as unknown as User;

describe('signOut and onboarding', () => {
  it('sends a signed-in user back to onboarding', () => {
    const state = reduce(setOnboardingSeen(), setUser(user), signOut());

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.hasSeenOnboarding).toBe(false);
  });

  it('leaves the flag alone when there was no session to end', () => {
    // bootstrapSession on a cold start with no stored token.
    const state = reduce(setOnboardingSeen(), signOut());

    expect(state.hasSeenOnboarding).toBe(true);
  });
});
