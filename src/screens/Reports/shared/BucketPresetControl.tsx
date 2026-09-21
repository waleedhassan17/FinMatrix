// ═══════════════════════════════════════════════════════
// FinMatrix — Aging bucket preset control
// ═══════════════════════════════════════════════════════
// Picks how the aging report slices its columns. Chips for the presets, plus a
// custom editor for a business whose terms match none of them.
//
// Not ReportUI's `Segmented`: that takes an activeIndex over a fixed option
// list and fills its width, which five presets on a phone cannot do legibly.
// This is the chip row the web app's PeriodPicker uses, which wraps.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import { AGING_PRESET_LABELS, type AgingPresetKey } from '../../../models/arAgingModel';

const { colors, radius, spacing, typography, form } = THEME;

/**
 * Same rule the server enforces, so the UI refuses before the round trip.
 *
 * Returns one flat shape rather than a discriminated union: this project
 * compiles with `strictNullChecks: false`, which switches off the narrowing
 * that would make `result.ok ? … : result.why` type-check.
 */
interface ParsedBoundaries {
  /** Empty when the input is not usable. */
  days: number[];
  /** Empty when it is. */
  why: string;
}

const bad = (why: string): ParsedBoundaries => ({ days: [], why });

const parseBoundaries = (raw: string): ParsedBoundaries => {
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return bad('Enter at least one number of days.');
  if (parts.length > 12) return bad('At most 12 columns.');
  const days: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,4}$/.test(p)) return bad(`"${p}" is not a whole number of days.`);
    const v = Number(p);
    if (v < 1) return bad('Days must be 1 or more.');
    if (days.length && v <= days[days.length - 1]) {
      return bad(`${days[days.length - 1]} must be followed by a larger number.`);
    }
    days.push(v);
  }
  return { days, why: '' };
};

/** What the chosen boundaries will actually produce, so the user can check. */
const previewColumns = (days: number[]): string => {
  const parts = ['Current'];
  days.forEach((d, i) => {
    const min = i === 0 ? 1 : days[i - 1] + 1;
    parts.push(min === d ? `${d}` : `${min}–${d}`);
  });
  parts.push(`${days[days.length - 1] + 1}+`);
  return parts.join(' · ');
};

interface Props {
  preset: AgingPresetKey | null;
  customBuckets: string;
  onPickPreset: (key: AgingPresetKey) => void;
  onApplyCustom: (buckets: string) => void;
}

const BucketPresetControl: React.FC<Props> = ({
  preset,
  customBuckets,
  onPickPreset,
  onApplyCustom,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(customBuckets);

  const parsed = parseBoundaries(draft);
  const valid = parsed.days.length > 0;

  const handleChip = (key: AgingPresetKey) => {
    if (key === 'custom') {
      setDraft(customBuckets);
      setEditing(true);
      return;
    }
    setEditing(false);
    onPickPreset(key);
  };

  return (
    <View>
      <Text style={styles.caption}>Age by</Text>

      <View style={styles.chips}>
        {AGING_PRESET_LABELS.map(opt => {
          const on = preset === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => handleChip(opt.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {editing && (
        <View style={styles.editor}>
          <Text style={styles.editorLabel}>
            Column ends, in days overdue — ascending
          </Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="3, 6, 9, 12"
            placeholderTextColor={colors.textDisabled}
            keyboardType="numbers-and-punctuation"
            autoCorrect={false}
            accessibilityLabel="Aging column ends in days"
          />

          {/* What they are about to get, before they commit to it. */}
          {valid ? (
            <Text style={styles.preview} numberOfLines={2}>
              {previewColumns(parsed.days)}
            </Text>
          ) : (
            <View style={styles.whyRow}>
              <Feather name="alert-circle" size={13} color={colors.danger} />
              <Text style={styles.why}>{parsed.why}</Text>
            </View>
          )}

          <View style={styles.editorActions}>
            <TouchableOpacity onPress={() => setEditing(false)} accessibilityRole="button">
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.apply, !valid && styles.applyOff]}
              disabled={!valid}
              onPress={() => {
                setEditing(false);
                onApplyCustom(draft.trim());
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !valid }}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  caption: { ...typography.labelSm, color: colors.textTertiary, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextOn: { color: colors.textInverse },
  editor: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  editorLabel: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xs },
  input: {
    height: form.controlHeight,
    borderRadius: form.controlRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    ...typography.bodyMd,
    color: colors.textPrimary,
  },
  preview: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  whyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xs },
  why: { ...typography.caption, color: colors.danger, flex: 1 },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancel: { ...typography.labelMd, color: colors.textSecondary },
  apply: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  applyOff: { opacity: 0.4 },
  applyText: { ...typography.labelMd, color: colors.textInverse },
});

export default BucketPresetControl;
