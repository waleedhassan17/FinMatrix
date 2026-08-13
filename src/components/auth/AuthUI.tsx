// ═══════════════════════════════════════════════════════
// FinMatrix — Auth UI kit
// ═══════════════════════════════════════════════════════
// Every auth and onboarding screen composes from here, so the flow reads as
// one product. See authTokens.ts for the design rationale.
//
// Composition of a typical screen:
//
//   <AuthScreen>
//     <AuthBrand />                     small wordmark, top-left
//     <AuthHeading title subtitle />    left-aligned type block
//     ...fields / banners / buttons
//     <AuthFooter />                    optional legal line
//   </AuthScreen>
//
// The layout is a single left-aligned column capped at 400px and centred
// horizontally — the convention for enterprise sign-in. Only the primary
// button spans the full width.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  type StyleProp,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AUTH, type AuthTone } from './authTokens';

export { AUTH, AUTH_DS, type AuthTone } from './authTokens';
export { OtpInput, type OtpInputProps } from './OtpInput';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// ───────────────────────────────────────────────
// AuthScreen — page shell
// ───────────────────────────────────────────────

export const AuthScreen: React.FC<{
  children: React.ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
  contentStyle?: StyleProp<ViewStyle>;
}> = ({ children, scrollRef, contentStyle }) => (
  <View style={s.root}>
    <StatusBar barStyle="dark-content" backgroundColor={AUTH.surface.page} />
    <SafeAreaView style={s.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.scroll, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={s.column}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>
);

// ───────────────────────────────────────────────
// Brand + navigation
// ───────────────────────────────────────────────

/** The wordmark. Small and quiet — it identifies, it does not decorate. */
export const AuthBrand: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[s.brand, style]}>
    <Text style={s.brandFin}>Fin</Text>
    <Text style={s.brandMatrix}>Matrix</Text>
  </View>
);

export const AuthBackLink: React.FC<{ label?: string; onPress: () => void }> = ({
  label = 'Back',
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    hitSlop={12}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [s.backLink, pressed && s.pressed]}>
    <Feather name="arrow-left" size={16} color={AUTH.ink[600]} />
    <Text style={s.backLinkText}>{label}</Text>
  </Pressable>
);

// ───────────────────────────────────────────────
// AuthHeading — the type block
// ───────────────────────────────────────────────

