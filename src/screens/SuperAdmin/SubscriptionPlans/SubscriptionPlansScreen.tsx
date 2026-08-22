// ═══════════════════════════════════════════════════════
// FinMatrix — Subscription Plans Screen (Super Admin)
// ═══════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { THEME, statusStyle } from '../../../theme';

// Design-system tokens (see src/theme/theme.ts).
const { colors, spacing, radius, shadows, typography } = THEME;
import {
  WAREHOUSE_ONLY_BUILD,
  DEFAULT_COMPANY_TYPE,
} from '../../../utils/featureGates';
import {
  loadPlans,
  selectPlans,
  selectPlansStatus,
} from '../superAdminSlice';

const PLAN_GRADIENTS: readonly [string, string][] = [
  [colors.primary, colors.primaryDark],
  [colors.info, colors.primaryDark],
  [colors.success, colors.successHover],
  [colors.warning, colors.warningHover],
  [colors.secondary, colors.secondary],
];

// NOTE: the plan create/edit modal that used to live here was removed.
// Plans are defined in the server config (billing/plan-config.ts); the
// API rejects create/update/delete with PLANS_CONFIG_DEFINED, so the form
// could never save. It was unreachable dead code and held the screen's
// only lint error (setState called synchronously inside an effect).
// This screen is therefore read-only: change pricing in the server config.

/**
 * The plan shape GET /super-admin/plans actually returns. The slice's
 * SubscriptionPlan type predates tiering and omits these fields, which is why
 * this screen used to cast everything through `any`.
 * Source: super-admin.service.ts → listPlans().
 */
interface ServerPlan {
  name: string;
  description?: string | null;
  priceMonthly: number | string;
  features?: string[] | null;
  maxInvoices: number | null;
  companyType?: string | null;
  durationMonths?: number;
  monthlyLabel?: string;
  totalLabel?: string;
  deliveryPersonnelLimit?: number;
}

interface DisplayPlan {
  name: string;
  description: string;
  isFree: boolean;
  priceLabel: string;
  durationLabel?: string;
  totalLabel?: string;
  companyType?: string | null;
  features: string[];
  maxInvoices: number | null;
  /** Active delivery riders allowed. The only thing separating warehouse plans. */
  deliveryPersonnelLimit?: number;
  disabled: boolean;
}

/** "12 months" reads as a count; "1 year" reads as a plan. */
const formatDuration = (months?: number): string =>
  months === 12
    ? '1 year'
    : months && months % 12 === 0
    ? `${months / 12} years`
    : `${months} months`;

const TIER_LABELS: Record<string, string> = {
  small_business: 'Small Business',
  large_org: 'Large Organization',
  warehouse: 'Warehouse',
};

const CANONICAL_PLANS: DisplayPlan[] = [
  {
    name: 'Free',
    description: 'Everything you need to start running your books.',
    isFree: true,
    priceLabel: 'Free',
    features: ['Full accounting', 'Invoices & bills', 'Reports'],
    maxInvoices: null,
    disabled: false,
  },
  {
    name: 'Standard',
    description: 'For growing teams — more seats and volume.',
    isFree: false,
    priceLabel: 'Rs 1,000',
    durationLabel: '/ 6 months',
    features: ['Everything in Free', 'Priority support', 'Higher limits'],
    maxInvoices: null,
    disabled: true,
  },
  {
    name: 'Pro',
    description: 'For established businesses that need it all.',
    isFree: false,
    priceLabel: 'Rs 2,000',
    durationLabel: '/ 3 months',
    features: ['Everything in Standard', 'Advanced analytics', 'Dedicated support'],
    maxInvoices: null,
    disabled: true,
  },
];

