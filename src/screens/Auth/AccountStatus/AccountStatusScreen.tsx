// ═══════════════════════════════════════════════════════
// FinMatrix — Account status (trial ended · plan ended · suspended · paused)
// ═══════════════════════════════════════════════════════
// BaseNavigator's inactive branch. Nothing is ever deleted when access
// stops, and the owner is told so with a way forward:
//   trial or plan ended → Download my data (Backup & export stays open to
//                         the owner), Request activation, Book a call
//   suspended           → contact FinMatrix support
//   deactivated         → contact FinMatrix support
// A request already in review says so instead of offering another. The
// screen re-reads the session every 30 s and on foreground, so an activation
// takes effect without a tap. Mirrors the web's status page.

import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  AuthFooterBar,
  AuthHeader,
  AuthIconTile,
  AuthLayout,
  AuthNotice,
  AuthOptionCard,
  AUTH,
  StatusPill,
} from '../../../components/auth/AuthUI';
import ActivationRequestModal from '../../../components/launch/ActivationRequestModal';
import { bootstrapSession } from '../../../components/app-container/appContainerSlice';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { useSignOut } from '../../../hooks/useSignOut';
import { LAUNCH } from '../../../config/launchStrings';
import {
  FALLBACK_PUBLIC_CONFIG,
  getPublicConfig,
  type PublicConfig,
} from '../../../networks/launch/launchNetwork';
import { THEME } from '../../../theme';
import { endedState, type EndedState } from '../../../utils/accountStatus';
import { WEB_APP_URL } from '../../../utils/webAppUrl';

const DEACTIVATED = {
  title: 'Account deactivated',
  body: 'Access to this company is paused. Your data is safe. Contact FinMatrix support to restore it.',
};

const VIEW: Record<EndedState, { title: string; body: string; icon: 'x-circle' | 'pause-circle' }> = {
  trialEnded: { title: LAUNCH.trialEndedTitle, body: LAUNCH.trialEndedBody, icon: 'x-circle' },
  planEnded: { title: LAUNCH.planEndedTitle, body: LAUNCH.planEndedBody, icon: 'x-circle' },
  suspended: { title: LAUNCH.suspendedTitle, body: LAUNCH.suspendedBody, icon: 'pause-circle' },
  deactivated: { ...DEACTIVATED, icon: 'pause-circle' },
};

const AccountStatusScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const user = useAppSelector(s => s.auth.user);
  const { confirmSignOut } = useSignOut();
  const [config, setConfig] = useState<PublicConfig>(FALLBACK_PUBLIC_CONFIG);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const state = endedState(user);
  const view = VIEW[state];
  const isOwner = user?.role === 'admin';
  const ended = state === 'trialEnded' || state === 'planEnded';
  const inReview = ended && user?.subscription?.paymentStatus === 'submitted';

  useEffect(() => {
    getPublicConfig().then(setConfig).catch((): void => undefined);
  }, []);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      await dispatch(bootstrapSession());
    } finally {
      setChecking(false);
    }
  }, [dispatch]);

  // While a request is in review, look again without being asked.
  useEffect(() => {
    if (!inReview) return undefined;
    const id = setInterval(() => void dispatch(bootstrapSession()), 30_000);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') void dispatch(bootstrapSession());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [inReview, dispatch]);

  const open_ = (url: string) => Linking.openURL(url).catch((): void => undefined);

  return (
    <AuthLayout
      header={<AuthHeader title={view.title} subtitle={user?.displayName} />}
      footer={
        <AuthFooterBar
          primary={{
            label: LAUNCH.checkAgain,
            onPress: () => void recheck(),
            loading: checking,
            loadingLabel: LAUNCH.checking,
          }}
          secondary={{ label: LAUNCH.signOut, onPress: confirmSignOut }}
        />
      }
    >
      <View style={S.head}>
        <AuthIconTile icon={view.icon} tone={state === 'suspended' || state === 'deactivated' ? 'warning' : 'error'} />
        <StatusPill label={view.title} tone={ended ? 'error' : 'warning'} />
      </View>

      <Text style={[S.body]} testID="status-body">
        {ended && !isOwner ? LAUNCH.staffEndedBody : view.body}
      </Text>

      {inReview ? <AuthNotice tone="info" message={LAUNCH.activationPending} style={S.gap} /> : null}

      {ended && isOwner ? (
        <View style={S.actions}>
          <AuthOptionCard
            icon="download"
            title={LAUNCH.downloadData}
            selectable={false}
            trailing="chevron"
            onPress={() => navigation.navigate('BackupExport')}
          />
          {!inReview && user?.companyId ? (
            <AuthOptionCard
              icon="check-circle"
              title={LAUNCH.requestActivation}
              selectable={false}
              trailing="chevron"
              onPress={() => setOpen(true)}
            />
          ) : null}
          <AuthOptionCard
            icon="calendar"
            title={LAUNCH.bookCall}
            selectable={false}
            trailing="chevron"
            onPress={() => open_(`${WEB_APP_URL}/book-demo`)}
          />
        </View>
      ) : null}

      {(config.supportEmail || config.supportWhatsapp) && (
        <View style={S.support}>
          <Text style={[S.supportLabel]}>{LAUNCH.support}</Text>
          {config.supportEmail ? (
            <Text style={S.link} accessibilityRole="link" onPress={() => open_(`mailto:${config.supportEmail}`)}>
              {config.supportEmail}
            </Text>
          ) : null}
          {config.supportWhatsapp ? (
            <Text
              style={S.link}
              accessibilityRole="link"
              onPress={() => open_(`https://wa.me/${config.supportWhatsapp.replace(/\D/g, '')}`)}
            >
              WhatsApp {config.supportWhatsapp}
            </Text>
          ) : null}
        </View>
      )}

      {user?.companyId ? (
        <ActivationRequestModal
          companyId={user.companyId}
          visible={open}
          onClose={() => setOpen(false)}
          onDone={() => void recheck()}
        />
      ) : null}
    </AuthLayout>
  );
};

const S = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.lg, marginVertical: AUTH.space.xl },
  body: {
    ...THEME.typography.bodySm,
    fontFamily: AUTH.font,
    lineHeight: 22,
    color: AUTH.ink[500],
  },
  gap: { marginTop: AUTH.space.lg },
  actions: { marginTop: AUTH.space.xl, gap: AUTH.space.md },
  support: { marginTop: AUTH.space.xl, gap: AUTH.space.xs },
  supportLabel: { ...THEME.typography.labelSm, color: AUTH.ink[500] },
  link: { ...THEME.typography.labelMd, color: THEME.colors.primary },
});

export default AccountStatusScreen;
