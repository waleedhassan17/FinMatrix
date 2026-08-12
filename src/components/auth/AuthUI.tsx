// ═══════════════════════════════════════════════════════
// FinMatrix — Auth UI kit
// ═══════════════════════════════════════════════════════
// Sibling of components/form/FormUI.tsx and components/reports/ReportUI.tsx,
// following the same "one kit per domain" convention.
//
// Every auth + onboarding screen composes from here so the flow reads as one
// product: one gradient header treatment, one card, one button height/radius,
// one banner style. Screens should not re-declare these — if something needs
// to change, change it once here.
//
// Layout rule worth knowing: the gradient header is always flush to the top
// of the viewport. Screens balance by letting the header fill the upper third
// and pushing trailing footer content to the bottom — never by centring the
// whole stack, which leaves a dead gap above the header.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { AUTH_DS, AUTH_TONES, type AuthTone } from './authTokens';

export { AUTH_DS, AUTH_TONES, type AuthTone } from './authTokens';
export { OtpInput, type OtpInputProps } from './OtpInput';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// ───────────────────────────────────────────────
// AuthScreen — the shell every auth screen sits in
// ───────────────────────────────────────────────

export interface AuthScreenProps {
  children: React.ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
  contentStyle?: StyleProp<ViewStyle>;
}

// The gradient header is always flush to the top of the viewport — it is the
// screen's anchor, and any gap above it reads as a rendering fault. Balance
// comes from the header filling the upper third and trailing footer content
// (AuthSecurityNote) being pushed to the bottom via marginTop:'auto', not
// from centring the whole stack.
export const AuthScreen: React.FC<AuthScreenProps> = ({
  children,
  scrollRef,
  contentStyle,
}) => (
  <View style={s.root}>
    <StatusBar barStyle="light-content" backgroundColor={AUTH_DS.navy900} />
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.scroll, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);