// ── Plan Card (display-only; same UI used in signup) ──
const PlanCard: React.FC<{ plan: DisplayPlan; gradientIdx: number }> = ({ plan, gradientIdx }) => {
  const gradient = PLAN_GRADIENTS[gradientIdx % PLAN_GRADIENTS.length];

  return (
    <View style={[S.planCard, plan.disabled && S.planCardInactive]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.planGrad}>
        <View style={S.planDecor} />
        <View style={S.planHeaderRow}>
          <Text style={S.planName}>{plan.name}</Text>
          <View style={[S.statusBadge, plan.disabled && S.statusBadgeMuted]}>
            <Text style={S.statusBadgeText}>{plan.disabled ? 'Coming soon' : 'Active'}</Text>
          </View>
        </View>
        {plan.description ? (
          <Text style={S.planDesc} numberOfLines={2}>{plan.description}</Text>
        ) : null}
        <View style={S.planPriceRow}>
          <Text style={S.planPrice}>{plan.priceLabel}</Text>
          {!!plan.durationLabel && <Text style={S.planPriceFreq}>{plan.durationLabel}</Text>}
        </View>
      </LinearGradient>

      <View style={S.planBody}>
        {/* Delivery-personnel allowance is the ONLY thing separating the
            plans, so it is the only limit shown. A seat count would imply a
            difference that does not exist. */}
        {plan.deliveryPersonnelLimit ? (
          <View style={S.planMetaRow}>
            <View style={S.planMeta}>
              <Feather name="truck" size={13} color={colors.textSecondary} />
              <Text style={S.planMetaText}>
                Up to {plan.deliveryPersonnelLimit} delivery personnel
              </Text>
            </View>
          </View>
        ) : null}

        {plan.features.length > 0 && (
          <View style={S.featuresList}>
            {plan.features.slice(0, 4).map(f => (
              <View key={f} style={S.featureItem}>
                <Feather name="check" size={12} color="#10B981" />
                <Text style={S.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* The old third branch printed "<n> companies on this plan" from a
            companyCount nothing ever computed, so it could only ever render a
            false "0 companies". Dropped rather than left lying. */}
        {plan.totalLabel || plan.disabled ? (
          <View style={S.planCountRow}>
            <Feather name="briefcase" size={13} color={colors.textTertiary} />
            <Text style={S.planCountText}>
              {plan.totalLabel
                ? `${plan.totalLabel} billed once for the full period`
                : 'Not yet available'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
const SubscriptionPlansScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const plans = useAppSelector(selectPlans);
  const plansStatus = useAppSelector(selectPlansStatus);

  useEffect(() => {
    dispatch(loadPlans());
  }, [dispatch]);

  // The six tier plans from the server's PLAN_CONFIG (single source of
  // truth); falls back to the legacy canonical cards only if the API gave
  // nothing (old server).
  const displayPlans: DisplayPlan[] = React.useMemo(() => {
    // WAREHOUSE-ONLY BUILD: the server still defines small_business and
    // large_org plans so the two existing companies on them keep renewing,
    // but they are no longer sold — so they are not shown here either.
    // Drop the second predicate to list every tier again.
    const tierPlans = (plans as ServerPlan[] | undefined ?? []).filter(
      p =>
        p.companyType &&
        (!WAREHOUSE_ONLY_BUILD || p.companyType === DEFAULT_COMPANY_TYPE),
    );
    if (tierPlans.length === 0) {
      return CANONICAL_PLANS;
    }
    return tierPlans.map(p => ({
      name: p.name,
      description:
        p.description ?? `${TIER_LABELS[p.companyType ?? ''] ?? ''} plan`,
      isFree: false,
      priceLabel: p.monthlyLabel ?? `Rs ${Number(p.priceMonthly).toLocaleString()}`,
      durationLabel: `/month · ${formatDuration(p.durationMonths)}`,
      totalLabel: p.totalLabel,
      companyType: p.companyType,
      features: p.features ?? [],
      deliveryPersonnelLimit: p.deliveryPersonnelLimit,
      maxInvoices: p.maxInvoices,
      disabled: false,
    }));
  }, [plans]);

  const isLoading = plansStatus === 'loading' && displayPlans.length === 0;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={S.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <Text style={S.headerTitle}>Subscription Plans</Text>
          <Text style={S.headerSub}>
            {WAREHOUSE_ONLY_BUILD
              ? 'Six warehouse plans · 3 / 5 / 10 delivery personnel · PKR · defined in server config'
              : 'Six plans · two per business type · PKR · defined in server config'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={S.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={S.loadingText}>Loading plans...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={S.listContent} showsVerticalScrollIndicator={false}>
          {['small_business', 'large_org', 'warehouse'].some(t => displayPlans.some(p => p.companyType === t)) ? (
            ['small_business', 'large_org', 'warehouse'].map(tier => {
              const tierPlans = displayPlans.filter(p => p.companyType === tier);
              if (tierPlans.length === 0) return null;
              return (
                <View key={tier} style={{ gap: spacing.sm }}>
                  <Text style={S.tierHeading}>{TIER_LABELS[tier]}</Text>
                  {tierPlans.map((p, index) => (
                    <PlanCard key={p.name} plan={p} gradientIdx={index} />
                  ))}
                </View>
              );
            })
          ) : (
            displayPlans.map((p, index) => (
              <PlanCard key={p.name} plan={p} gradientIdx={index} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  backBtn: { padding: spacing.xxs },
  headerCenter: { flex: 1 },
  headerTitle: { ...typography.h4, color: colors.textPrimary },
  headerSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGrad: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...typography.bodySm, color: colors.textSecondary },

  listContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 30 },
  tierHeading: {
    ...typography.labelMd, color: colors.textSecondary,
    letterSpacing: 0.6, textTransform: 'uppercase', marginTop: spacing.xxs,
  },
  planCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  planCardInactive: { opacity: 0.7 },
  planGrad: { padding: 18, position: 'relative', overflow: 'hidden' },
  planDecor: {
    position: 'absolute', right: -20, top: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { ...typography.h3, color: colors.neutral0 },
  inactiveBadge: {
    paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  inactiveBadgeText: { ...typography.overline, color: colors.neutral0 },
  statusBadge: {
    paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statusBadgeMuted: { backgroundColor: 'rgba(255,255,255,0.18)' },
  statusBadgeText: { ...typography.overline, color: colors.neutral0 },
  planDesc: { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xxs },
  planPriceRow: {
    flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, gap: 6,
  },
  planPriceLabel: { ...typography.overline, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  planPrice: { ...typography.h2, color: colors.neutral0 },
  planPriceFreq: { ...typography.bodySm, color: 'rgba(255,255,255,0.75)', marginBottom: 3 },
  planPriceDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  planCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm,
  },
  planCountText: { ...typography.labelSm, color: colors.textSecondary },

  planBody: { padding: 14 },
  planMetaRow: { flexDirection: 'row', gap: spacing.md, marginBottom: 10 },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  planMetaText: { ...typography.caption, color: colors.textSecondary },
  featuresList: { gap: 5, marginBottom: spacing.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { ...typography.caption, color: colors.textPrimary },
  moreFeatures: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  planActions: {
    flexDirection: 'row', gap: 10, borderTopWidth: 1,
    borderTopColor: colors.border, paddingTop: spacing.sm,
  },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: spacing.xs, borderRadius: radius.sm,
    backgroundColor: colors.primaryLighter, borderWidth: 1, borderColor: colors.primaryLight,
  },
  editBtnText: { ...typography.labelMd, color: colors.primary },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: spacing.xs, borderRadius: radius.sm,
    backgroundColor: colors.dangerLighter, borderWidth: 1, borderColor: colors.dangerLight,
  },
  deleteBtnText: { ...typography.labelMd, color: colors.danger },

  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.xs },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptyText: { ...typography.bodySm, color: colors.textSecondary },
  emptyCreateBtn: {
    marginTop: spacing.xs, paddingHorizontal: spacing.xl, paddingVertical: 10,
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  emptyCreateText: { color: colors.neutral0, ...typography.labelMd },

  // Form Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', overflow: 'hidden',
  },
  formModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md,
  },
  formModalTitle: { ...typography.h4, color: colors.neutral0 },
  formModalClose: { padding: spacing.xxs },
  formContent: { padding: spacing.md, maxHeight: 450 },
  formFooter: {
    flexDirection: 'row', padding: spacing.md, gap: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    backgroundColor: colors.neutral100, alignItems: 'center',
  },
  cancelBtnText: { ...typography.h5, color: colors.textSecondary },
  saveBtn: {
    flex: 2, paddingVertical: spacing.sm, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  saveBtnText: { ...typography.h5, color: colors.neutral0 },

  formField: { marginBottom: 14 },
  formLabel: { ...typography.labelSm, color: colors.textPrimary, marginBottom: 6 },
  formInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.sm, ...typography.bodySm, color: colors.textPrimary, backgroundColor: colors.neutral25,
  },
  formInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },

  featuresLabel: { ...typography.labelSm, color: colors.textPrimary, marginBottom: spacing.xs },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.xl, backgroundColor: colors.neutral100,
    borderWidth: 1, borderColor: colors.border,
  },
  featureChipActive: { backgroundColor: colors.primaryLighter, borderColor: colors.primaryLight },
  featureChipText: { ...typography.caption, color: colors.textSecondary },
  featureChipTextActive: { color: colors.primary, fontWeight: typography.labelLg.fontWeight },

  activeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
  },
  activeLabel: { ...typography.h5, color: colors.textPrimary },
});

export default SubscriptionPlansScreen;
