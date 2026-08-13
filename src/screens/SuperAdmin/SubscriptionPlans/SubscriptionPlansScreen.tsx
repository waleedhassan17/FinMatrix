// ═══════════════════════════════════════════════════════
// FinMatrix — Subscription Plans Screen (Super Admin)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  WAREHOUSE_ONLY_BUILD,
  DEFAULT_COMPANY_TYPE,
} from '../../../utils/featureGates';
import {
  loadPlans,
  createPlan,
  updatePlan,
  deletePlan,
  loadSubscriptions,
  selectPlans,
  selectSubscriptions,
  selectPlansStatus,
  type SubscriptionPlan,
} from '../superAdminSlice';

const C = {
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  primary: '#0052CC',
  border: '#DFE1E6',
  text: { primary: '#172B4D', secondary: '#5E6C84', muted: '#8993A4' },
};

const PLAN_GRADIENTS: readonly [string, string][] = [
  ['#0052CC', '#0747A6'],
  ['#0065FF', '#0052CC'],
  ['#00875A', '#006644'],
  ['#FF991F', '#FF8B00'],
  ['#6554C0', '#5243AA'],
];

const DEFAULT_FEATURES = [
  'Invoicing',
  'Bill Management',
  'Inventory Tracking',
  'Delivery Management',
  'Financial Reports',
  'Multi-user Access',
  'Priority Support',
  'Advanced Analytics',
];

// ── Plan Form Modal ───────────────────────────────────
interface PlanFormData {
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  maxUsers: string;
  maxInvoices: string;
  features: string[];
  isActive: boolean;
}

const EMPTY_FORM: PlanFormData = {
  name: '',
  description: '',
  priceMonthly: '',
  priceYearly: '',
  maxUsers: '5',
  maxInvoices: '',
  features: [],
  isActive: true,
};

