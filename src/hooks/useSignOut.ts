// ═══════════════════════════════════════════════════════
// FinMatrix — useSignOut (shared by every Settings screen)
// ═══════════════════════════════════════════════════════
// One sign-out flow for all three roles (super admin, company admin,
// delivery personnel):
//   confirm → POST /auth/signout (best effort — offline still signs out
//   locally; authSignOut never throws and ALWAYS clears the AsyncStorage
//   tokens) → dispatch(signOut()) which resets the ENTIRE Redux store
//   (see appReducer in store/store.ts) → AppContainer.renderNavigator()
//   remounts the keyed unauthenticated stack, so back-navigation cannot
//   re-enter the app.
// `signingOut` guards against double-taps; expose it to disable the row
// and show a spinner.

import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useAppDispatch } from './useReduxHooks';
import { signOut } from '../screens/Auth/authSlice';
import { authSignOut } from '../networks/auth/authNetwork';

const CONFIRM_TITLE = 'Sign Out';
const CONFIRM_MESSAGE = 'Are you sure you want to sign out?';

export function useSignOut() {
  const dispatch = useAppDispatch();
  const [signingOut, setSigningOut] = useState(false);
  // Ref (not just state) so two taps in the same frame can't both pass.
  const inFlight = useRef(false);

  const signOutNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSigningOut(true);
    try {
      // Revokes the refresh tokens + denylists the access token server-side;
      // network failures are swallowed inside and tokens are always cleared.
      await authSignOut();
    } finally {
      dispatch(signOut());
      inFlight.current = false;
      setSigningOut(false);
    }
  }, [dispatch]);

  const confirmSignOut = useCallback(() => {
    if (inFlight.current) return;
    if (Platform.OS === 'web') {
      // RN-web's Alert has no buttons; use the native confirm dialog.
      if (window.confirm(CONFIRM_MESSAGE)) void signOutNow();
      return;
    }
    Alert.alert(CONFIRM_TITLE, CONFIRM_MESSAGE, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void signOutNow();
        },
      },
    ]);
  }, [signOutNow]);

  return { signingOut, confirmSignOut, signOutNow };
}
