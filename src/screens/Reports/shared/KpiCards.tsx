// ═══════════════════════════════════════════════════════
// FinMatrix — A grid of server KPIs, each explainable
// ═══════════════════════════════════════════════════════
// The financial-health strip under the balance sheet, the runway card on the
// cash flow, the cockpit's grid: KPI cards two across, each with an ⓘ that
// opens its formula. It fails on its own — a missing KPI endpoint leaves the
// statement above it standing.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { THEME } from '../../../theme';
import {
  KpiCard,
  KpiCardGrid,
  ReportSkeleton,
  type KpiCardData,
} from '../../../components/reports/ReportUI';
import type { Kpi } from '../../../models/kpiModel';
import type { Remote } from '../../../models/remoteModel';
import KpiInfoSheet from './KpiInfoSheet';

const { colors, spacing, typography } = THEME;

interface Props<K extends Kpi> {
  state: Pick<Remote<unknown>, 'status' | 'error' | 'notFound'>;
  kpis: K[];
  onRetry: () => void;
  /** Where tapping a card goes, by KPI key; none for a card that stays. */
  onOpen?: (key: string) => void;
  /** Cards to draw as hero figures. */
  hero?: string[];
  /** Rows of skeleton while the first load runs. */
  skeletonCount?: number;
}

function KpiCards<K extends Kpi & Partial<KpiCardData>>({
  state,
  kpis,
  onRetry,
  onOpen,
  hero = [],
  skeletonCount = 4,
}: Props<K>) {
  const [info, setInfo] = useState<Kpi | null>(null);

  // A server without the endpoint is not an error worth a banner: the strip
  // simply is not there.
  if (state.notFound) return null;
  if (kpis.length === 0 && (state.status === 'loading' || state.status === 'idle')) {
    return <ReportSkeleton variant="kpis" rows={skeletonCount} />;
  }
  if (kpis.length === 0 && state.status === 'failed') {
    return (
      <View style={styles.failed}>
        <Text style={styles.failedText}>{state.error || 'The figures could not be loaded.'}</Text>
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
          <Text style={styles.link}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <KpiCardGrid>
        {kpis.map(k => (
          <KpiCard
            key={k.key}
            kpi={k}
            hero={hero.includes(k.key)}
            onInfo={() => setInfo(k)}
            onPress={onOpen ? () => onOpen(k.key) : undefined}
          />
        ))}
      </KpiCardGrid>
      <KpiInfoSheet kpi={info} onClose={() => setInfo(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  failed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  failedText: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  link: { ...typography.labelMd, color: colors.primary },
});

export default KpiCards;
