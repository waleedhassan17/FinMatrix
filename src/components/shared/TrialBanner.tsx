// ═══════════════════════════════════════════════════════
// FinMatrix — Free trial countdown (app chrome)
// ═══════════════════════════════════════════════════════
// A slim strip above the owner's app while a free trial is RUNNING: granted,
// not yet converted, not yet over. Hidden in every other state. Days are
// Asia/Karachi calendar days, like the server's reminders; it turns urgent in
// the last 3. "Request activation" opens the activation sheet (no online
// payment); once a request is in, the strip says so instead.
//
// No billing fetch of its own. The countdown reads `user.subscription`, which
// signin and /auth/me already return; days are computed from the expiry date
// at render, and re-computed when the app comes back to the foreground. On
// that foreground it also re-reads /auth/me once (throttled) so an approval
// that happened while the app was closed removes the strip.
//
// It sits ABOVE the navigator, so it consumes the top safe-area inset itself
// and hands the screens below an inset of 0 — otherwise every header would pad
// for a status bar it no longer touches.

import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../theme';
import type { SubscriptionSummary } from '../../types';
import { TRIAL_URGENT_DAYS, trialDaysLeft } from '../../utils/trial';
import { fill, LAUNCH } from '../../config/launchStrings';
import ActivationRequestModal from '../launch/ActivationRequestModal';

const { colors, radius, spacing, typography } = THEME;

/** At most one /auth/me refresh per this many ms of foregrounding. */
const REFRESH_MIN_INTERVAL_MS = 60_000;

interface Props {
  subscription: SubscriptionSummary | null | undefined;
  companyId: string | null | undefined;
  /** Re-read the session (dispatches bootstrapSession). */
  onForegroundRefresh: () => void;
  children: React.ReactNode;
}

export const trialLabel = (days: number): string =>
  days <= 0
    ? LAUNCH.trialOneDayLeft
    : days === 1
      ? LAUNCH.trialDayLeft
      : fill(LAUNCH.trialDaysLeft, { n: days });

const TrialBanner: React.FC<Props> = ({
  subscription,
  companyId,
  onForegroundRefresh,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const lastRefresh = useRef<number | null>(null);
  const days = trialDaysLeft(subscription, now);
  const visible = days !== null;

  useEffect(() => {
    if (!visible) return undefined;
    if (lastRefresh.current === null) lastRefresh.current = Date.now();
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      setNow(new Date());
      if (Date.now() - (lastRefresh.current ?? 0) > REFRESH_MIN_INTERVAL_MS) {
        lastRefresh.current = Date.now();
        onForegroundRefresh();
      }
    });
    return () => sub.remove();
  }, [visible, onForegroundRefresh]);

  const inReview = subscription?.paymentStatus === 'submitted';
  const urgent = visible && (days as number) <= TRIAL_URGENT_DAYS;
  const tone = urgent
    ? { bg: colors.warningLighter, fg: colors.warning }
    : { bg: colors.infoLight, fg: colors.info };
  const label = visible ? trialLabel(days as number) : '';

  return (
    <View style={S.root}>
      {visible && (
        <View
          style={[S.bar, { backgroundColor: tone.bg, paddingTop: insets.top + spacing.xs }]}
          accessibilityRole="summary"
          testID="trial-banner"
        >
          <Feather name={inReview ? 'clock' : 'gift'} size={15} color={tone.fg} />
          <Text style={[S.text, { color: tone.fg }]} numberOfLines={2}>
            {inReview ? `${label} · ${LAUNCH.activationPending}` : label}
          </Text>
          {!inReview && companyId ? (
            <TouchableOpacity
              style={[S.cta, { backgroundColor: tone.fg }]}
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={LAUNCH.requestActivation}
            >
              <Text style={S.ctaText}>{LAUNCH.requestActivation}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      <SafeAreaInsetsContext.Provider value={visible ? { ...insets, top: 0 } : insets}>
        <View style={S.body}>{children}</View>
      </SafeAreaInsetsContext.Provider>
      {companyId ? (
        <ActivationRequestModal
          companyId={companyId}
          visible={open}
          onClose={() => setOpen(false)}
          onDone={onForegroundRefresh}
        />
      ) : null}
    </View>
  );
};

const S = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  text: { ...typography.labelMd, flex: 1 },
  cta: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  ctaText: { ...typography.labelMd, color: colors.neutral0 },
  body: { flex: 1 },
});

export default TrialBanner;
