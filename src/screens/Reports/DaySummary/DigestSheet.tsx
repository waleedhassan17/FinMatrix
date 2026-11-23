// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary · daily digest settings (owner)
// ═══════════════════════════════════════════════════════
// On or off, when it goes out (company time), and whether it is also
// emailed. Evening times send that day; morning times recap the day before.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';

import { THEME } from '../../../theme';
import BottomSheet from '../../../components/shared/BottomSheet';
import { DIGEST_HOURS, zoneLabel, type DaySummarySchedule } from '../../../models/daySummaryModel';

const { colors, radius, spacing, typography } = THEME;

type Choice = { enabled: boolean; hour: number; email: boolean };

/**
 * The form, mounted afresh each time the sheet opens (see the key below), so
 * it starts from what is saved without copying props into state in an effect.
 */
const DigestForm: React.FC<{
  schedule: DaySummarySchedule | null;
  saving: boolean;
  error: string;
  onSave: (next: Choice) => void;
}> = ({ schedule, saving, error, onSave }) => {
  const [enabled, setEnabled] = useState(schedule?.enabled ?? false);
  const [hour, setHour] = useState(schedule?.hour ?? 21);
  const [email, setEmail] = useState(schedule?.email ?? true);

  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Send me the day’s summary</Text>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ true: colors.primary, false: colors.neutral300 }}
          accessibilityLabel="Send me the day’s summary"
        />
      </View>

      <Text style={[styles.section, !enabled && styles.dim]}>When</Text>
      <View style={styles.hours}>
        {DIGEST_HOURS.map(h => {
          const on = h.hour === hour;
          return (
            <TouchableOpacity
              key={h.hour}
              style={[styles.hour, on && styles.hourOn, !enabled && styles.dim]}
              disabled={!enabled}
              onPress={() => setHour(h.hour)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !enabled }}
              accessibilityLabel={`${h.label}, ${h.hint}`}
            >
              <Text style={[styles.hourText, on && styles.hourTextOn]}>{h.label}</Text>
              <Text style={[styles.hourHint, on && styles.hourTextOn]}>{h.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.row, !enabled && styles.dim]}>
        <Text style={styles.rowLabel}>Email it to owners too</Text>
        <Switch
          value={email}
          onValueChange={setEmail}
          disabled={!enabled}
          trackColor={{ true: colors.primary, false: colors.neutral300 }}
          accessibilityLabel="Email it to owners too"
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.save, saving && styles.saveBusy]}
        onPress={() => onSave({ enabled, hour, email })}
        disabled={saving}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ busy: saving, disabled: saving }}
      >
        {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.saveText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
};

const DigestSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  schedule: DaySummarySchedule | null;
  /** The saved settings could not be read. */
  loadError?: string;
  onReload?: () => void;
  saving: boolean;
  error: string;
  onSave: (next: Choice) => void;
}> = ({ visible, onClose, schedule, loadError = '', onReload, saving, error, onSave }) => (
  <BottomSheet
    visible={visible}
    onClose={onClose}
    title="Daily summary"
    subtitle={`Every owner gets the day’s headline in the bell${schedule?.timezone ? ` (${zoneLabel(schedule.timezone)})` : ''}.`}
  >
    {schedule ? (
      <DigestForm
        key={visible ? `open-${schedule.enabled}-${schedule.hour}-${schedule.email}` : 'closed'}
        schedule={schedule}
        saving={saving}
        error={error}
        onSave={onSave}
      />
    ) : (
      // Until the saved settings are in hand the form has nothing true to show,
      // and saving it would overwrite them with defaults.
      <View style={styles.waiting}>
        {loadError ? (
          <>
            <Text style={styles.rowLabel}>{loadError}</Text>
            {onReload ? (
              <TouchableOpacity style={styles.save} onPress={onReload} accessibilityRole="button" activeOpacity={0.85}>
                <Text style={styles.saveText}>Try again</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading your settings" />
        )}
      </View>
    )}
  </BottomSheet>
);

const styles = StyleSheet.create({
  waiting: { paddingVertical: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { ...typography.bodyMd, color: colors.textPrimary, flex: 1 },
  section: { ...typography.labelMd, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xs },
  dim: { opacity: 0.45 },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  hour: {
    width: '31.5%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  hourOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourText: { ...typography.labelMd, color: colors.textPrimary },
  hourHint: { ...typography.caption, color: colors.textTertiary },
  hourTextOn: { color: colors.textInverse },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  save: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBusy: { opacity: 0.7 },
  saveText: { ...typography.labelLg, color: colors.textInverse },
});

export default DigestSheet;
