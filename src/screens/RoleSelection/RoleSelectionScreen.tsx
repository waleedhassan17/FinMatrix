// ═══════════════════════════════════════════════════════
// FinMatrix — Choose your portal (role selection)
// ═══════════════════════════════════════════════════════
// The first screen a returning user sees, and the start of the sign-in flow,
// so it is built from the same auth kit (components/auth/AuthUI) as every
// screen after it: the dark header with the wordmark exactly where the
// sign-in header has it, white cards on the grey canvas, and a pinned footer.
//
// THREE DOORS, ONE TAP. Each card is a door, not an option: tapping it opens
// that portal's sign-in. Two steps (pick, then Continue) bought nothing for a
// choice this small and this easy to undo — sign-in has a back arrow — and
// left a disabled grey button as the most prominent thing on the first
// screen.
//
// THE DOOR IS CHECKED. The portal picked here is posted with the credentials
// and the server refuses an account that belongs on another door
// (WRONG_PORTAL) before issuing a token; sign-in then offers the right door.
// Portal names, icons and copy live in models/signInPortalModel so this
// screen and sign-in can never describe a door differently.

import React from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AuthLayout,
  AuthHeader,
  AuthFooterBar,
  AuthOptionCard
} from '../../components/auth/AuthUI';
import { ROUTES } from '../../navigations-maps/Base';
import { useAppDispatch } from '../../hooks/useReduxHooks';
import { setRole } from './roleSelectionSlice';
import { setSelectedRole } from '../Auth/authSlice';
import { clearSignInError } from '../Auth/SignIn/signInSlice';
import {
  PORTAL_ORDER,
  SIGN_IN_PORTALS,
  type SignInPortal,
} from '../../models/signInPortalModel';
import type { RootStackParamList } from '../../types';

type RoleSelectionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RoleSelection'
>;

interface Props {
  navigation: RoleSelectionNavigationProp;
}

const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();

  const choose = (portal: SignInPortal) => {
    dispatch(setRole(portal));
    dispatch(setSelectedRole(portal));
    // A refusal left over from another door must not greet this one.
    dispatch(clearSignInError());
    navigation.navigate(ROUTES.SIGN_IN, { role: portal });
  };

  // Only an owner can create their own account; staff and riders are created
  // by their company. So the way in for someone new is the business one.
  const register = () => {
    dispatch(setRole('admin'));
    dispatch(setSelectedRole('admin'));
    navigation.navigate(ROUTES.SIGN_UP, { role: 'admin' });
  };

  return (
    <AuthLayout
      header={
        <AuthHeader
          title="Choose your portal"
          subtitle="Pick the portal your account belongs to."
        />
      }
      footer={
        <AuthFooterBar
          prompt={{
            text: 'New to FinMatrix?',
            action: 'Register your business',
            onPress: register,
          }}
          note="256-bit SSL encrypted connection"
        />
      }>
      {PORTAL_ORDER.map(portal => {
        const p = SIGN_IN_PORTALS[portal];
        return (
          <AuthOptionCard
            key={portal}
            icon={p.icon}
            title={p.title}
            tagline={p.audience}
            footnote={{
              icon: p.credential === 'email' ? 'mail' : 'key',
              text: p.credentialHint,
            }}
            trailing="chevron"
            accessibilityHint="Opens sign-in"
            onPress={() => choose(portal)}
          />
        );
      })}
    </AuthLayout>
  );
};

export default RoleSelectionScreen;
