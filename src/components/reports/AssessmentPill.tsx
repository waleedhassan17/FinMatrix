// ═══════════════════════════════════════════════════════
// FinMatrix — Healthy / Watch / At risk
// ═══════════════════════════════════════════════════════
// The server's reading of a figure against its rule of thumb
// (kpi-benchmarks.ts). Always an icon and a word, never colour alone; nothing
// at all for a figure with no rule. The same words and colours as the
// website's AssessmentPill.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../theme';
import { assessmentLabel, type KpiAssessment } from '../../models/kpiModel';

const { colors, radius, typography } = THEME;

const STYLE = {
  healthy: { icon: 'check-circle', fg: colors.successHover, bg: colors.successLighter },
  watch: { icon: 'alert-triangle', fg: colors.warningHover, bg: colors.warningLighter },
  risk: { icon: 'alert-octagon', fg: colors.dangerHover, bg: colors.dangerLighter },
} as const;

const AssessmentPill: React.FC<{ assessment: KpiAssessment | null | undefined }> = ({ assessment }) => {
  const label = assessmentLabel(assessment);
  if (!assessment || !label || assessment.level === 'neutral') return null;
  const s = STYLE[assessment.level];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]} accessible accessibilityLabel={label}>
      <Feather name={s.icon} size={11} color={s.fg} />
      <Text style={[styles.text, { color: s.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  text: { ...typography.labelSm },
});

export default AssessmentPill;
