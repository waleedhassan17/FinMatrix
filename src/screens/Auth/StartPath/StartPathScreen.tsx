// ═══════════════════════════════════════════════════════
// FinMatrix — How would you like to start? (after company setup)
// ═══════════════════════════════════════════════════════
//   A. "Start my free trial" — instant when eligible (the server decides).
//   B. "Request account approval" — a plan agreed with FinMatrix, or "not sure".
// Path A is offered only when GET /companies/:id/trial-eligibility says it
// will work; otherwise it is shown unavailable WITH the reason, so a button
// that will fail is never offered. In SIGNUP_MODE=approval only path B shows.
// A draft company lands here (BaseNavigator's draft branch), so an owner who
// left half-way resumes at this choice. Mirrors the web's StartPathChooser.

import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  AuthField,
  AuthFooterBar,
  AuthHeader,
  AuthLayout,
  AuthNotice,
  AuthOptionCard,
  AuthSelect,
  AUTH,
} from '../../../components/auth/AuthUI';
import { UNSURE_PLAN } from '../../../components/launch/ActivationRequestModal';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { useSignOut } from '../../../hooks/useSignOut';
import { fill, LAUNCH, LAUNCH_ERRORS } from '../../../config/launchStrings';
import { authMe } from '../../../networks/auth/authNetwork';
import {
  FALLBACK_PUBLIC_CONFIG,
  getOfferedPlans,
  getPublicConfig,
  getTrialEligibility,
  reasonOf,
  requestApproval,
  startFreeTrial,
  type OfferedPlan,
  type PublicConfig,
  type TrialEligibility,
} from '../../../networks/launch/launchNetwork';
import { refreshSessionTokens } from '../../../networks/network/apiHelpers';
import { THEME } from '../../../theme';
import { WEB_APP_URL } from '../../../utils/webAppUrl';
import { setUser } from '../authSlice';

type Path = 'trial' | 'approval';

const StartPathScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const companyId = user?.companyId ?? '';
  const { confirmSignOut } = useSignOut();

  const [config, setConfig] = useState<PublicConfig>(FALLBACK_PUBLIC_CONFIG);
  const [eligibility, setEligibility] = useState<TrialEligibility | null>(null);
  const [plans, setPlans] = useState<OfferedPlan[]>([]);
  // The owner's explicit choice; until then path A when it will work.
  const [chosen, setChosen] = useState<Path | null>(null);
  const [plan, setPlan] = useState(UNSURE_PLAN);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const trialMode = config.signupMode === 'trial';
  const eligible = trialMode && eligibility?.eligible === true;
  const reason = eligibility && !eligibility.eligible ? eligibility.reason : null;
  const reasonText = reason
    ? LAUNCH_ERRORS[reason]
      ? LAUNCH_ERRORS[reason]
      : eligibility?.message ?? ''
    : '';

  const loadEligibility = useCallback(() => {
    if (!companyId) return;
    getTrialEligibility(companyId)
      .then(setEligibility)
      .catch(() => setEligibility(null));
  }, [companyId]);

  useEffect(() => {
    getPublicConfig().then(setConfig).catch((): void => undefined);
    getOfferedPlans().then(setPlans).catch((): void => undefined);
    if (companyId) {
      getTrialEligibility(companyId)
        .then(setEligibility)
        .catch(() => setEligibility(null));
    }
  }, [companyId]);

  // Path A only when it will work; otherwise path B is the choice.
  const path: Path = eligible ? chosen ?? 'trial' : 'approval';
  const setPath = setChosen;

  /** Re-read the session; the navigator then mounts the right branch. */
  const refreshSession = async () => {
    await refreshSessionTokens();
    try {
      const { data } = await authMe();
      dispatch(setUser(data.user));
    } catch {
      /* the next launch re-reads it */
    }
  };

  const explain = (e: unknown) => {
    const code = reasonOf(e);
    const known = code ? LAUNCH_ERRORS[code] : undefined;
    setError(known ? known : (e as Error)?.message ?? 'Something went wrong.');
  };

  const onContinue = async () => {
    if (!companyId) return;
    setBusy(true);
    setError('');
    try {
      if (path === 'trial') {
        const r = await startFreeTrial(companyId);
        if (r.status === 'active') {
          Toast.show({ type: 'success', text1: LAUNCH.welcomeTrial });
        }
      } else {
        await requestApproval(companyId, { requestedPlan: plan, note: note.trim() || undefined });
      }
      await refreshSession();
    } catch (e) {
      explain(e);
      loadEligibility();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      header={
        <AuthHeader
          title={LAUNCH.chooseTitle}
          subtitle={LAUNCH.chooseSubtitle}
        />
      }
      footer={
        <AuthFooterBar
          primary={{
            label:
              path === 'trial' ? LAUNCH.startTrial : LAUNCH.requestApproval,
            onPress: () => void onContinue(),
            loading: busy,
            loadingLabel: path === 'trial' ? LAUNCH.starting : LAUNCH.sending,
            disabled: !companyId || (path === 'trial' && !eligible),
          }}
          secondary={{ label: LAUNCH.signOut, onPress: confirmSignOut }}
          note={LAUNCH.trialCardNote}
        />
      }
    >
      {error ? (
        <AuthNotice tone="error" message={error} onDismiss={() => setError('')} style={S.gap} />
      ) : null}

      {trialMode && (
        <View testID="path-trial" style={S.gap}>
          <AuthOptionCard
            icon="gift"
            title={fill(LAUNCH.trialCardTitle, { days: config.trialDays })}
            tagline={LAUNCH.trialCardBody}
            selected={path === 'trial'}
            selectable={eligible}
            onPress={eligible ? () => setPath('trial') : undefined}
          />
          {!eligible && reasonText ? (
            <AuthNotice
              tone="warning"
              title={LAUNCH.trialUnavailable}
              message={reasonText}
              style={S.reason}
            />
          ) : null}
        </View>
      )}

      <View testID="path-approval" style={S.gap}>
        <AuthOptionCard
          icon="shield"
          title={LAUNCH.approvalCardTitle}
          tagline={LAUNCH.approvalCardBody}
          selected={path === 'approval'}
          onPress={() => setPath('approval')}
        />
      </View>

      {path === 'approval' && (
        <View style={S.gap}>
          <AuthSelect
            label={LAUNCH.planLabel}
            value={plan}
            onChange={setPlan}
            options={[
              { value: UNSURE_PLAN, label: LAUNCH.planUnsure },
              ...plans.map(p => ({ value: p.key, label: p.label })),
            ]}
          />
          <AuthField
            label={LAUNCH.noteLabel}
            value={note}
            onChangeText={setNote}
            maxLength={1000}
            multiline
          />
        </View>
      )}

      <Text
        style={[S.link]}
        accessibilityRole="link"
        onPress={() => Linking.openURL(`${WEB_APP_URL}/book-demo`).catch((): void => undefined)}
      >
        {LAUNCH.orBookDemo}
      </Text>
    </AuthLayout>
  );
};

const S = StyleSheet.create({
  gap: { marginTop: AUTH.space.lg },
  reason: { marginTop: AUTH.space.sm },
  link: {
    ...THEME.typography.labelMd,
    fontFamily: AUTH.font,
    color: THEME.colors.primary,
    marginTop: AUTH.space.xl,
    marginBottom: AUTH.space.lg,
  },
});

export default StartPathScreen;