export const AuthHeading: React.FC<{
  title: string;
  subtitle?: string;
  /** Small muted line above the title, e.g. "Step 2 of 3". */
  eyebrow?: string;
}> = ({ title, subtitle, eyebrow }) => (
  <View style={s.heading}>
    {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
    <Text style={s.title}>{title}</Text>
    {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
  </View>
);

/** Slim segmented progress. Replaces the decorative dot row. */
export const StepBar: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => (
  <View style={s.stepBar} accessibilityLabel={`Step ${current} of ${total}`}>
    {Array.from({ length: total }, (_, i) => (
      <View key={i} style={[s.stepSeg, i < current && s.stepSegOn]} />
    ))}
  </View>
);

// ───────────────────────────────────────────────
// AuthField — label + input + error
// ───────────────────────────────────────────────

export interface AuthFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  /** Renders the show/hide affordance for password fields. */
  secure?: boolean;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  label,
  error,
  hint,
  secure = false,
  style,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);

  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View
        style={[
          s.inputWrap,
          focused && s.inputWrapFocus,
          !!error && s.inputWrapError,
        ]}>
        <TextInput
          style={[s.input, style]}
          placeholderTextColor={AUTH.ink[400]}
          onFocus={e => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          secureTextEntry={secure && !reveal}
          accessibilityLabel={label}
          {...rest}
        />
        {secure ? (
          <Pressable
            onPress={() => setReveal(v => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}>
            <Feather
              name={reveal ? 'eye-off' : 'eye'}
              size={17}
              color={AUTH.ink[400]}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={s.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={s.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
};

// ───────────────────────────────────────────────
// Buttons
// ───────────────────────────────────────────────

export interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
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
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
    style={({ pressed }) => [
      s.btn,
      s.btnPrimary,
      pressed && s.btnPrimaryPressed,
      (disabled || loading) && s.btnDisabled,
      style,
    ]}>
    {loading ? (
      <>
        <ActivityIndicator size="small" color="#FFFFFF" />
        {loadingLabel ? (
          <Text style={[s.btnLabel, s.btnLabelPrimary]}>{loadingLabel}</Text>
        ) : null}
      </>
    ) : (
      <>
        {icon ? <Feather name={icon} size={16} color="#FFFFFF" /> : null}
        <Text style={[s.btnLabel, s.btnLabelPrimary]}>{label}</Text>
      </>
    )}
  </Pressable>
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
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
    style={({ pressed }) => [
      s.btn,
      s.btnSecondary,
      pressed && s.btnSecondaryPressed,
      (disabled || loading) && s.btnDisabled,
      style,
    ]}>
    {loading ? (
      <>
        <ActivityIndicator size="small" color={AUTH.ink[900]} />
        {loadingLabel ? (
          <Text style={[s.btnLabel, s.btnLabelSecondary]}>{loadingLabel}</Text>
        ) : null}
      </>
    ) : (
      <>
        {icon ? <Feather name={icon} size={16} color={AUTH.ink[900]} /> : null}
        <Text style={[s.btnLabel, s.btnLabelSecondary]}>{label}</Text>
      </>
    )}
  </Pressable>
);

export const AuthTextLink: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  muted?: boolean;
  align?: 'left' | 'center';
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, disabled = false, muted = false, align = 'center', style }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    style={({ pressed }) => [
      s.textLink,
      align === 'center' && s.textLinkCenter,
      pressed && s.pressed,
      style,
    ]}>
    <Text
      style={[
        s.textLinkLabel,
        muted && s.textLinkMuted,
        disabled && s.textLinkDisabled,
      ]}>
      {label}
    </Text>
  </Pressable>
);

// ───────────────────────────────────────────────
// Feedback
// ───────────────────────────────────────────────

const TONE_ICON: Record<AuthTone, FeatherName> = {
  error: 'alert-circle',
  success: 'check-circle',
  info: 'info',
  warning: 'clock',
};

export const InlineBanner: React.FC<{
  tone: AuthTone;
  message: string;
  title?: string;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}> = ({ tone, message, title, onDismiss, style }) => {
  const t = AUTH.status[tone];
  return (
    <View
      style={[s.banner, { backgroundColor: t.bg, borderColor: t.border }, style]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <Feather name={TONE_ICON[tone]} size={16} color={t.accent} style={s.bannerIcon} />
      <View style={s.bannerBody}>
        {title ? <Text style={[s.bannerTitle, { color: t.fg }]}>{title}</Text> : null}
        <Text style={[s.bannerText, { color: t.fg }]}>{message}</Text>
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss">
          <Feather name="x" size={15} color={t.fg} />
        </Pressable>
      ) : null}
    </View>
  );
};

/**
 * A labelled state row for the gate screens (awaiting approval, rejected).
 * Reads as a status field in a record, not as a badge.
 */
export const StatusNote: React.FC<{
  label: string;
  value: string;
  tone?: AuthTone;
}> = ({ label, value, tone = 'warning' }) => {
  const t = AUTH.status[tone];
  return (
    <View style={s.statusNote}>
      <Text style={s.statusLabel}>{label}</Text>
      <View style={s.statusValueRow}>
        <View style={[s.statusDot, { backgroundColor: t.accent }]} />
        <Text style={[s.statusValue, { color: t.fg }]}>{value}</Text>
      </View>
    </View>
  );
};

/** Key/value row used to echo details back to the user (e.g. the email). */
export const AuthDetailRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={s.detailValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

export const AuthDivider: React.FC<{ label?: string }> = ({ label }) =>
  label ? (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      <Text style={s.dividerLabel}>{label}</Text>
      <View style={s.dividerLine} />
    </View>
  ) : (
    <View style={s.divider} />
  );

export const AuthFooter: React.FC<{ label?: string }> = ({
  label = 'Your data is encrypted in transit and at rest',
}) => (
  <View style={s.footer}>
    <Feather name="lock" size={12} color={AUTH.ink[400]} />
    <Text style={s.footerText}>{label}</Text>
  </View>
);

/**
 * A selectable option row (company type, role). Bordered, not a floating
 * card — selection is shown by border weight and colour, not elevation.
 */
export const AuthOptionCard: React.FC<{
  title: string;
  description?: string;
  icon?: FeatherName;
  selected?: boolean;
  badge?: string;
  onPress: () => void;
}> = ({ title, description, icon, selected = false, badge, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={({ pressed }) => [
      s.option,
      selected && s.optionSelected,
      pressed && s.optionPressed,
    ]}>
    {icon ? (
      <View style={[s.optionIcon, selected && s.optionIconSelected]}>
        <Feather
          name={icon}
          size={18}
          color={selected ? AUTH.brand.DEFAULT : AUTH.ink[600]}
        />
      </View>
    ) : null}
    <View style={s.optionBody}>
      <View style={s.optionTitleRow}>
        <Text style={s.optionTitle}>{title}</Text>
        {badge ? (
          <View style={s.optionBadge}>
            <Text style={s.optionBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {description ? <Text style={s.optionDesc}>{description}</Text> : null}
    </View>
    <Feather name="chevron-right" size={18} color={AUTH.ink[400]} />
  </Pressable>
);

// ───────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: AUTH.surface.page },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: AUTH.space.xl,
    paddingTop: AUTH.space.xxl,
    paddingBottom: AUTH.space.xxl,
  },
  column: { width: '100%', maxWidth: AUTH.maxWidth, alignSelf: 'center', flex: 1 },

  // ── Brand ──
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: AUTH.space.xxl },
  brandFin: {
    ...AUTH.type.title,
    fontSize: 17,
    color: AUTH.brand.DEFAULT,
    letterSpacing: -0.3,
  },
  brandMatrix: {
    ...AUTH.type.title,
    fontSize: 17,
    color: AUTH.ink[900],
    letterSpacing: -0.3,
  },

  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.sm,
    alignSelf: 'flex-start',
    marginBottom: AUTH.space.lg,
  },
  backLinkText: { ...AUTH.type.label, color: AUTH.ink[600] },
  pressed: { opacity: 0.6 },

  // ── Heading ──
  heading: { marginBottom: AUTH.space.xl },
  eyebrow: {
    ...AUTH.type.caption,
    fontWeight: '600',
    color: AUTH.ink[500],
    marginBottom: AUTH.space.sm,
  },
  title: { ...AUTH.type.display, color: AUTH.ink[900] },
  subtitle: {
    ...AUTH.type.body,
    color: AUTH.ink[500],
    lineHeight: 22,
    marginTop: AUTH.space.sm,
  },

  stepBar: { flexDirection: 'row', gap: 4, marginBottom: AUTH.space.xl },
  stepSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: AUTH.line.DEFAULT,
  },
  stepSegOn: { backgroundColor: AUTH.brand.DEFAULT },

  // ── Field ──
  field: { marginBottom: AUTH.space.lg },
  fieldLabel: {
    ...AUTH.type.label,
    color: AUTH.ink[700],
    marginBottom: AUTH.space.sm,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.md,
    height: AUTH.control.height,
    paddingHorizontal: AUTH.space.md,
    borderRadius: AUTH.control.radius,
    borderWidth: 1,
    borderColor: AUTH.line.DEFAULT,
    backgroundColor: AUTH.surface.page,
  },
  // Focus is a colour + weight change, not a glow.
  inputWrapFocus: { borderColor: AUTH.brand.DEFAULT, borderWidth: 1.5 },
  inputWrapError: { borderColor: AUTH.status.error.accent },
  input: {
    flex: 1,
    ...AUTH.type.body,
    color: AUTH.ink[900],
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null),
  },
  fieldError: {
    ...AUTH.type.caption,
    color: AUTH.status.error.fg,
    marginTop: AUTH.space.xs + 2,
  },
  fieldHint: {
    ...AUTH.type.caption,
    color: AUTH.ink[500],
    marginTop: AUTH.space.xs + 2,
  },

  // ── Buttons ──
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AUTH.space.sm,
    height: AUTH.control.height,
    borderRadius: AUTH.control.radius,
    paddingHorizontal: AUTH.space.lg,
  },
  btnPrimary: { backgroundColor: AUTH.brand.DEFAULT },
  btnPrimaryPressed: { backgroundColor: AUTH.brand.hover },
  btnSecondary: {
    backgroundColor: AUTH.surface.page,
    borderWidth: 1,
    borderColor: AUTH.line.DEFAULT,
  },
  btnSecondaryPressed: { backgroundColor: AUTH.surface.subtle },
  btnDisabled: { opacity: 0.45 },
  btnLabel: { ...AUTH.type.bodyStrong, fontSize: 15 },
  btnLabelPrimary: { color: '#FFFFFF' },
  btnLabelSecondary: { color: AUTH.ink[900] },

  textLink: { paddingVertical: AUTH.space.md, alignSelf: 'flex-start' },
  textLinkCenter: { alignSelf: 'center' },
  textLinkLabel: { ...AUTH.type.label, color: AUTH.brand.DEFAULT },
  textLinkMuted: { color: AUTH.ink[600] },
  textLinkDisabled: { color: AUTH.ink[400] },

  // ── Banner ──
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AUTH.space.md,
    borderRadius: AUTH.radius.DEFAULT,
    borderWidth: 1,
    paddingVertical: AUTH.space.md,
    paddingHorizontal: AUTH.space.md,
  },
  bannerIcon: { marginTop: 1 },
  bannerBody: { flex: 1, gap: 2 },
  bannerTitle: { ...AUTH.type.label, fontWeight: '600' },
  bannerText: { ...AUTH.type.small, lineHeight: 19 },

  // ── Status ──
  statusNote: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: AUTH.line.DEFAULT,
    paddingVertical: AUTH.space.lg,
    marginBottom: AUTH.space.xl,
    gap: AUTH.space.sm,
  },
  statusLabel: {
    ...AUTH.type.caption,
    color: AUTH.ink[500],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  statusValueRow: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.sm },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusValue: { ...AUTH.type.bodyStrong },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AUTH.space.lg,
    paddingVertical: AUTH.space.md,
    borderBottomWidth: 1,
    borderBottomColor: AUTH.line.DEFAULT,
  },
  detailLabel: { ...AUTH.type.small, color: AUTH.ink[500] },
  detailValue: { ...AUTH.type.bodyStrong, color: AUTH.ink[900], flexShrink: 1 },

  divider: {
    height: 1,
    backgroundColor: AUTH.line.DEFAULT,
    marginVertical: AUTH.space.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.md,
    marginVertical: AUTH.space.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: AUTH.line.DEFAULT },
  dividerLabel: { ...AUTH.type.caption, color: AUTH.ink[500] },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AUTH.space.sm,
    marginTop: 'auto',
    paddingTop: AUTH.space.xxl,
  },
  footerText: { ...AUTH.type.caption, color: AUTH.ink[400] },

  // ── Option row ──
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.lg,
    borderWidth: 1,
    borderColor: AUTH.line.DEFAULT,
    borderRadius: AUTH.radius.lg,
    padding: AUTH.space.lg,
    marginBottom: AUTH.space.md,
    backgroundColor: AUTH.surface.page,
  },
  optionSelected: { borderColor: AUTH.brand.DEFAULT, borderWidth: 1.5 },
  optionPressed: { backgroundColor: AUTH.surface.subtle },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: AUTH.radius.DEFAULT,
    backgroundColor: AUTH.surface.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: AUTH.brand.subtle },
  optionBody: { flex: 1, gap: 2 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.sm },
  optionTitle: { ...AUTH.type.bodyStrong, color: AUTH.ink[900] },
  optionBadge: {
    backgroundColor: AUTH.surface.sunken,
    borderRadius: AUTH.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  optionBadgeText: {
    ...AUTH.type.caption,
    fontSize: 10,
    fontWeight: '700',
    color: AUTH.ink[600],
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  optionDesc: { ...AUTH.type.small, color: AUTH.ink[500], lineHeight: 19 },
});
