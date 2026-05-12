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
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  loadPlans,
  createPlan,
  updatePlan,
  deletePlan,
  selectPlans,
  selectPlansStatus,
  type SubscriptionPlan,
} from '../superAdminSlice';

const C = {
  bg: '#F0F4FF',
  surface: '#FFFFFF',
  primary: '#6366F1',
  border: '#E2E8F0',
  text: { primary: '#1A1A2E', secondary: '#64748B', muted: '#94A3B8' },
};

const PLAN_GRADIENTS: readonly [string, string][] = [
  ['#6366F1', '#8B5CF6'],
  ['#3B82F6', '#0EA5E9'],
  ['#10B981', '#059669'],
  ['#F59E0B', '#F97316'],
  ['#EF4444', '#F43F5E'],
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
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={S.formModalHeader}>
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
                  label="Monthly Price (PKR) *"
                  value={form.priceMonthly}
                  onChangeText={v => setForm(p => ({ ...p, priceMonthly: v }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={S.formHalf}>
                <FormField
                  label="Yearly Price (PKR) *"
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

// ── Plan Card ─────────────────────────────────────────
const PlanCard: React.FC<{
  plan: SubscriptionPlan;
  gradientIdx: number;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ plan, gradientIdx, onEdit, onDelete }) => {
  const gradient = PLAN_GRADIENTS[gradientIdx % PLAN_GRADIENTS.length];
  const monthlyPrice = parseFloat(plan.priceMonthly);
  const yearlyPrice = parseFloat(plan.priceYearly);

  return (
    <View style={[S.planCard, !plan.isActive && S.planCardInactive]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.planGrad}>
        <View style={S.planDecor} />
        <View style={S.planHeaderRow}>
          <Text style={S.planName}>{plan.name}</Text>
          {!plan.isActive && (
            <View style={S.inactiveBadge}>
              <Text style={S.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>
        {plan.description ? (
          <Text style={S.planDesc} numberOfLines={2}>{plan.description}</Text>
        ) : null}
        <View style={S.planPriceRow}>
          <View>
            <Text style={S.planPriceLabel}>Monthly</Text>
            <Text style={S.planPrice}>
              PKR {isNaN(monthlyPrice) ? plan.priceMonthly : monthlyPrice.toLocaleString()}
            </Text>
          </View>
          <View style={S.planPriceDivider} />
          <View>
            <Text style={S.planPriceLabel}>Yearly</Text>
            <Text style={S.planPrice}>
              PKR {isNaN(yearlyPrice) ? plan.priceYearly : yearlyPrice.toLocaleString()}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={S.planBody}>
        <View style={S.planMetaRow}>
          <View style={S.planMeta}>
            <Feather name="users" size={13} color={C.text.secondary} />
            <Text style={S.planMetaText}>Up to {plan.maxUsers} users</Text>
          </View>
          {plan.maxInvoices && (
            <View style={S.planMeta}>
              <Feather name="file-text" size={13} color={C.text.secondary} />
              <Text style={S.planMetaText}>{plan.maxInvoices} invoices/mo</Text>
            </View>
          )}
        </View>

        {plan.features && plan.features.length > 0 && (
          <View style={S.featuresList}>
            {plan.features.slice(0, 4).map(f => (
              <View key={f} style={S.featureItem}>
                <Feather name="check" size={12} color="#10B981" />
                <Text style={S.featureText}>{f}</Text>
              </View>
            ))}
            {plan.features.length > 4 && (
              <Text style={S.moreFeatures}>+{plan.features.length - 4} more</Text>
            )}
          </View>
        )}

        <View style={S.planActions}>
          <TouchableOpacity style={S.editBtn} onPress={onEdit} activeOpacity={0.7}>
            <Feather name="edit-2" size={14} color={C.primary} />
            <Text style={S.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
            <Feather name="trash-2" size={14} color="#EF4444" />
            <Text style={S.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    dispatch(loadPlans());
  }, [dispatch]);

  const openCreate = useCallback(() => {
    setEditingPlan(null);
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(
    async (data: PlanFormData) => {
      const payload = {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        priceMonthly: parseFloat(data.priceMonthly) || 0,
        priceYearly: parseFloat(data.priceYearly) || 0,
        maxUsers: parseInt(data.maxUsers) || 5,
        maxInvoices: data.maxInvoices ? parseInt(data.maxInvoices) : undefined,
        features: data.features.length > 0 ? data.features : undefined,
        isActive: data.isActive,
      };

      if (editingPlan) {
        await dispatch(updatePlan({ id: editingPlan.id, data: payload }));
        Alert.alert('Updated', 'Plan updated successfully');
      } else {
        await dispatch(createPlan(payload));
        Alert.alert('Created', 'Plan created successfully');
      }
      setModalVisible(false);
    },
    [dispatch, editingPlan],
  );

  const handleDelete = useCallback(
    (plan: SubscriptionPlan) => {
      Alert.alert(
        'Delete Plan',
        `Are you sure you want to delete "${plan.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(deletePlan(plan.id));
              } catch {
                Alert.alert('Error', 'Cannot delete plan with active subscriptions');
              }
            },
          },
        ],
      );
    },
    [dispatch],
  );

  const isLoading = plansStatus === 'loading' && plans.length === 0;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={S.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text.primary} />
        </TouchableOpacity>
        <View style={S.headerCenter}>
          <Text style={S.headerTitle}>Subscription Plans</Text>
          <Text style={S.headerSub}>{plans.length} plan{plans.length !== 1 ? 's' : ''} configured</Text>
        </View>
        <TouchableOpacity style={S.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={S.addBtnGrad}>
            <Feather name="plus" size={18} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={S.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={S.loadingText}>Loading plans...</Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <PlanCard
              plan={item}
              gradientIdx={index}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={S.listContent}
          ListEmptyComponent={
            <View style={S.empty}>
              <Feather name="credit-card" size={40} color={C.text.muted} />
              <Text style={S.emptyTitle}>No Plans Yet</Text>
              <Text style={S.emptyText}>Create your first subscription plan</Text>
              <TouchableOpacity style={S.emptyCreateBtn} onPress={openCreate}>
                <Text style={S.emptyCreateText}>Create Plan</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <PlanFormModal
        visible={modalVisible}
        editPlan={editingPlan}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
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
  planCard: {
    backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 },
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
  planDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  planPriceRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 20,
  },
  planPriceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  planPrice: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  planPriceDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)' },

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
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

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
