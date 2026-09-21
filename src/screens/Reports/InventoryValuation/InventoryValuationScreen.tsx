import dayjs from 'dayjs';
import React, { useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchInventoryValuationReport,
  fetchInventoryValuationTrend,
  selectInventoryValuationState,
  TREND_MONTHS,
} from './inventoryValuationSlice';
import MonthlyBars from '../shared/MonthlyBars';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  SectionCard,
  KpiGrid,
  SummaryLine,
  Divider,
  TCell,
  tableStyles,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  Card,
  ACCENT,
  reportContentStyle,
  ReportTitleBlock,
  useStatementCompany,
  asOfLabel
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

/** Short form for a bar label, where the full figure will not fit. */
const compactRs = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

const InventoryValuationScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInventoryValuationState);
  const company = useStatementCompany();

  useEffect(() => {
    dispatch(fetchInventoryValuationReport());
    // Separate request, separate failure. The trend is context around the
    // snapshot; losing it must not blank the figures the user came for.
    dispatch(fetchInventoryValuationTrend(TREND_MONTHS));
  }, [dispatch]);

  const report = state.report;
  const rows = report?.rows ?? [];
  const categories = report?.byCategory ?? [];
  const trendPoints = (state.trend?.points ?? []).map(p => ({
    period: p.period,
    label: p.label,
    value: p.value,
  }));

  return (
    <ReportContainer>
      <ReportHeader title="Inventory Valuation" subtitle="Stock on hand" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        {state.isLoading && <LoadingBlock label="Valuing inventory…" />}
        {!!state.error && (
          <ErrorBlock message={state.error} onRetry={() => dispatch(fetchInventoryValuationReport())} />
        )}

        {report && !state.isLoading && (
          <>
            <KpiGrid
              items={[
                { label: 'Total Value', value: rs(report.totalValue ?? 0), accent: ACCENT.brand, icon: 'dollar-sign' },
                { label: 'Items', value: String(rows.length), accent: ACCENT.blue, icon: 'box' },
                { label: 'Categories', value: String(categories.length), accent: ACCENT.violet, icon: 'grid' },
              ]}
            />

            {/* The endpoint values stock as it stands now — there is no date filter. */}
            <ReportTitleBlock
              company={company}
              report="Inventory Valuation Summary"
              periodLabel={asOfLabel(dayjs().format('YYYY-MM-DD'))}
            />

            {trendPoints.length > 0 && (
              <SectionCard
                title="Stock value over time"
                subtitle="From the inventory control account — ties to the balance sheet"
                icon="trending-up"
              >
                <MonthlyBars
                  points={trendPoints}
                  caption="Latest month end"
                  format={v => rs(v)}
                  compact={compactRs}
                />
              </SectionCard>
            )}

            {categories.length > 0 && (
              <SectionCard title="Value by Category" icon="layers">
                {categories.map(cat => (
                  <SummaryLine key={cat.category} label={cat.category} value={rs(cat.totalValue)} />
                ))}
                <Divider />
                <SummaryLine label="Total Inventory Value" value={rs(report.totalValue ?? 0)} strong highlight valueColor={THEME.colors.primaryHover} />
              </SectionCard>
            )}

            {rows.length === 0 ? (
              <Card>
                <EmptyBlock icon="box" title="No inventory items" hint="Add items to see valuation." />
              </Card>
            ) : (
              <SectionCard title="Items" subtitle="Tap an item for its history" icon="package">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={tableStyles.head}>
                      <TCell width={200} head>Item</TCell>
                      <TCell width={120} head>SKU</TCell>
                      <TCell width={70} head align="right">Qty</TCell>
                      <TCell width={110} head align="right">Avg Cost</TCell>
                      <TCell width={130} head align="right">Asset Value</TCell>
                    </View>
                    {rows.map((row, i) => (
                      <TouchableOpacity
                        key={row.itemId}
                        style={[tableStyles.row, i % 2 === 1 && tableStyles.rowAlt]}
                        activeOpacity={0.6}
                        onPress={() =>
                          navigation.navigate('InventoryItemReport', {
                            itemId: row.itemId,
                            itemName: row.itemName,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${row.itemName}, ${rs(row.value)}. Open item report`}
                      >
                        <TCell width={200}>{row.itemName}</TCell>
                        <TCell width={120} color={THEME.colors.textTertiary}>{row.sku}</TCell>
                        <TCell width={70} align="right">{String(row.qty)}</TCell>
                        <TCell width={110} align="right">{rs(row.cost)}</TCell>
                        <TCell width={130} align="right" strong>{rs(row.value)}</TCell>
                      </TouchableOpacity>
                    ))}
                    {/* The server's own totalValue — the rows above are not re-summed. */}
                    <View style={tableStyles.totalRow}>
                      <TCell width={200} strong>TOTAL</TCell>
                      <TCell width={120}>{''}</TCell>
                      <TCell width={70} align="right">{''}</TCell>
                      <TCell width={110} align="right">{''}</TCell>
                      <TCell width={130} align="right" strong>{rs(report.totalValue ?? 0)}</TCell>
                    </View>
                  </View>
                </ScrollView>
              </SectionCard>
            )}
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

export default InventoryValuationScreen;
