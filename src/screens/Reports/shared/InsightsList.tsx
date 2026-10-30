// ═══════════════════════════════════════════════════════
// FinMatrix — What stands out
// ═══════════════════════════════════════════════════════
// The server's own sentences (business-insights.ts), most pressing first, each
// with a way into the report that explains it — the website's list, word for
// word. The tone is an icon with a spoken name, never colour alone.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import {
  INSIGHT_REPORT_LABEL,
  INSIGHT_TONE_LABEL,
  type BusinessInsight,
  type InsightTone,
} from '../../../models/insightModel';

const { colors, spacing, typography } = THEME;

const TONE: Record<InsightTone, { icon: keyof typeof Feather.glyphMap; fg: string; bg: string }> = {
  negative: { icon: 'alert-octagon', fg: colors.danger, bg: colors.dangerLighter },
  warning: { icon: 'alert-triangle', fg: colors.warningHover, bg: colors.warningLighter },
  positive: { icon: 'trending-up', fg: colors.successHover, bg: colors.successLighter },
  neutral: { icon: 'info', fg: colors.textSecondary, bg: colors.neutral100 },
};

const InsightsList: React.FC<{
  insights: BusinessInsight[];
  /** Open the report behind an insight; absent for a report the app does not have. */
  onOpen?: (insight: BusinessInsight) => void;
  canOpen?: (insight: BusinessInsight) => boolean;
}> = ({ insights, onOpen, canOpen = () => true }) => {
  if (insights.length === 0) return <Text style={styles.none}>Nothing unusual in this period.</Text>;
  return (
    <View>
      {insights.map((i, n) => {
        const t = TONE[i.tone];
        const linked = !!onOpen && canOpen(i);
        const body = (
          <>
            <View style={[styles.badge, { backgroundColor: t.bg }]} accessible accessibilityLabel={INSIGHT_TONE_LABEL[i.tone]}>
              <Feather name={t.icon} size={15} color={t.fg} />
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{i.title}</Text>
              <Text style={styles.detail}>{i.detail}</Text>
              {linked ? <Text style={styles.link}>{INSIGHT_REPORT_LABEL[i.report.key] ?? 'Open'} ›</Text> : null}
            </View>
          </>
        );
        return linked ? (
          <TouchableOpacity
            key={i.key}
            style={[styles.row, n > 0 && styles.divider]}
            onPress={() => onOpen?.(i)}
            accessibilityRole="button"
            accessibilityLabel={`${INSIGHT_TONE_LABEL[i.tone]}. ${i.title}. ${i.detail} Opens ${INSIGHT_REPORT_LABEL[i.report.key] ?? 'the report'}`}
          >
            {body}
          </TouchableOpacity>
        ) : (
          <View key={i.key} style={[styles.row, n > 0 && styles.divider]}>
            {body}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { ...typography.labelLg, color: colors.textPrimary },
  detail: { ...typography.bodySm, color: colors.textSecondary },
  link: { ...typography.labelSm, color: colors.primary, marginTop: 2 },
  none: { ...typography.bodySm, color: colors.textTertiary },
});

export default InsightsList;