// ───────────────────────────────────────────────
// AuthHeader — the navy gradient block
// ───────────────────────────────────────────────

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  /** Small status chip above the title, e.g. "Getting Started". */
  pill?: string;
  /** Renders the circular back chip when provided. */
  onBack?: () => void;
  /** Shorter header for the brief gate screens. */
  compact?: boolean;
  /** Optional progress dots, e.g. the 3 reset-password steps. */
  steps?: { current: number; total: number };
  /** Small labelled row under the subtitle, e.g. "Workspace Setup". */
  tag?: { icon: FeatherName; label: string };
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  pill,
  onBack,
  compact = false,
  steps,
  tag,
}) => (
  <LinearGradient
    colors={[AUTH_DS.navy900, AUTH_DS.navy800, AUTH_DS.navy700]}
    start={{ x: 0.2, y: 0 }}
    end={{ x: 0.8, y: 1 }}
    style={[s.header, compact && s.headerCompact]}>
    <View style={[s.orb, s.orbTopRight]} />
    <View style={[s.orb, s.orbBottomLeft]} />

    <SafeAreaView edges={['top']} style={s.headerInner}>
      {(onBack || pill) && (
        <View style={s.navRow}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <View style={s.backBtn}>
                <Feather name="arrow-left" size={18} color={AUTH_DS.white} />
              </View>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {pill ? (
            <View style={s.pill}>
              <View style={s.pillDot} />
              <Text style={s.pillText}>{pill}</Text>
            </View>
          ) : null}
        </View>
      )}

      <Text style={s.headerTitle}>{title}</Text>
      {subtitle ? <Text style={s.headerSub}>{subtitle}</Text> : null}

      {tag ? (
        <View style={s.headerTag}>
          <Feather name={tag.icon} size={15} color={AUTH_DS.green300} />
          <Text style={s.headerTagText}>{tag.label}</Text>
        </View>
      ) : null}

      {steps ? (
        <View style={s.stepRow}>
          {Array.from({ length: steps.total }, (_, i) => (
            <View
              key={i}
              style={[s.stepDot, i < steps.current && s.stepDotActive]}
            />
          ))}
          <Text style={s.stepText}>
            Step {steps.current} of {steps.total}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  </LinearGradient>
);

// ───────────────────────────────────────────────
// AuthCard — the white panel overlapping the header
// ───────────────────────────────────────────────

export const AuthCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}> = ({ children, style, padded = true }) => (
  <View style={s.cardZone}>
    <View style={[s.card, padded && s.cardPadded, style]}>{children}</View>
  </View>
);

// ───────────────────────────────────────────────
// AuthMedallion — the circular status icon
// ───────────────────────────────────────────────

export const AuthMedallion: React.FC<{
  icon?: FeatherName;
  emoji?: string;
  tone?: AuthTone | 'brand';
}> = ({ icon, emoji, tone = 'brand' }) => {
  const palette =
    tone === 'brand'
      ? { bg: AUTH_DS.green50, border: AUTH_DS.greenBorder, fg: AUTH_DS.green500 }
      : {
          bg: AUTH_TONES[tone].bg,
          border: AUTH_TONES[tone].border,
          fg: AUTH_TONES[tone].accent,
        };

  return (
    <View
      style={[
        s.medallion,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}>
      {emoji ? (
        <Text style={s.medallionEmoji}>{emoji}</Text>
      ) : icon ? (
        <Feather name={icon} size={30} color={palette.fg} />
      ) : null}
    </View>
  );
};

// ───────────────────────────────────────────────
// InlineBanner — replaces floating toasts and browser dialogs
// ───────────────────────────────────────────────

export const InlineBanner: React.FC<{
  tone: AuthTone;
  message: string;
  title?: string;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}> = ({ tone, message, title, onDismiss, style }) => {
  const t = AUTH_TONES[tone];
  return (
    <View
      style={[
        s.banner,
        { backgroundColor: t.bg, borderColor: t.border },
        style,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <Feather name={t.icon as FeatherName} size={18} color={t.accent} />
      <View style={s.bannerBody}>
        {title ? (
          <Text style={[s.bannerTitle, { color: t.fg }]}>{title}</Text>
        ) : null}
        <Text style={[s.bannerText, { color: t.fg }]}>{message}</Text>
      </View>
      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss">
          <Feather name="x" size={16} color={t.fg} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

// ───────────────────────────────────────────────
// StatusPill
// ───────────────────────────────────────────────

export const StatusPill: React.FC<{ label: string; tone?: AuthTone }> = ({
  label,
  tone = 'warning',
}) => {
  const t = AUTH_TONES[tone];
  return (
    <View style={[s.statusPill, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={[s.statusDot, { backgroundColor: t.accent }]} />
      <Text style={[s.statusText, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

// ───────────────────────────────────────────────
// Buttons — one height, one radius, one type ramp
// ───────────────────────────────────────────────

export interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  /** Label shown beside the spinner, e.g. "Creating account…". */
  loadingLabel?: string;
  disabled?: boolean;
  icon?: FeatherName;
  style?: StyleProp<ViewStyle>;
}

export const AuthPrimaryButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  loading = false,
  loadingLabel,
  disabled = false,
  icon,
  style,
}) => (
  <TouchableOpacity
    style={[s.btn, s.btnPrimary, (disabled || loading) && s.btnDisabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || loading, busy: loading }}>
    {loading ? (
      <>
        <ActivityIndicator size="small" color={AUTH_DS.white} />
        {loadingLabel ? (
          <Text style={[s.btnLabel, s.btnLabelPrimary]}>{loadingLabel}</Text>
        ) : null}
      </>
    ) : (
      <>
        {icon ? <Feather name={icon} size={17} color={AUTH_DS.white} /> : null}
        <Text style={[s.btnLabel, s.btnLabelPrimary]}>{label}</Text>
      </>
    )}
  </TouchableOpacity>
);

export const AuthSecondaryButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  loading = false,
  loadingLabel,
  disabled = false,
  icon,
  style,
}) => (
  <TouchableOpacity
    style={[s.btn, s.btnSecondary, (disabled || loading) && s.btnDisabled, style]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || loading, busy: loading }}>
    {loading ? (
      <>
        <ActivityIndicator size="small" color={AUTH_DS.navy800} />
        {loadingLabel ? (
          <Text style={[s.btnLabel, s.btnLabelSecondary]}>{loadingLabel}</Text>
        ) : null}
      </>
    ) : (
      <>
        {icon ? <Feather name={icon} size={17} color={AUTH_DS.navy800} /> : null}
        <Text style={[s.btnLabel, s.btnLabelSecondary]}>{label}</Text>
      </>
    )}
  </TouchableOpacity>
);

export const AuthLinkButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Muted styling for the lower-priority link in a stack. */
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, disabled = false, muted = false, style }) => (
  <TouchableOpacity
    style={[s.linkBtn, style]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.6}
    accessibilityRole="button"
    accessibilityState={{ disabled }}>
    <Text
      style={[
        s.linkText,
        muted && s.linkTextMuted,
        disabled && s.linkTextDisabled,
      ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/** Thin divider used between stacked actions. */
export const AuthDivider: React.FC<{ style?: StyleProp<ViewStyle> }> = ({
  style,
}) => <View style={[s.divider, style]} />;

/** The reassurance line under onboarding cards. */
export const AuthSecurityNote: React.FC<{ label?: string }> = ({
  label = 'Your data is encrypted and secure',
}) => (
  <View style={s.secNote}>
    <Feather name="lock" size={12} color={AUTH_DS.slate400} />
    <Text style={s.secNoteText}>{label}</Text>
  </View>
);

// ───────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: AUTH_DS.slate50 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
    width: '100%',
    maxWidth: AUTH_DS.maxContentWidth,
    alignSelf: 'center',
  },

  // ── Header ──
  header: {
    paddingBottom: 56,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerCompact: { paddingBottom: 48 },
  headerInner: { paddingHorizontal: 24, paddingTop: 8 },
  orb: {
    position: 'absolute',
    borderRadius: AUTH_DS.radius.full,
    backgroundColor: 'rgba(52, 211, 153, 0.07)',
  },
  orbTopRight: { width: 190, height: 190, top: -70, right: -60 },
  orbBottomLeft: { width: 140, height: 140, bottom: -50, left: -40 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    minHeight: 36,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: AUTH_DS.radius.md,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AUTH_DS.radius.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AUTH_DS.green300,
  },
  pillText: {
    fontFamily: AUTH_DS.font,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.86)',
  },
  headerTitle: {
    fontFamily: AUTH_DS.font,
    fontSize: 27,
    fontWeight: '700',
    color: AUTH_DS.white,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontFamily: AUTH_DS.font,
    fontSize: 14,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 8,
    lineHeight: 21,
  },
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: AUTH_DS.radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTagText: {
    fontFamily: AUTH_DS.font,
    fontSize: 13,
    fontWeight: '600',
    color: AUTH_DS.white,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  stepDot: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  stepDotActive: { backgroundColor: AUTH_DS.green300 },
  stepText: {
    fontFamily: AUTH_DS.font,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 8,
  },

  // ── Card ──
  cardZone: { paddingHorizontal: 20, marginTop: -34 },
  card: {
    backgroundColor: AUTH_DS.white,
    borderRadius: AUTH_DS.radius.xl,
    ...AUTH_DS.shadowMd,
  },
  cardPadded: { padding: 22 },

  // ── Medallion ──
  medallion: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  medallionEmoji: { fontSize: 34 },

  // ── Banner ──
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: AUTH_DS.radius.md,
    borderWidth: 1,
    padding: 13,
  },
  bannerBody: { flex: 1, gap: 2 },
  bannerTitle: { fontFamily: AUTH_DS.font, fontSize: 13, fontWeight: '700' },
  bannerText: { fontFamily: AUTH_DS.font, fontSize: 13, lineHeight: 19 },

  // ── Status pill ──
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: AUTH_DS.radius.full,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontFamily: AUTH_DS.font, fontSize: 12, fontWeight: '700' },

  // ── Buttons ──
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: AUTH_DS.buttonHeight,
    borderRadius: AUTH_DS.control.radius,
    paddingHorizontal: 18,
  },
  btnPrimary: { backgroundColor: AUTH_DS.green500 },
  btnSecondary: {
    backgroundColor: AUTH_DS.white,
    borderWidth: 1,
    borderColor: AUTH_DS.slate200,
  },
  btnDisabled: { opacity: 0.6 },
  btnLabel: { fontFamily: AUTH_DS.font, fontSize: 15, fontWeight: '700' },
  btnLabelPrimary: { color: AUTH_DS.white },
  btnLabelSecondary: { color: AUTH_DS.navy800 },

  // ── Links ──
  linkBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  linkText: {
    fontFamily: AUTH_DS.font,
    fontSize: 14,
    fontWeight: '700',
    color: AUTH_DS.green500,
  },
  linkTextMuted: { color: AUTH_DS.slate500 },
  linkTextDisabled: { color: AUTH_DS.slate400 },

  divider: { height: 1, backgroundColor: AUTH_DS.slate200, marginVertical: 6 },

  // ── Security note ──
  // marginTop:'auto' settles it against the bottom of the viewport when the
  // content is shorter than the screen, so the leftover space reads as
  // deliberate footer spacing rather than a gap.
  secNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 22,
  },
  secNoteText: {
    fontFamily: AUTH_DS.font,
    fontSize: 12,
    color: AUTH_DS.slate400,
  },
});
