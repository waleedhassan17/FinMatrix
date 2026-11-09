// ═══════════════════════════════════════════════════════
// FinMatrix — Form UI kit
// ═══════════════════════════════════════════════════════
// THE single import for form primitives and the button system built on
// CustomButton (src/Custom-Components/CustomButton.tsx):
//
//   FormInput / AmountInput  — CustomInput (48px control, radius 10)
//   FormDropdown             — CustomDropdown (same control spec)
//   FormDatePicker           — ReportUI DateField (web-safe calendar)
//   PrimaryButton / SecondaryButton / DestructiveButton
//                            — CustomButton presets, 48px, full width
//   IconButton               — the square icon-only button (Share, More, and
//                              the one line-delete button every form uses)
//   AddButton                — THE navy Add pill
//   FormSectionHeader        — uppercase 11px section title + optional right slot
//   ActionBar                — THE sticky bottom bar of every transaction
//                              form and document screen
//
// The ActionBar rules, so every screen reads the same:
//   • primary   — the next step in the workflow. One at most.
//   • secondary — the next most common action.
//   • leading   — icon buttons; Share is always the first of them.
//   • more      — everything else, behind "⋯", and EVERY destructive action.
//                 A destructive action always asks before it runs.
//   A bar with nothing but `more` shows its items as buttons instead of a
//   lonely "⋯".

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../utils/theme';
import { Alert } from '../../utils/alert';
import CustomInput from '../../Custom-Components/CustomInput';
import CustomButton from '../../Custom-Components/CustomButton';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import { DateField } from '../reports/ReportUI';
import BottomSheet from '../shared/BottomSheet';

type FeatherName = keyof typeof Feather.glyphMap;
const { colors, spacing, typography } = THEME;

// ── Canonical primitives (re-exports — one true spec each) ──
export const FormInput = CustomInput;
export const FormDropdown = CustomDropdown;
export const FormDatePicker = DateField;

/** Amount/quantity input: FormInput with the numeric keyboard preset. */
export const AmountInput: React.FC<React.ComponentProps<typeof CustomInput>> = (
  props,
) => <CustomInput keyboardType="numeric" {...props} />;

