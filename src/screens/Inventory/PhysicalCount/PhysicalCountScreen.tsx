// ═══════════════════════════════════════════════════════
// FinMatrix — Physical Count Screen (3-step wizard)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInventoryItems,
  fetchInventoryItems,
} from '../InventoryList/inventoryListSlice';
import { physicalCountAPI } from '../../../networks/inventory/inventoryNetwork';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { addAdjustment, generateAdjustmentRef } from '../../../models/adjustmentModel';
import { CATEGORY_OPTIONS, LOCATION_OPTIONS } from '../../../models/inventoryModel';
import type { InventoryItemData } from '../../../models/inventoryModel';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';

type Nav = NativeStackNavigationProp<InventoryStackParamList>;

type Step = 1 | 2 | 3;
type SelectionMode = 'all' | 'category' | 'location';

interface CountLine {
  itemId: string;
  name: string;
  sku: string;
  systemQty: number;
  countQty: string; // kept as string for TextInput
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const PhysicalCountScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectInventoryItems);

  const [step, setStep] = useState<Step>(1);

  // ── Step 1 state ────────────────────────────────
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // ── Step 2 state ────────────────────────────────
  const [countLines, setCountLines] = useState<CountLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // ── Derived ─────────────────────────────────────
  const selectionModeOptions = [
    { label: 'All Items', value: 'all' },
    { label: 'By Category', value: 'category' },
    { label: 'By Location', value: 'location' },
  ];

  const filteredItems = useMemo(() => {
    let pool = items.filter(i => i.isActive);
    if (selectionMode === 'category' && categoryFilter) {
      pool = pool.filter(i => i.category === categoryFilter);
    }
    if (selectionMode === 'location' && locationFilter) {
      pool = pool.filter(i => i.locationId === locationFilter);
    }
    return pool;
  }, [items, selectionMode, categoryFilter, locationFilter]);

  const countedCount = countLines.filter(l => l.countQty.trim() !== '').length;
  const totalCount = countLines.length;
  const progressPct = totalCount > 0 ? Math.round((countedCount / totalCount) * 100) : 0;

  // Every line the user actually entered a number for. The whole set is
  // submitted — a physical count is a record of what was counted, including
  // the lines that matched. The backend only raises an adjustment where the
  // variance is non-zero.
  const countedLines = useMemo(
    () =>
      countLines
        .map(l => ({ ...l, counted: parseFloat(l.countQty) }))
        .filter(l => !isNaN(l.counted)),
    [countLines],
  );

  const varianceLines = useMemo(
    () =>
      countedLines
        .filter(l => l.counted !== l.systemQty)
        .map(l => ({ ...l, variance: l.counted - l.systemQty })),
    [countedLines],
  );

  // ── Step transitions ────────────────────────────
  const goToStep2 = useCallback(() => {
    if (filteredItems.length === 0) {
      Alert.alert('No Items', 'No active items match the selected filter.');
      return;
    }
    setCountLines(
      filteredItems.map(i => ({
        itemId: i.itemId,
        name: i.name,
        sku: i.sku,
        systemQty: i.quantityOnHand,
        countQty: '',
      })),
    );
    setStep(2);
  }, [filteredItems]);

  const goToStep3 = useCallback(() => {
    if (countedCount === 0) {
      Alert.alert('No Counts', 'Please enter at least one count before reviewing.');
      return;
    }
    setStep(3);
  }, [countedCount]);

  // ── Update count ────────────────────────────────
  const updateCount = useCallback((itemId: string, value: string) => {
    setCountLines(prev =>
      prev.map(l => (l.itemId === itemId ? { ...l, countQty: value } : l)),
    );
  }, []);

  // ── Adjust All ──────────────────────────────────
  const handleAdjustAll = useCallback(async () => {
    if (varianceLines.length === 0) {
      Alert.alert('No Variances', 'All counted items match system quantities.');
      return;
    }

    Alert.alert(
      'Confirm Batch Adjustment',
      `This will adjust ${varianceLines.length} item(s) to match counted quantities.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Adjust All',
          onPress: async () => {
            setIsSaving(true);
            const countDate = new Date().toISOString().split('T')[0];
            try {
              // One atomic POST instead of a per-line loop of adjustments.
              // The old loop was N round-trips with no rollback, so a failure
              // partway left the count half-applied; and it sent a delta to an
              // endpoint that wants an absolute quantity. The backend reconciles
              // every line, raises an adjustment for each non-zero variance, and
              // posts the GL entries in a single transaction.
              const result = await physicalCountAPI({
                countDate,
                lines: countedLines.map(l => ({
                  itemId: l.itemId,
                  countedQty: String(l.counted),
                })),
                notes: `Physical count ${countDate}`,
              });

              // Mirror the adjustments the server actually created, keyed by
              // item, so the local cache carries real ids instead of invented ones.
              const savedLines: any[] = result?.data?.lines ?? result?.lines ?? [];
              for (const line of varianceLines) {
                const saved = savedLines.find(s => s?.itemId === line.itemId);
                addAdjustment({
                  id: saved?.adjustmentId ?? `adj-${Date.now()}-${line.itemId}`,
                  itemId: line.itemId,
                  itemName: line.name,
                  itemSku: line.sku,
                  previousQty: line.systemQty,
                  newQty: line.counted,
                  adjustmentQty: line.variance,
                  reason: 'physical_count',
                  reference: generateAdjustmentRef(),
                  notes: 'Batch adjustment from physical count',
                  date: new Date().toISOString(),
                  performedBy: 'Admin',
                });
              }

              await dispatch(fetchInventoryItems());

              Alert.alert(
                'Adjustments Complete',
                `${varianceLines.length} item(s) adjusted successfully.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'The physical count could not be saved.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  }, [varianceLines, dispatch, navigation]);

  // ═════════════════════════════════════════════════════
  // STEP INDICATOR
  // ═════════════════════════════════════════════════════
  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {([1, 2, 3] as Step[]).map(s => (
        <View key={s} style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
          </View>
          <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
            {s === 1 ? 'Select' : s === 2 ? 'Count' : 'Review'}
          </Text>
        </View>
      ))}
    </View>
  );

  // ═════════════════════════════════════════════════════
  // RENDER — STEP 1
  // ═════════════════════════════════════════════════════
  const renderStep1 = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Select Items to Count</Text>

      <CustomDropdown
        label="Selection Mode"
        options={selectionModeOptions}
        value={selectionMode}
        onChange={v => {
          setSelectionMode(v as SelectionMode);
          setCategoryFilter('');
          setLocationFilter('');
        }}
      />

      {selectionMode === 'category' && (
        <CustomDropdown
          label="Category"
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Pick a category…"
        />
      )}

      {selectionMode === 'location' && (
        <CustomDropdown
          label="Location"
          options={LOCATION_OPTIONS}
          value={locationFilter}
          onChange={setLocationFilter}
          placeholder="Pick a location…"
        />
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} will be included
        </Text>
      </View>

      <View style={styles.btnRow}>
        <CustomButton title="Cancel" onPress={() => navigation.goBack()} variant="secondary" size="lg" fullWidth />
        <View style={{ width: spacing.sm }} />
        <CustomButton title="Next →" onPress={goToStep2} variant="primary" size="lg" fullWidth />
      </View>
    </ScrollView>
  );

  // ═════════════════════════════════════════════════════
  // RENDER — STEP 2  (Count Worksheet)
  // ═════════════════════════════════════════════════════
  const renderCountRow = ({ item: line }: { item: CountLine }) => {
    const counted = parseInt(line.countQty, 10);
    const hasVariance = !isNaN(counted) && counted !== line.systemQty;
    const variance = hasVariance ? counted - line.systemQty : null;

    return (
      <View style={styles.countRow}>
        <View style={styles.countLeft}>
          <Text style={styles.countName} numberOfLines={1}>{line.name}</Text>
          <Text style={styles.countSku}>{line.sku}</Text>
        </View>
        <Text style={styles.systemQty}>{line.systemQty}</Text>
        <TextInput
          style={styles.countInput}
          value={line.countQty}
          onChangeText={v => updateCount(line.itemId, v)}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={colors.textLight}
        />
        <Text
          style={[
            styles.varianceText,
            variance !== null && {
              color: variance > 0 ? colors.success : variance < 0 ? colors.danger : colors.textSecondary,
            },
          ]}
        >
          {variance !== null ? (variance > 0 ? `+${variance}` : `${variance}`) : '—'}
        </Text>
      </View>
    );
  };

  const renderStep2 = () => (
    <View style={{ flex: 1 }}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {countedCount}/{totalCount} counted ({progressPct}%)
        </Text>
      </View>

      {/* Column Headers */}
      <View style={styles.colHeader}>
        <Text style={[styles.colText, { flex: 1 }]}>Item</Text>
        <Text style={[styles.colText, { width: 52, textAlign: 'center' }]}>System</Text>
        <Text style={[styles.colText, { width: 64, textAlign: 'center' }]}>Count</Text>
        <Text style={[styles.colText, { width: 52, textAlign: 'center' }]}>Var</Text>
      </View>

      <FlatList
        data={countLines}
        keyExtractor={l => l.itemId}
        renderItem={renderCountRow}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />

      <View style={styles.bottomBar}>
        <CustomButton title="← Back" onPress={() => setStep(1)} variant="secondary" size="md" />
        <CustomButton title="Review →" onPress={goToStep3} variant="primary" size="md" />
      </View>
    </View>
  );

  // ═════════════════════════════════════════════════════
  // RENDER — STEP 3  (Review Variances)
  // ═════════════════════════════════════════════════════
  const renderStep3 = () => (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Variance Review</Text>
        <Text style={styles.reviewSub}>
          {varianceLines.length} item{varianceLines.length !== 1 ? 's' : ''} with variances
        </Text>

        {varianceLines.length === 0 ? (
          <View style={styles.emptyVariance}>
            <Text style={styles.emptyVarianceIcon}>✅</Text>
            <Text style={styles.emptyVarianceText}>All counts match system quantities</Text>
          </View>
        ) : (
          varianceLines.map(line => (
            <View key={line.itemId} style={styles.varianceCard}>
              <View style={styles.varCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.varName}>{line.name}</Text>
                  <Text style={styles.varSku}>{line.sku}</Text>
                </View>
                <Text
                  style={[
                    styles.varBadge,
                    {
                      color: line.variance > 0 ? colors.success : colors.danger,
                      backgroundColor:
                        (line.variance > 0 ? colors.success : colors.danger) + '15',
                    },
                  ]}
                >
                  {line.variance > 0 ? '+' : ''}{line.variance}
                </Text>
              </View>
              <View style={styles.varCardBottom}>
                <Text style={styles.varDetail}>System: {line.systemQty}</Text>
                <Text style={styles.varDetail}>Counted: {line.counted}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <CustomButton title="← Back" onPress={() => setStep(2)} variant="secondary" size="md" />
        <CustomButton
          title={`Adjust All (${varianceLines.length})`}
          onPress={handleAdjustAll}
          variant="primary"
          size="md"
          isLoading={isSaving}
          disabled={isSaving || varianceLines.length === 0}
        />
      </View>
    </View>
  );

  // ═════════════════════════════════════════════════════
  // MAIN RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><Feather name="arrow-left" size={17} color={colors.secondary} style={{ marginRight: 2 }} /><Text style={styles.backBtn}>Back</Text></View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Physical Count</Text>
        <View style={{ width: 60 }} />
      </View>

      <StepIndicator />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { fontSize: 15, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Step indicator ────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xl,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleActive: { backgroundColor: colors.primary },
  stepNum: { fontSize: 14, fontWeight: '700', color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  stepNumActive: { color: colors.white },
  stepLabel: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  stepLabelActive: { color: colors.primary, fontWeight: '600' },

  // ── Common ────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  summaryCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.md,
  },
  summaryText: { fontSize: 14, fontWeight: '600', color: colors.primary, fontFamily: THEME.typography.fontFamily, textAlign: 'center' },

  btnRow: { flexDirection: 'row', marginTop: spacing.lg },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // ── Step 2: Count worksheet ───────────────────────
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  progressText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colText: { fontSize: 11, fontWeight: '700', color: colors.textLight, fontFamily: THEME.typography.fontFamily, textTransform: 'uppercase' },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  countLeft: { flex: 1, marginRight: spacing.xs },
  countName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  countSku: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  systemQty: {
    width: 52,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
  },
  countInput: {
    width: 64,
    height: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm - 2,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    backgroundColor: colors.white,
  },
  varianceText: {
    width: 52,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Step 3: Review ────────────────────────────────
  reviewSub: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.md },
  emptyVariance: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyVarianceIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyVarianceText: { fontSize: 15, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  varianceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  varCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  varName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  varSku: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  varBadge: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
    fontFamily: THEME.typography.fontFamily,
  },
  varCardBottom: { flexDirection: 'row', gap: spacing.lg },
  varDetail: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default PhysicalCountScreen;
