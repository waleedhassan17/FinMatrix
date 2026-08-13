// ═══════════════════════════════════════════════════════
// FinMatrix — Auth UI kit
// ═══════════════════════════════════════════════════════
// Implements the approved auth/onboarding design. See authTokens.ts for the
// anatomy diagram. Standard screen shape:
//
//   <AuthLayout
//     header={<AuthHeader pill title subtitle step={{current,total}} onBack />}
//     footer={<AuthFooterBar primary={{...}} secondary={{...}} note />}
//   >
//     ...body cards
//   </AuthLayout>
//
// AuthLayout pins the header to the top and the footer to the bottom, and
// scrolls only the body between them — so the primary action stays reachable
// on long forms without the user hunting for it.

import React, { useRef, useState } from 'react';
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

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// ───────────────────────────────────────────────
// Layout — fixed header, scrolling body, sticky footer
// ───────────────────────────────────────────────

export const AuthLayout: React.FC<{
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
  contentStyle?: StyleProp<ViewStyle>;
}> = ({ header, footer, children, scrollRef, contentStyle }) => (
  <View style={s.root}>
    <StatusBar barStyle="light-content" backgroundColor={AUTH.header.bg} />
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView
        ref={scrollRef}
        style={s.flex}
        contentContainerStyle={[s.body, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={s.column}>{children}</View>
      </ScrollView>
      {footer}
    </KeyboardAvoidingView>
  </View>
);

// ───────────────────────────────────────────────
// Header
// ───────────────────────────────────────────────

export const AuthHeader: React.FC<{
  title: string;
  subtitle?: string;
  /** Uppercase status chip, top-right. */
  pill?: string;
  onBack?: () => void;
  step?: { current: number; total: number };
  /** Hide the wordmark on screens deep in a flow. */
  brand?: boolean;
}> = ({ title, subtitle, pill, onBack, step, brand = true }) => (
  <View style={s.header}>
    <SafeAreaView edges={['top']} style={s.headerInner}>
      {(onBack || pill) && (
        <View style={s.headerTop}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [s.backChip, pressed && s.pressed]}>
              <Feather name="arrow-left" size={19} color="#FFFFFF" />
            </Pressable>
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

      {brand ? (
        <View style={s.brand}>
          <Text style={s.brandFin}>Fin</Text>
          <Text style={s.brandMatrix}>Matrix</Text>
        </View>
      ) : null}

      <Text style={s.headerTitle}>{title}</Text>
      {subtitle ? <Text style={s.headerSub}>{subtitle}</Text> : null}

      {step ? (
        <View style={s.stepRow}>
          <View style={s.stepSegs}>
            {Array.from({ length: step.total }, (_, i) => (
              <View
                key={i}
                style={[s.stepSeg, i < step.current && s.stepSegOn]}
              />
            ))}
          </View>
          <Text style={s.stepLabel}>
            Step {step.current} of {step.total}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  </View>
);

// ───────────────────────────────────────────────
// Sticky footer
// ───────────────────────────────────────────────

export interface FooterAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}

export const AuthFooterBar: React.FC<{
  primary: FooterAction;
  secondary?: { label: string; onPress: () => void; disabled?: boolean };
  note?: string;
  /** Suppress the trailing arrow on the primary button. */
  noArrow?: boolean;
}> = ({ primary, secondary, note, noArrow = false }) => (
  <View style={s.footer}>
    <SafeAreaView edges={['bottom']}>
      <Pressable
        onPress={primary.onPress}
        disabled={primary.disabled || primary.loading}
        accessibilityRole="button"
        accessibilityState={{
          disabled: primary.disabled || primary.loading,
          busy: primary.loading,
        }}
        style={({ pressed }) => [
          s.primaryBtn,
          pressed && s.primaryBtnPressed,
          (primary.disabled || primary.loading) && s.primaryBtnDisabled,
        ]}>
        {primary.loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            {primary.loadingLabel ? (
              <Text style={s.primaryLabel}>{primary.loadingLabel}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={s.primaryLabel}>{primary.label}</Text>
            {!noArrow ? (
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            ) : null}
          </>
        )}
      </Pressable>

      {secondary ? (
        <Pressable
          onPress={secondary.onPress}
          disabled={secondary.disabled}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}>
          <Text
            style={[
              s.secondaryLabel,
              secondary.disabled && s.secondaryLabelDisabled,
            ]}>
            {secondary.label}
          </Text>
        </Pressable>
      ) : null}

      {note ? (
        <View style={s.footerNote}>
          <Feather name="lock" size={11} color={AUTH.ink[400]} />
          <Text style={s.footerNoteText}>{note}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  </View>
);

// ───────────────────────────────────────────────
// Building blocks
// ───────────────────────────────────────────────

/** 48px rounded tile with a tinted icon — the flow's section marker. */
export const AuthIconTile: React.FC<{
  icon: FeatherName;
  tone?: AuthTone | 'brand';
  style?: StyleProp<ViewStyle>;
}> = ({ icon, tone = 'brand', style }) => {
  const p =
    tone === 'brand'
      ? { bg: AUTH.mint, fg: AUTH.brand }
      : { bg: AUTH.status[tone].bg, fg: AUTH.status[tone].accent };
  return (
    <View style={[s.tile, { backgroundColor: p.bg }, style]}>
      <Feather name={icon} size={22} color={p.fg} />
    </View>
  );
};

export const AuthCard: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}> = ({ children, style, padded = true }) => (
  <View style={[s.card, padded && s.cardPadded, style]}>{children}</View>
);

export const AuthLabel: React.FC<{ children: string; style?: StyleProp<ViewStyle> }> = ({
  children,
  style,
}) => <Text style={[s.label, style as never]}>{children}</Text>;

/** Small-caps section rule, e.g. ADDRESS / WHAT HAPPENS NEXT. */
export const AuthSectionLabel: React.FC<{ children: string; rule?: boolean }> = ({
  children,
  rule = true,
}) => (
  <View style={s.sectionLabelRow}>
    <Text style={s.sectionLabel}>{children}</Text>
    {rule ? <View style={s.sectionRule} /> : null}
  </View>
);

export interface AuthFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Password field: renders the Show/Hide affordance. */
  secure?: boolean;
  right?: React.ReactNode;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  label,
  error,
  hint,
  secure = false,
  right,
  style,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);

  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
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
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            style={s.showBtn}>
            <Text style={s.showBtnText}>{reveal ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : (
          right
        )}
      </View>
      {error ? (
        <Text style={s.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={s.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
};

/** Tinted notice with an icon — replaces floating toasts and browser dialogs. */
export const AuthNotice: React.FC<{
  tone?: AuthTone;
  message: string;
  title?: string;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
}> = ({ tone = 'info', message, title, onDismiss, style }) => {
  const t = AUTH.status[tone];
  const icon: FeatherName =
    tone === 'error'
      ? 'alert-circle'
      : tone === 'warning'
      ? 'clock'
      : tone === 'success'
      ? 'check-circle'
      : 'info';
  return (
    <View
      style={[s.notice, { backgroundColor: t.bg, borderColor: t.border }, style]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <Feather name={icon} size={16} color={t.accent} style={s.noticeIcon} />
      <View style={s.noticeBody}>
        {title ? <Text style={[s.noticeTitle, { color: t.fg }]}>{title}</Text> : null}
        <Text style={[s.noticeText, { color: t.fg }]}>{message}</Text>
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <Feather name="x" size={15} color={t.fg} />
        </Pressable>
      ) : null}
    </View>
  );
};

/** Neutral white helper card (e.g. "Codes expire after 10 minutes"). */
export const AuthHelpCard: React.FC<{ message: string }> = ({ message }) => (
  <View style={s.helpCard}>
    <Feather name="info" size={15} color={AUTH.ink[400]} style={s.noticeIcon} />
    <Text style={s.helpText}>{message}</Text>
  </View>
);

/** Requirement checklist — ticks fill in as each rule is satisfied. */
export const AuthChecklist: React.FC<{
  items: { label: string; met: boolean }[];
}> = ({ items }) => (
  <View style={s.checklist}>
    {items.map(it => (
      <View key={it.label} style={s.checkRow}>
        <View style={[s.checkDot, it.met && s.checkDotOn]}>
          <Feather
            name="check"
            size={11}
            color={it.met ? '#FFFFFF' : AUTH.ink[400]}
          />
        </View>
        <Text style={[s.checkLabel, it.met && s.checkLabelOn]}>{it.label}</Text>
      </View>
    ))}
  </View>
);

/** Numbered "what happens next" list. */
export const AuthSteps: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={s.stepsList}>
    {items.map((label, i) => (
      <View key={label} style={[s.stepItem, i > 0 && s.stepItemDivided]}>
        <View style={s.stepNum}>
          <Text style={s.stepNumText}>{i + 1}</Text>
        </View>
        <Text style={s.stepItemText}>{label}</Text>
      </View>
    ))}
  </View>
);

/** Progress timeline for the approval screen. */
export const AuthTimeline: React.FC<{
  items: { title: string; detail?: string; done?: boolean }[];
}> = ({ items }) => (
  <View style={s.timeline}>
    {items.map((it, i) => (
      <View key={it.title} style={[s.tlRow, i > 0 && s.tlRowDivided]}>
        <View style={[s.tlDot, it.done && s.tlDotOn]}>
          <Feather
            name={it.done ? 'check' : 'circle'}
            size={it.done ? 12 : 8}
            color={it.done ? '#FFFFFF' : AUTH.ink[400]}
          />
        </View>
        <View style={s.tlBody}>
          <Text style={[s.tlTitle, !it.done && s.tlTitleMuted]}>{it.title}</Text>
          {it.detail ? <Text style={s.tlDetail}>{it.detail}</Text> : null}
        </View>
      </View>
    ))}
  </View>
);

/** Dot chips summarising what a card includes. */
export const AuthChips: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={s.chipRow}>
    {items.map(label => (
      <View key={label} style={s.chip}>
        <View style={s.chipDot} />
        <Text style={s.chipText}>{label}</Text>
      </View>
    ))}
  </View>
);

export const StatusPill: React.FC<{ label: string; tone?: AuthTone }> = ({
  label,
  tone = 'warning',
}) => {
  const t = AUTH.status[tone];
  return (
    <View style={[s.statusPill, { backgroundColor: t.bg, borderColor: t.border }]}>
      <View style={[s.statusDot, { backgroundColor: t.accent }]} />
      <Text style={[s.statusText, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

/** Selectable option card with a radio and a feature list. */
export const AuthOptionCard: React.FC<{
  title: string;
  tagline?: string;
  icon?: FeatherName;
  badge?: string;
  features?: string[];
  selected?: boolean;
  /** Renders the radio control. Omit for a plain tappable card. */
  selectable?: boolean;
  onPress: () => void;
}> = ({
  title,
  tagline,
  icon,
  badge,
  features,
  selected = false,
  selectable = true,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={({ pressed }) => [
      s.option,
      selected && s.optionSelected,
      pressed && s.optionPressed,
    ]}>
    <View style={s.optionHead}>
      {icon ? <AuthIconTile icon={icon} style={s.optionTile} /> : null}
      <View style={s.optionHeadText}>
        <View style={s.optionTitleRow}>
          <Text style={s.optionTitle}>{title}</Text>
          {badge ? (
            <View style={s.optionBadge}>
              <Text style={s.optionBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {tagline ? <Text style={s.optionTagline}>{tagline}</Text> : null}
      </View>
      {selectable ? (
        <View style={[s.radio, selected && s.radioOn]}>
          {selected ? <View style={s.radioInner} /> : null}
        </View>
      ) : null}
    </View>

    {features?.length ? (
      <View style={s.optionFeatures}>
        {features.map(f => (
          <View key={f} style={s.optionFeatureRow}>
            <Feather name="check" size={13} color={AUTH.brand} />
            <Text style={s.optionFeatureText}>{f}</Text>
          </View>
        ))}
      </View>
    ) : null}
  </Pressable>
);

/** Segmented password-strength meter with a label/value row. */
export const PasswordStrength: React.FC<{
  score: 0 | 1 | 2 | 3;
  label: string;
  color?: string;
}> = ({ score, label, color = AUTH.brand }) => (
  <View style={s.strength}>
    <View style={s.strengthSegs}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[
            s.strengthSeg,
            i < score && { backgroundColor: color },
          ]}
        />
      ))}
    </View>
    <View style={s.strengthMeta}>
      <Text style={s.strengthLabel}>Password strength</Text>
      <Text style={[s.strengthValue, score > 0 && { color }]}>{label}</Text>
    </View>
  </View>
);

// ───────────────────────────────────────────────
// OtpInput — six discrete boxes
// ───────────────────────────────────────────────
// One hidden TextInput spans the row so a pasted or SMS-autofilled code
// arrives in a single onChangeText. Six real inputs would only ever fill the
// first box on paste and need fragile ref-chaining to fake the rest.

export const OtpInput: React.FC<{
  value: string;
  onChange: (digits: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  onComplete?: (digits: string) => void;
  style?: StyleProp<ViewStyle>;
}> = ({ value, onChange, length = 6, autoFocus, error, onComplete, style }) => {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      style={[s.otpRow, style]}
      accessibilityRole="none">
      {Array.from({ length }, (_, i) => {
        const ch = value[i] ?? '';
        const on = focused && i === active;
        return (
          <View
            key={i}
            style={[
              s.otpBox,
              ch !== '' && s.otpBoxFilled,
              on && s.otpBoxActive,
              error && s.otpBoxError,
            ]}>
            <Text style={s.otpDigit}>{ch}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={t => {
          const d = t.replace(/\D/g, '').slice(0, length);
          onChange(d);
          if (d.length === length) onComplete?.(d);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={s.otpHidden}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        accessibilityLabel={`${length}-digit code`}
      />
    </Pressable>
  );
};

// ───────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: AUTH.canvas },
  flex: { flex: 1 },
  body: { paddingVertical: AUTH.space.xxl, paddingHorizontal: AUTH.space.xl },
  column: { width: '100%', maxWidth: AUTH.maxWidth, alignSelf: 'center' },
  pressed: { opacity: 0.65 },

  // ── Header ──
  header: {
    backgroundColor: AUTH.header.bg,
    borderBottomLeftRadius: AUTH.header.radius,
    borderBottomRightRadius: AUTH.header.radius,
    overflow: 'hidden',
  },
  headerInner: {
    paddingHorizontal: AUTH.space.xl,
    paddingTop: AUTH.space.md,
    paddingBottom: AUTH.space.xxl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: AUTH.space.lg,
  },
  backChip: {
    width: 40,
    height: 40,
    borderRadius: AUTH.radius.lg,
    backgroundColor: AUTH.header.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AUTH.radius.pill,
    backgroundColor: AUTH.header.pillBg,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AUTH.brandDot },
  pillText: {
    fontFamily: AUTH.font,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: AUTH.header.pillText,
  },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: AUTH.space.sm },
  brandFin: {
    fontFamily: AUTH.font,
    fontSize: 16,
    fontWeight: '800',
    color: AUTH.brandDot,
  },
  brandMatrix: {
    fontFamily: AUTH.font,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: AUTH.font,
    fontSize: 30,
    fontWeight: '800',
    color: AUTH.header.title,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  headerSub: {
    fontFamily: AUTH.font,
    fontSize: 14,
    color: AUTH.header.subtitle,
    lineHeight: 21,
    marginTop: AUTH.space.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.md,
    marginTop: AUTH.space.xl,
  },
  stepSegs: { flexDirection: 'row', gap: 6, flex: 1 },
  stepSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  stepSegOn: { backgroundColor: AUTH.brandDot },
  stepLabel: {
    fontFamily: AUTH.font,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
  },

  // ── Footer ──
  footer: {
    backgroundColor: AUTH.surface,
    borderTopWidth: 1,
    borderTopColor: AUTH.line,
    paddingHorizontal: AUTH.space.xl,
    paddingTop: AUTH.space.lg,
    ...AUTH.footerShadow,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AUTH.space.sm,
    height: AUTH.button.height,
    borderRadius: AUTH.button.radius,
    backgroundColor: AUTH.brand,
    width: '100%',
    maxWidth: AUTH.maxWidth,
    alignSelf: 'center',
  },
  primaryBtnPressed: { backgroundColor: AUTH.brandDark },
  primaryBtnDisabled: { backgroundColor: AUTH.lineStrong },
  primaryLabel: {
    fontFamily: AUTH.font,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: { alignItems: 'center', paddingVertical: AUTH.space.lg },
  secondaryLabel: {
    fontFamily: AUTH.font,
    fontSize: 15,
    fontWeight: '700',
    color: AUTH.ink[700],
  },
  secondaryLabelDisabled: { color: AUTH.ink[400] },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: AUTH.space.md,
  },
  footerNoteText: { fontFamily: AUTH.font, fontSize: 12, color: AUTH.ink[400] },

  // ── Blocks ──
  tile: {
    width: AUTH.tile.size,
    height: AUTH.tile.size,
    borderRadius: AUTH.tile.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: AUTH.surface,
    borderRadius: AUTH.radius.xl,
    borderWidth: 1,
    borderColor: AUTH.line,
    ...AUTH.cardShadow,
  },
  cardPadded: { padding: AUTH.space.xl },

  label: {
    fontFamily: AUTH.font,
    fontSize: 13,
    fontWeight: '600',
    color: AUTH.ink[700],
    marginBottom: AUTH.space.sm,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.md,
    marginTop: AUTH.space.lg,
    marginBottom: AUTH.space.md,
  },
  sectionLabel: {
    fontFamily: AUTH.font,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: AUTH.ink[400],
  },
  sectionRule: { flex: 1, height: 1, backgroundColor: AUTH.line },

  field: { marginBottom: AUTH.space.lg },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.sm,
    minHeight: AUTH.control.height,
    paddingHorizontal: AUTH.space.lg,
    borderRadius: AUTH.control.radius,
    borderWidth: 1,
    borderColor: AUTH.line,
    backgroundColor: AUTH.surface,
  },
  inputWrapFocus: { borderColor: AUTH.brand, borderWidth: 1.5 },
  inputWrapError: { borderColor: AUTH.status.error.accent },
  input: {
    flex: 1,
    fontFamily: AUTH.font,
    fontSize: 15,
    color: AUTH.ink[900],
    paddingVertical: AUTH.space.md,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null),
  },
  showBtn: {
    paddingHorizontal: AUTH.space.md,
    paddingVertical: 6,
    borderRadius: AUTH.radius.sm,
    backgroundColor: AUTH.sunken,
  },
  showBtnText: {
    fontFamily: AUTH.font,
    fontSize: 13,
    fontWeight: '700',
    color: AUTH.ink[700],
  },
  fieldError: {
    fontFamily: AUTH.font,
    fontSize: 12,
    color: AUTH.status.error.fg,
    marginTop: 6,
  },
  fieldHint: {
    fontFamily: AUTH.font,
    fontSize: 12,
    color: AUTH.ink[500],
    marginTop: 6,
  },

  // ── Notices ──
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AUTH.space.md,
    borderRadius: AUTH.radius.lg,
    borderWidth: 1,
    padding: AUTH.space.lg,
    marginBottom: AUTH.space.lg,
  },
  noticeIcon: { marginTop: 1 },
  noticeBody: { flex: 1, gap: 2 },
  noticeTitle: { fontFamily: AUTH.font, fontSize: 13, fontWeight: '700' },
  noticeText: { fontFamily: AUTH.font, fontSize: 13, lineHeight: 20 },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AUTH.space.md,
    backgroundColor: AUTH.surface,
    borderRadius: AUTH.radius.lg,
    borderWidth: 1,
    borderColor: AUTH.line,
    padding: AUTH.space.lg,
  },
  helpText: {
    flex: 1,
    fontFamily: AUTH.font,
    fontSize: 13,
    lineHeight: 20,
    color: AUTH.ink[500],
  },

  // ── Checklist ──
  checklist: {
    backgroundColor: AUTH.surface,
    borderRadius: AUTH.radius.lg,
    borderWidth: 1,
    borderColor: AUTH.line,
    padding: AUTH.space.lg,
    gap: AUTH.space.md,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.md },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AUTH.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotOn: { backgroundColor: AUTH.brand },
  checkLabel: { fontFamily: AUTH.font, fontSize: 13.5, color: AUTH.ink[500] },
  checkLabelOn: { color: AUTH.ink[900], fontWeight: '600' },

  // ── Numbered steps ──
  stepsList: {
    backgroundColor: AUTH.surface,
    borderRadius: AUTH.radius.lg,
    borderWidth: 1,
    borderColor: AUTH.line,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.lg,
    padding: AUTH.space.lg,
  },
  stepItemDivided: { borderTopWidth: 1, borderTopColor: AUTH.line },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AUTH.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: AUTH.font,
    fontSize: 12,
    fontWeight: '700',
    color: AUTH.ink[500],
  },
  stepItemText: {
    flex: 1,
    fontFamily: AUTH.font,
    fontSize: 13.5,
    lineHeight: 20,
    color: AUTH.ink[700],
  },

  // ── Timeline ──
  timeline: {
    backgroundColor: AUTH.surface,
    borderRadius: AUTH.radius.lg,
    borderWidth: 1,
    borderColor: AUTH.line,
  },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AUTH.space.lg,
    padding: AUTH.space.lg,
  },
  tlRowDivided: { borderTopWidth: 1, borderTopColor: AUTH.line },
  tlDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AUTH.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tlDotOn: { backgroundColor: AUTH.brand },
  tlBody: { flex: 1, gap: 2 },
  tlTitle: {
    fontFamily: AUTH.font,
    fontSize: 14,
    fontWeight: '700',
    color: AUTH.ink[900],
  },
  tlTitleMuted: { color: AUTH.ink[500], fontWeight: '600' },
  tlDetail: { fontFamily: AUTH.font, fontSize: 12.5, color: AUTH.ink[500] },

  // ── Chips ──
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: AUTH.space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: AUTH.line,
    borderRadius: AUTH.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: AUTH.brand },
  chipText: {
    fontFamily: AUTH.font,
    fontSize: 12.5,
    fontWeight: '600',
    color: AUTH.ink[700],
  },

  // ── Status pill ──
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AUTH.radius.pill,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontFamily: AUTH.font, fontSize: 12.5, fontWeight: '700' },

  // ── Option card ──
  option: {
    backgroundColor: AUTH.surface,
    borderRadius: AUTH.radius.xl,
    borderWidth: 1,
    borderColor: AUTH.line,
    padding: AUTH.space.xl,
    marginBottom: AUTH.space.lg,
    ...AUTH.cardShadow,
  },
  optionSelected: { borderColor: AUTH.brand, borderWidth: 1.5 },
  optionPressed: { backgroundColor: AUTH.sunken },
  optionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: AUTH.space.lg },
  optionTile: { width: 44, height: 44 },
  optionHeadText: { flex: 1, gap: 3 },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.sm,
    flexWrap: 'wrap',
  },
  optionTitle: {
    fontFamily: AUTH.font,
    fontSize: 17,
    fontWeight: '800',
    color: AUTH.ink[900],
    letterSpacing: -0.2,
  },
  optionBadge: {
    backgroundColor: AUTH.mint,
    borderRadius: AUTH.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  optionBadgeText: {
    fontFamily: AUTH.font,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: AUTH.brand,
  },
  optionTagline: {
    fontFamily: AUTH.font,
    fontSize: 13.5,
    lineHeight: 20,
    color: AUTH.ink[500],
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: AUTH.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOn: { borderColor: AUTH.brand },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: AUTH.brand,
  },
  optionFeatures: {
    gap: AUTH.space.md,
    marginTop: AUTH.space.lg,
    paddingTop: AUTH.space.lg,
    borderTopWidth: 1,
    borderTopColor: AUTH.line,
  },
  optionFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.md },
  optionFeatureText: {
    flex: 1,
    fontFamily: AUTH.font,
    fontSize: 13.5,
    color: AUTH.ink[700],
  },

  // ── Strength ──
  strength: { marginTop: -AUTH.space.sm, marginBottom: AUTH.space.lg, gap: AUTH.space.sm },
  strengthSegs: { flexDirection: 'row', gap: 6 },
  strengthSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: AUTH.line,
  },
  strengthMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  strengthLabel: { fontFamily: AUTH.font, fontSize: 12.5, color: AUTH.ink[500] },
  strengthValue: {
    fontFamily: AUTH.font,
    fontSize: 12.5,
    fontWeight: '700',
    color: AUTH.ink[400],
  },

  // ── OTP ──
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: AUTH.space.sm,
    position: 'relative',
  },
  otpBox: {
    flex: 1,
    height: 58,
    maxWidth: 58,
    borderRadius: AUTH.radius.lg,
    borderWidth: 1,
    borderColor: AUTH.line,
    backgroundColor: AUTH.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: { borderColor: AUTH.lineStrong },
  otpBoxActive: { borderColor: AUTH.brand, borderWidth: 1.5 },
  otpBoxError: { borderColor: AUTH.status.error.accent },
  otpDigit: {
    fontFamily: AUTH.font,
    fontSize: 22,
    fontWeight: '700',
    color: AUTH.ink[900],
  },
  otpHidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
    fontSize: 22,
    textAlign: 'center',
  },
});
