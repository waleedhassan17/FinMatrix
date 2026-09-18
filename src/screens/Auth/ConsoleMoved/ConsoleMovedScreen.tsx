// ═══════════════════════════════════════════════════════
// FinMatrix — Platform console moved
// ═══════════════════════════════════════════════════════
// The dead end for a platform admin who signs into the customer app.
//
// The console used to mount here, behind a `role === 'super_admin'` branch in
// AppContainer. It now ships as its own app (FinMatrix Admin), but the server
// still authenticates a platform admin against this one — /auth/signin admits
// them on portal 'admin' alongside company owners — so they can still arrive
// with a perfectly valid session.
//
// This screen exists because the alternative is a trap rather than an error. A
// platform admin has no companyId and no companyStatus, so without a branch of
// their own they fail every gate in BaseNavigator's chain and land on its
// terminal else: COMPANY_ONBOARDING_ROUTES, i.e. "Set up your workspace". None
// of those six screens has a sign-out, and bootstrapSession re-hydrates the
// same session on every cold start — so the only escape would be reinstalling
// the app. Worse, the screen's own call to action would invite them to create
// a tenant company under their platform account.
//
// So: say what happened, and give them the exit those screens lack.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../../../hooks/useReduxHooks';
import { selectUser } from '../authSlice';
import { useSignOut } from '../../../hooks/useSignOut';
import { THEME } from '../../../theme';
import {
  AuthLayout,
  AuthHeader,
  AuthFooterBar,
  AuthIconTile,
  AUTH,
} from '../../../components/auth/AuthUI';

const ConsoleMovedScreen: React.FC = () => {
  const user = useAppSelector(selectUser);
  const { signOutNow, signingOut } = useSignOut();

  return (
    <AuthLayout
      header={
        <AuthHeader
          pill="Platform Console"
          title="The console is a separate app"
          subtitle="Your account manages the FinMatrix platform, not a company."
        />
      }
      footer={
        <AuthFooterBar
          primary={{
            label: 'Sign Out',
            onPress: signOutNow,
            loading: signingOut,
            loadingLabel: 'Signing out',
          }}
          note="This app is for businesses using FinMatrix"
        />
      }>
      <View style={styles.head}>
        <AuthIconTile icon="shield" tone="brand" />
      </View>

      <Text style={styles.body}>
        {user?.displayName ? `${user.displayName}, your` : 'Your'} account is a
        platform administrator. Company approvals, payment reviews and revenue
        analytics have moved to <Text style={styles.strong}>FinMatrix Admin</Text>,
        a separate app — please sign in there instead.
      </Text>

      <Text style={styles.body}>
        Signing in here would put you in a company workspace you do not have, so
        there is nothing for you to do in this app.
      </Text>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  head: {
    alignItems: 'center',
    gap: AUTH.space.md,
    marginBottom: AUTH.space.lg,
  },
  body: {
    ...THEME.typography.bodyMd,
    fontFamily: AUTH.font,
    color: AUTH.ink[700],
    textAlign: 'center',
    marginBottom: AUTH.space.md,
  },
  strong: {
    fontWeight: THEME.typography.labelLg.fontWeight,
    color: AUTH.ink[900],
  },
});

export default ConsoleMovedScreen;