const PlanFormModal: React.FC<{
  visible: boolean;
  editPlan: SubscriptionPlan | null;
  onClose: () => void;
  onSave: (data: PlanFormData) => Promise<void>;
}> = ({ visible, editPlan, onClose, onSave }) => {
  const [form, setForm] = useState<PlanFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editPlan) {
        setForm({
          name: editPlan.name,
          description: editPlan.description ?? '',
          priceMonthly: editPlan.priceMonthly,
          priceYearly: editPlan.priceYearly,
          maxUsers: String(editPlan.maxUsers),
          maxInvoices: editPlan.maxInvoices ? String(editPlan.maxInvoices) : '',
          features: editPlan.features ?? [],
          isActive: editPlan.isActive,
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setSaving(false);
    }
  }, [visible, editPlan]);

  const toggleFeature = (f: string) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(f)
        ? prev.features.filter(x => x !== f)
        : [...prev.features, f],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Plan name is required'); return; }
    if (!form.priceMonthly || isNaN(Number(form.priceMonthly))) {
      Alert.alert('Invalid', 'Monthly price must be a valid number'); return;
    }
    if (!form.priceYearly || isNaN(Number(form.priceYearly))) {
      Alert.alert('Invalid', 'Yearly price must be a valid number'); return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={S.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={S.formModal}>
          <LinearGradient colors={['#0052CC', '#0747A6']} style={S.formModalHeader}>
            <Text style={S.formModalTitle}>
              {editPlan ? 'Edit Plan' : 'Create Plan'}
            </Text>
            <TouchableOpacity onPress={onClose} style={S.formModalClose}>
              <Feather name="x" size={20} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={S.formContent} showsVerticalScrollIndicator={false}>
            <FormField
              label="Plan Name *"
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
              placeholder="e.g. Starter, Professional, Enterprise"
            />
            <FormField
              label="Description"
              value={form.description}
              onChangeText={v => setForm(p => ({ ...p, description: v }))}
              placeholder="Brief description of the plan"
              multiline
            />
            <View style={S.formRow}>
              <View style={S.formHalf}>
                <FormField
                  label="Monthly Price (Rs) *"
                  value={form.priceMonthly}
                  onChangeText={v => setForm(p => ({ ...p, priceMonthly: v }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={S.formHalf}>
                <FormField
                  label="Yearly Price (Rs) *"
                  value={form.priceYearly}
                  onChangeText={v => setForm(p => ({ ...p, priceYearly: v }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={S.formRow}>
              <View style={S.formHalf}>
                <FormField
                  label="Max Users"
                  value={form.maxUsers}
                  onChangeText={v => setForm(p => ({ ...p, maxUsers: v }))}
                  placeholder="5"
                  keyboardType="numeric"
                />
              </View>
              <View style={S.formHalf}>
                <FormField
                  label="Max Invoices/mo"
                  value={form.maxInvoices}
                  onChangeText={v => setForm(p => ({ ...p, maxInvoices: v }))}
                  placeholder="Unlimited"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={S.featuresLabel}>Included Features</Text>
            <View style={S.featuresGrid}>
              {DEFAULT_FEATURES.map(f => {
                const active = form.features.includes(f);
                return (
                  <TouchableOpacity
                    key={f}
                    style={[S.featureChip, active && S.featureChipActive]}
                    onPress={() => toggleFeature(f)}
                  >
                    <Feather
                      name={active ? 'check-circle' : 'circle'}
                      size={13}
                      color={active ? C.primary : C.text.muted}
                    />
                    <Text style={[S.featureChipText, active && S.featureChipTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={S.activeRow}>
              <Text style={S.activeLabel}>Plan is Active</Text>
              <Switch
                value={form.isActive}
                onValueChange={v => setForm(p => ({ ...p, isActive: v }))}
                trackColor={{ true: C.primary, false: C.border }}
                thumbColor="#FFF"
              />
            </View>
          </ScrollView>

          <View style={S.formFooter}>
            <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
              <Text style={S.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={S.saveBtnText}>{editPlan ? 'Save Changes' : 'Create Plan'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const FormField: React.FC<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
}> = ({ label, value, onChangeText, placeholder, multiline, keyboardType }) => (
  <View style={S.formField}>
    <Text style={S.formLabel}>{label}</Text>
    <TextInput
      style={[S.formInput, multiline && S.formInputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.text.muted}
      multiline={multiline}
      keyboardType={keyboardType ?? 'default'}
      numberOfLines={multiline ? 3 : 1}
    />
  </View>
);

// Three-tier model: the six plans come from the server's PLAN_CONFIG via
// GET /super-admin/plans — this screen displays them read-only (pricing is
// changed in server config, not from the app).
interface DisplayPlan {
  name: string;
  description: string;
  isFree: boolean;
  priceLabel: string;
  durationLabel?: string;
  totalLabel?: string;
  companyType?: string | null;
  features: string[];
  maxUsers: number;
  maxInvoices: number | null;
  /** Active delivery riders allowed. The only thing separating warehouse plans. */
  deliveryPersonnelLimit?: number;
  disabled: boolean;
  companyCount: number;
}

const TIER_LABELS: Record<string, string> = {
  small_business: 'Small Business',
  large_org: 'Large Organization',
  warehouse: 'Warehouse',
};

const CANONICAL_PLANS: Omit<DisplayPlan, 'companyCount'>[] = [
  {
    name: 'Free',
    description: 'Everything you need to start running your books.',
    isFree: true,
    priceLabel: 'Free',
    features: ['Full accounting', 'Invoices & bills', 'Reports'],
    maxUsers: 3,
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
    maxUsers: 10,
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
    maxUsers: 999,
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
        <View style={S.planMetaRow}>
          <View style={S.planMeta}>
            <Feather name="users" size={13} color={C.text.secondary} />
            <Text style={S.planMetaText}>Up to {plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} users</Text>
          </View>
          {/* Warehouse plans are identical apart from this number, so it has
              to be on the card — otherwise all six read the same. */}
          {plan.deliveryPersonnelLimit ? (
            <View style={S.planMeta}>
              <Feather name="truck" size={13} color={C.text.secondary} />
              <Text style={S.planMetaText}>
                {plan.deliveryPersonnelLimit} delivery personnel
              </Text>
            </View>
          ) : null}
        </View>

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

        <View style={S.planCountRow}>
          <Feather name="briefcase" size={13} color={C.text.muted} />
          <Text style={S.planCountText}>
            {plan.totalLabel
              ? `${plan.totalLabel} billed once for the full period`
              : plan.disabled
                ? 'Not yet available'
                : `${plan.companyCount} compan${plan.companyCount === 1 ? 'y' : 'ies'} on this plan`}
          </Text>
        </View>
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
    dispatch(loadSubscriptions());
  }, [dispatch]);

  // The six tier plans from the server's PLAN_CONFIG (single source of
  // truth); falls back to the legacy canonical cards only if the API gave
  // nothing (old server).
  const displayPlans: DisplayPlan[] = React.useMemo(() => {
    // WAREHOUSE-ONLY BUILD: the server still defines small_business and
    // large_org plans so the two existing companies on them keep renewing,
    // but they are no longer sold — so they are not shown here either.
    // Drop the second predicate to list every tier again.
    const tierPlans = (plans ?? []).filter(
      p =>
        (p as any).companyType &&
        (!WAREHOUSE_ONLY_BUILD || (p as any).companyType === DEFAULT_COMPANY_TYPE),
    );
    if (tierPlans.length === 0) {
      return CANONICAL_PLANS.map(p => ({ ...p, companyCount: 0 }));
    }
    return tierPlans.map(p => ({
      name: p.name,
      description:
        p.description ?? `${TIER_LABELS[(p as any).companyType] ?? ''} plan`,
      isFree: false,
      priceLabel: (p as any).monthlyLabel ?? `Rs ${Number(p.priceMonthly).toLocaleString()}`,
      durationLabel: `/month · ${(p as any).durationMonths} months`,
      totalLabel: (p as any).totalLabel,
      companyType: (p as any).companyType,
      features: p.features ?? [],
      maxUsers: p.maxUsers,
      deliveryPersonnelLimit: (p as any).deliveryPersonnelLimit,
      maxInvoices: p.maxInvoices,
      disabled: false,
      companyCount: 0,
    }));
  }, [plans]);

  const isLoading = plansStatus === 'loading' && displayPlans.length === 0;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={S.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text.primary} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <Text style={S.headerTitle}>Subscription Plans</Text>
          <Text style={S.headerSub}>
            {WAREHOUSE_ONLY_BUILD
              ? 'Six warehouse plans · 2 / 5 / 10 delivery personnel · PKR · defined in server config'
              : 'Six plans · two per business type · PKR · defined in server config'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={S.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={S.loadingText}>Loading plans...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={S.listContent} showsVerticalScrollIndicator={false}>
          {['small_business', 'large_org', 'warehouse'].some(t => displayPlans.some(p => p.companyType === t)) ? (
            ['small_business', 'large_org', 'warehouse'].map(tier => {
              const tierPlans = displayPlans.filter(p => p.companyType === tier);
              if (tierPlans.length === 0) return null;
              return (
                <View key={tier} style={{ gap: 12 }}>
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
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text.primary },
  headerSub: { fontSize: 11, color: C.text.secondary, marginTop: 1 },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGrad: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: C.text.secondary },

  listContent: { padding: 16, gap: 16, paddingBottom: 30 },
  tierHeading: {
    fontSize: 13, fontWeight: '800', color: C.text.secondary,
    letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 4,
  },
  planCard: {
    backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#0052CC', shadowOffset: { width: 0, height: 2 },
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
  planName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  inactiveBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  inactiveBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statusBadgeMuted: { backgroundColor: 'rgba(255,255,255,0.18)' },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  planDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  planPriceRow: {
    flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, gap: 6,
  },
  planPriceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  planPriceFreq: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 3 },
  planPriceDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  planCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12,
  },
  planCountText: { fontSize: 12, fontWeight: '600', color: C.text.secondary },

  planBody: { padding: 14 },
  planMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  planMetaText: { fontSize: 12, color: C.text.secondary },
  featuresList: { gap: 5, marginBottom: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 12, color: C.text.primary },
  moreFeatures: { fontSize: 11, color: C.text.muted, marginTop: 2 },
  planActions: {
    flexDirection: 'row', gap: 10, borderTopWidth: 1,
    borderTopColor: C.border, paddingTop: 12,
  },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#DE350B' },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text.primary },
  emptyText: { fontSize: 13, color: C.text.secondary },
  emptyCreateBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.primary, borderRadius: 10,
  },
  emptyCreateText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Form Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', overflow: 'hidden',
  },
  formModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  formModalTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  formModalClose: { padding: 4 },
  formContent: { padding: 16, maxHeight: 450 },
  formFooter: {
    flexDirection: 'row', padding: 16, gap: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.text.secondary },
  saveBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  formField: { marginBottom: 14 },
  formLabel: { fontSize: 12, fontWeight: '700', color: C.text.primary, marginBottom: 6 },
  formInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    padding: 12, fontSize: 14, color: C.text.primary, backgroundColor: '#FAFAFA',
  },
  formInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },

  featuresLabel: { fontSize: 12, fontWeight: '700', color: C.text.primary, marginBottom: 8 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, backgroundColor: '#F1F5F9',
    borderWidth: 1, borderColor: C.border,
  },
  featureChipActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  featureChipText: { fontSize: 11, color: C.text.secondary },
  featureChipTextActive: { color: C.primary, fontWeight: '600' },

  activeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
    paddingVertical: 8,
  },
  activeLabel: { fontSize: 14, fontWeight: '600', color: C.text.primary },
});

export default SubscriptionPlansScreen;
