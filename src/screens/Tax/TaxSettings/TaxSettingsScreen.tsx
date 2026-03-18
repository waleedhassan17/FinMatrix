// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Settings Screen
// List of tax rates — add / edit / delete / toggle active
// ═══════════════════════════════════════════════════════

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchTaxRates,
  openAddModal,
  openEditModal,
  closeModal,
  setFormField,
  saveTaxRate,
  toggleActive,
  removeTaxRate,
  selectTaxRates,
  selectTaxSettingsLoading,
  selectTaxSettingsError,
  selectTaxModalVisible,
  selectTaxEditingId,
  selectTaxForm,
  selectTaxIsSaving,
} from './taxSettingsSlice';
import type { TaxRate, TaxType } from '../../../types';

// ── Palette ─────────────────────────────────────────────
const P = {
  brand:      '#1B5E92',
  brandLight: '#EBF3FA',
  brandBorder:'#C8DCF0',
  pageBg:     '#F6F8FB',
  cardBg:     '#FFFFFF',
  textPrimary:'#1A2636',
  textSec:    '#5A6D80',
  textTert:   '#8A9BB0',
  border:     '#E3E9F0',
  success:    '#1D7D59',
  successBg:  '#F2FBF8',
  danger:     '#C0392B',
  dangerBg:   '#FFF3F3',
  orange:     '#955B10',
  orangeBg:   '#FFF8EF',
  purple:     '#5B3AA6',
  purpleBg:   '#F7F4FF',
  teal:       '#1C7A66',
  tealBg:     '#F1FBF9',
};

const TAX_TYPES: TaxType[] = ['GST', 'WHT', 'Income Tax', 'Sales Tax', 'Custom'];

const TYPE_COLORS: Record<TaxType, { bg: string; text: string }> = {
  'GST':         { bg: P.brandLight, text: P.brand },
  'WHT':         { bg: P.orangeBg,   text: P.orange },
  'Income Tax':  { bg: P.purpleBg,   text: P.purple },
  'Sales Tax':   { bg: P.tealBg,     text: P.teal },
  'Custom':      { bg: '#F5F5F5',    text: '#555555' },
};

// ── Component ────────────────────────────────────────────

const TaxSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const rates       = useAppSelector(selectTaxRates);
  const isLoading   = useAppSelector(selectTaxSettingsLoading);
  const error       = useAppSelector(selectTaxSettingsError);
  const modalVisible= useAppSelector(selectTaxModalVisible);
  const editingId   = useAppSelector(selectTaxEditingId);
  const form        = useAppSelector(selectTaxForm);
  const isSaving    = useAppSelector(selectTaxIsSaving);

  useEffect(() => { dispatch(fetchTaxRates()); }, [dispatch]);

  const handleDelete = useCallback(
    (rate: TaxRate) => {
      Alert.alert(
        'Delete Tax Rate',
        `Are you sure you want to delete "${rate.name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => dispatch(removeTaxRate(rate.id)),
          },
        ],
      );
    },
    [dispatch],
  );

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Tax name is required.');
      return;
    }
    const rateNum = parseFloat(form.rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      Alert.alert('Validation', 'Rate must be a number between 0 and 100.');
      return;
    }
    dispatch(saveTaxRate());
  }, [dispatch, form]);

  const renderItem = useCallback(
    ({ item }: { item: TaxRate }) => {
      const typeColor = TYPE_COLORS[item.taxType] ?? TYPE_COLORS.Custom;
      return (
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconCircle, { backgroundColor: typeColor.bg }]}>
              <Text style={[styles.iconText, { color: typeColor.text }]}>%</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.rateName}>{item.name}</Text>
              <Text style={styles.rateDesc} numberOfLines={1}>{item.description}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor.bg, borderColor: typeColor.text + '40' }]}>
                  <Text style={[styles.typeBadgeText, { color: typeColor.text }]}>{item.taxType}</Text>
                </View>
                <Text style={styles.rateValue}>{item.rate}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardActions}>
            <Switch
              value={item.isActive}
              onValueChange={() => { dispatch(toggleActive(item.id)); }}
              trackColor={{ false: P.border, true: P.brand + '60' }}
              thumbColor={item.isActive ? P.brand : '#B0BAC6'}
              ios_backgroundColor={P.border}
            />
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => dispatch(openEditModal(item))}
            >
              <Feather name="edit-2" size={15} color={P.brand} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: P.dangerBg }]}
              activeOpacity={0.7}
              onPress={() => handleDelete(item)}
            >
              <Feather name="trash-2" size={15} color={P.danger} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [dispatch, handleDelete],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={P.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tax Settings</Text>
          <Text style={styles.headerSub}>{rates.length} rate{rates.length !== 1 ? 's' : ''} configured</Text>
        </View>
        <TouchableOpacity style={styles.fabInline} onPress={() => dispatch(openAddModal())} activeOpacity={0.8}>
          <Feather name="plus" size={18} color={P.cardBg} />
        </TouchableOpacity>
      </View>

      {/* ── Error Banner ── */}
      {!!error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color={P.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── List ── */}
      {isLoading && rates.length === 0 ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={P.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={rates}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Feather name="percent" size={36} color={P.textTert} />
              <Text style={styles.emptyTitle}>No Tax Rates</Text>
              <Text style={styles.emptyDesc}>Tap the + button to add your first tax rate</Text>
            </View>
          }
        />
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => dispatch(closeModal())}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => dispatch(closeModal())} />
          <View style={styles.modalSheet}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Tax Rate' : 'New Tax Rate'}
              </Text>

              {/* Name */}
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. GST 17%"
                placeholderTextColor={P.textTert}
                value={form.name}
                onChangeText={v => dispatch(setFormField({ name: v }))}
              />

              {/* Rate */}
              <Text style={styles.fieldLabel}>Rate (%) *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 17"
                placeholderTextColor={P.textTert}
                keyboardType="decimal-pad"
                value={form.rate}
                onChangeText={v => dispatch(setFormField({ rate: v }))}
              />

              {/* Type */}
              <Text style={styles.fieldLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                {TAX_TYPES.map(t => {
                  const selected = form.taxType === t;
                  const tc = TYPE_COLORS[t];
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        selected
                          ? { backgroundColor: tc.bg, borderColor: tc.text }
                          : { backgroundColor: '#F1F4F8', borderColor: P.border },
                      ]}
                      onPress={() => dispatch(setFormField({ taxType: t }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.typeChipText, { color: selected ? tc.text : P.textSec }]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMulti]}
                placeholder="Brief description of when this tax applies"
                placeholderTextColor={P.textTert}
                value={form.description}
                onChangeText={v => dispatch(setFormField({ description: v }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Active toggle */}
              <View style={styles.activeRow}>
                <View>
                  <Text style={styles.fieldLabel}>Active</Text>
                  <Text style={styles.activeHint}>Inactive rates won't appear in transaction forms</Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={v => { dispatch(setFormField({ isActive: v })); }}
                  trackColor={{ false: P.border, true: P.brand + '60' }}
                  thumbColor={form.isActive ? P.brand : '#B0BAC6'}
                  ios_backgroundColor={P.border}
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => dispatch(closeModal())} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={isSaving}
                >
                  {isSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Add Rate'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.pageBg },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.border,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F4F8',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    ...THEME.typography.h3, fontWeight: '700',
    color: P.textPrimary,
  },
  headerSub: {
    ...THEME.typography.caption, color: P.textSec, marginTop: 1,
  },
  fabInline: {
    width: 36, height: 36,
    borderRadius: 10,
    backgroundColor: P.brand,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Error */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF3F3',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FCCACA',
  },
  errorText: { flex: 1, ...THEME.typography.bodySm, color: P.danger },

  /* List */
  listContent: { padding: spacing.md, gap: 10, paddingBottom: 80 },

  /* Card */
  card: {
    backgroundColor: P.cardBg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#1A2636', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconCircle: {
    width: 40, height: 40,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { ...THEME.typography.h3, fontWeight: '700' },
  cardInfo: { flex: 1 },
  rateName: {
    ...THEME.typography.h4,
    color: P.textPrimary,
  },
  rateDesc: {
    ...THEME.typography.caption, color: P.textSec, marginTop: 2,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: { ...THEME.typography.labelSm },
  rateValue: {
    ...THEME.typography.labelLg, fontWeight: '700',
    color: P.textPrimary,
  },

  /* Actions */
  cardActions: { alignItems: 'center', gap: 8, marginLeft: 8 },
  actionBtn: {
    width: 32, height: 32,
    borderRadius: 8,
    backgroundColor: P.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Empty */
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: {
    ...THEME.typography.h3,
    color: P.textSec,
  },
  emptyDesc: {
    ...THEME.typography.bodySm, color: P.textTert,
    textAlign: 'center', maxWidth: 240,
  },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: P.cardBg,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: 12, paddingBottom: 32,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#DDE3EC',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    ...THEME.typography.h3, fontWeight: '700',
    color: P.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...THEME.typography.bodySm, fontWeight: '600',
    color: P.textPrimary,
    marginBottom: 6, marginTop: spacing.sm,
  },
  fieldInput: {
    backgroundColor: '#F6F8FB',
    borderWidth: 1, borderColor: P.border,
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    ...THEME.typography.bodyMd, color: P.textPrimary,
  },
  fieldInputMulti: { minHeight: 80 },
  typeRow: { flexDirection: 'row', marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    marginRight: 8,
  },
  typeChipText: { ...THEME.typography.labelMd },
  activeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.md,
    backgroundColor: '#F6F8FB',
    borderRadius: 10, borderWidth: 1, borderColor: P.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  activeHint: { ...THEME.typography.labelSm, fontWeight: 'normal', color: P.textTert, marginTop: 2 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 10,
    borderWidth: 1.5, borderColor: P.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: {
    ...THEME.typography.h4,
    color: P.textSec,
  },
  saveBtn: {
    flex: 2, height: 46, borderRadius: 10,
    backgroundColor: P.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: {
    ...THEME.typography.h4, fontWeight: '700',
    color: '#fff',
  },
});

export default TaxSettingsScreen;