type ButtonPresetProps = {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

/** Full-width 48px navy submit button (spinner + disabled handled). */
export const PrimaryButton: React.FC<ButtonPresetProps> = props => (
  <CustomButton {...props} variant="primary" fullWidth />
);

/** Full-width 48px outlined companion button (Cancel / Save Draft). */
export const SecondaryButton: React.FC<ButtonPresetProps> = props => (
  <CustomButton {...props} variant="secondary" fullWidth />
);

/** Full-width 48px red-outlined button for Void / Delete. */
export const DestructiveButton: React.FC<ButtonPresetProps> = props => (
  <CustomButton {...props} variant="destructive" fullWidth />
);

// ── Icon button ───────────────────────────────────────
/**
 * A square, icon-only button. `md` (48) sits in an ActionBar beside 48px
 * buttons; `sm` (32) with `tone="danger"` is THE remove-this-line button on
 * every line-item form — there used to be five of those, one a "✕" glyph.
 */
export const IconButton: React.FC<{
  icon: FeatherName;
  onPress: () => void;
  /** Required: an icon alone says nothing to a screen reader. */
  accessibilityLabel: string;
  size?: 'md' | 'sm';
  tone?: 'default' | 'danger';
  disabled?: boolean;
  isLoading?: boolean;
}> = ({ icon, onPress, accessibilityLabel, size = 'md', tone = 'default', disabled, isLoading }) => {
  const danger = tone === 'danger';
  const fg = danger ? colors.danger : colors.primary;
  return (
    <TouchableOpacity
      style={[
        size === 'sm' ? styles.iconBtnSm : styles.iconBtn,
        danger && (size === 'sm' ? styles.iconBtnSmDanger : styles.iconBtnDanger),
        (disabled || isLoading) && styles.iconBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      hitSlop={size === 'sm' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, busy: !!isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Feather name={icon} size={size === 'sm' ? 15 : 18} color={fg} />
      )}
    </TouchableOpacity>
  );
};

/**
 * THE navy Add pill — identical size, colour, and typography everywhere an
 * "add a line/item/row" action appears (THEME.form.addPill).
 */
export const AddButton: React.FC<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.addPill, disabled && styles.addPillDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Feather name="plus" size={THEME.form.addPill.iconSize} color={THEME.colors.neutral0} />
    <Text style={styles.addPillText} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * Section header used by the document forms: an uppercase title, with an
 * optional right-side slot (usually an AddButton).
 *
 * The coloured dot that used to lead the title is gone. Each form painted its
 * sections a different colour — red, violet, blue, green — which said nothing
 * and read as decoration.
 */
export const FormSectionHeader: React.FC<{
  title: string;
  right?: React.ReactNode;
  style?: object;
}> = ({ title, right, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </Text>
    {right}
  </View>
);

// ── Action bar ────────────────────────────────────────
/** A button the bar draws itself, so every slot gets the same spec. */
export type BarButton = {
  title: string;
  onPress: () => void;
  icon?: FeatherName;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive' | 'danger';
  accessibilityHint?: string;
};

/** An action behind "⋯". */
export type MoreAction = {
  label: string;
  onPress: () => void;
  icon?: FeatherName;
  /** Red, and confirmed before it runs. */
  destructive?: boolean;
  /**
   * The question asked first. Destructive actions get a default one; pass
   * false when the screen asks its own (a void that needs a reason).
   */
  confirm?: { title: string; message?: string; confirmLabel?: string } | false;
};

type Slot = React.ReactNode | BarButton;

const isBarButton = (s: Slot): s is BarButton =>
  !!s && typeof s === 'object' && !React.isValidElement(s) && 'title' in (s as object) && 'onPress' in (s as object);

const iconColor = (variant: NonNullable<BarButton['variant']>): string =>
  variant === 'primary' || variant === 'danger'
    ? colors.neutral0
    : variant === 'destructive'
      ? colors.danger
      : colors.primary;

const renderSlot = (slot: Slot, fallback: NonNullable<BarButton['variant']>): React.ReactNode => {
  if (!isBarButton(slot)) return slot;
  const variant = slot.variant ?? fallback;
  return (
    <CustomButton
      title={slot.title}
      onPress={slot.onPress}
      variant={variant}
      isLoading={slot.isLoading}
      disabled={slot.disabled}
      accessibilityHint={slot.accessibilityHint}
      icon={slot.icon ? <Feather name={slot.icon} size={16} color={iconColor(variant)} /> : undefined}
      fullWidth
      compact
    />
  );
};

/**
 * Runs a More action, asking first when it is destructive or carries its own
 * question. Uses the web-safe Alert, so the question also appears on the web
 * build instead of the action silently doing nothing.
 */
export const runConfirmed = (a: MoreAction): void => {
  const ask =
    a.confirm === false
      ? null
      : a.confirm ?? (a.destructive ? { title: `${a.label}?`, message: 'This cannot be undone.' } : null);
  if (!ask) {
    a.onPress();
    return;
  }
  Alert.alert(ask.title, ask.message, [
    { text: 'Cancel', style: 'cancel' },
    { text: ask.confirmLabel ?? a.label, style: a.destructive ? 'destructive' : 'default', onPress: a.onPress },
  ]);
};

/**
 * THE sticky bottom bar. Sits outside the screen's ScrollView, above the tab
 * bar, so a form's Save and a document's next step are always in the same
 * place and always in reach.
 */
export const ActionBar: React.FC<{
  /** Icon buttons on the left — Share first. */
  leading?: React.ReactNode;
  secondary?: Slot;
  primary?: Slot;
  more?: MoreAction[];
  /** Heading of the More sheet. */
  moreTitle?: string;
  /**
   * Closes "⋯" while the screen is busy. A sheet row has no spinner, so this is
   * what stops a second action starting while the first is in flight: approving
   * and opening the invoice to record it again, or converting an estimate twice.
   */
  moreDisabled?: boolean;
  /** A line above the buttons — a running total, a balance check. */
  summary?: React.ReactNode;
  /** A caption under the buttons — why the primary cannot run yet. */
  note?: React.ReactNode;
}> = ({ leading, secondary, primary, more, moreTitle = 'More actions', moreDisabled, summary, note }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  let items = (more ?? []).filter(Boolean);

  // Nothing but "⋯" would be a bar with one mystery button: show the actions.
  let promotedSecondary: Slot = secondary;
  let promotedPrimary: Slot = primary;
  if (!primary && !secondary && items.length > 0 && items.length <= 2) {
    const asButton = (a: MoreAction): BarButton => ({
      title: a.label,
      onPress: () => runConfirmed(a),
      icon: a.icon,
      disabled: moreDisabled,
      variant: a.destructive ? 'destructive' : 'secondary',
    });
    if (items.length === 2) {
      promotedSecondary = asButton(items[0]);
      promotedPrimary = asButton(items[1]);
    } else {
      promotedPrimary = asButton(items[0]);
    }
    items = [];
  }

  const pick = useCallback((a: MoreAction) => {
    setMoreOpen(false);
    // Let the sheet finish closing first: an Alert raised over a closing
    // Modal is dismissed with it on iOS.
    setTimeout(() => runConfirmed(a), 250);
  }, []);

  const hasSecondary = promotedSecondary !== undefined && promotedSecondary !== null && promotedSecondary !== false;
  const hasPrimary = promotedPrimary !== undefined && promotedPrimary !== null && promotedPrimary !== false;

  return (
    <View style={styles.bar}>
      {summary ? <View style={styles.barSummary}>{summary}</View> : null}
      <View style={styles.barRow}>
        {leading}
        {items.length > 0 ? (
          <IconButton
            icon="more-horizontal"
            onPress={() => setMoreOpen(true)}
            accessibilityLabel={moreTitle}
            disabled={moreDisabled}
          />
        ) : null}
        {hasSecondary ? <View style={hasPrimary ? styles.slotSecondary : styles.slotAlone}>{renderSlot(promotedSecondary, 'secondary')}</View> : null}
        {hasPrimary ? <View style={hasSecondary ? styles.slotPrimary : styles.slotAlone}>{renderSlot(promotedPrimary, 'primary')}</View> : null}
      </View>
      {note ? (typeof note === 'string' ? <Text style={styles.barNote}>{note}</Text> : note) : null}

      {items.length > 0 ? (
        <BottomSheet visible={moreOpen} onClose={() => setMoreOpen(false)} title={moreTitle}>
          {items.map((a, i) => (
            <TouchableOpacity
              key={`${a.label}-${i}`}
              style={[styles.moreRow, i > 0 && styles.moreRowRule]}
              onPress={() => pick(a)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              {a.icon ? (
                <Feather name={a.icon} size={18} color={a.destructive ? colors.danger : colors.textSecondary} />
              ) : null}
              <Text style={[styles.moreLabel, a.destructive && styles.moreLabelDanger]} numberOfLines={1}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheet>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Icon button ──
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: { borderColor: colors.dangerLight },
  iconBtnSm: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSmDanger: { borderColor: 'transparent', backgroundColor: colors.dangerLighter },
  iconBtnDisabled: { opacity: 0.5 },

  // ── Add pill ──
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: THEME.form.addPill.paddingHorizontal,
    paddingVertical: THEME.form.addPill.paddingVertical,
    backgroundColor: THEME.form.addPill.background,
    borderRadius: THEME.form.addPill.radius,
  },
  addPillDisabled: { opacity: 0.5 },
  addPillText: {
    fontFamily: THEME.typography.fontFamily,
    fontSize: THEME.form.addPill.fontSize,
    fontWeight: THEME.form.addPill.fontWeight,
    color: THEME.colors.neutral0,
  },

  // ── Section header ──
  // marginTop as well as marginBottom: these headers carry an Add pill on the
  // right which is nearly three times the title's height, so without space
  // above it the pill came within a couple of pixels of the card before it.
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: { ...THEME.form.sectionTitle, flexShrink: 1, marginRight: spacing.xs },

  // ── Action bar ──
  bar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...THEME.shadows.sm,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  slotSecondary: { flex: 1 },
  slotPrimary: { flex: 1.4 },
  slotAlone: { flex: 1 },
  barSummary: { marginBottom: spacing.xs },
  barNote: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxs },

  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
  },
  moreRowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  moreLabel: { ...typography.bodyMd, color: colors.textPrimary, flex: 1 },
  moreLabelDanger: { color: colors.danger },
});
