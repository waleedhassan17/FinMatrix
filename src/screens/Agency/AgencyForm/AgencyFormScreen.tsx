// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Form Screen (Create / Edit)
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectAgencies, createAgency, editAgency, fetchAgencies } from '../AgencyList/agencyListSlice';
import {
  selectAgencyFormState,
  setField,
  setErrors,
  setIsSaving,
  loadAgencyForEdit,
  resetAgencyForm,
} from './agencyFormSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  AGENCY_TYPE_OPTIONS,
  AGENCY_TYPE_COLORS,
  PROVINCE_OPTIONS,
  validateAgency,
  type AgencyType,
} from '../../../models/agencyModel';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type FormRoute = RouteProp<MoreStackParamList, 'AgencyForm'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const AgencyFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.agencyId;
  const isEditing = !!editingId;
  const agencies = useAppSelector(selectAgencies);
  const form = useAppSelector(selectAgencyFormState);

  // ── Load for edit ───────────────────────────────
  useEffect(() => {
    if (isEditing) {
      const agency = agencies.find(a => a.id === editingId);
      if (agency) {
        dispatch(loadAgencyForEdit({
          name: agency.name,
          type: agency.type,
          description: agency.description,
          address: (typeof agency.address === 'string' ? agency.address : agency.address?.street ?? '') as string,
          city: agency.city,
          province: agency.province,
          contactPhone: agency.contactPhone,
          contactEmail: agency.contactEmail,
        }));
      }
    }
    return () => { dispatch(resetAgencyForm()); };
  }, [isEditing, editingId, agencies, dispatch]);

  // ── Helpers ─────────────────────────────────────
  const updateField = useCallback(
    (key: string, value: any) => dispatch(setField({ key: key as any, value })),
    [dispatch],
  );

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const validationErrors = validateAgency({
      name: form.name,
      type: form.type,
      description: form.description,
      address: form.address,
      city: form.city,
      province: form.province,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
    });

    if (Object.keys(validationErrors).length > 0) {
      dispatch(setErrors(validationErrors));
      Alert.alert('Validation', Object.values(validationErrors)[0]);
      return;
    }

    dispatch(setIsSaving(true));
    try {
      const payload = {
        name: form.name,
        type: (form.type as string).toLowerCase(),
        typeBadgeColor: AGENCY_TYPE_COLORS[form.type as AgencyType],
        description: form.description,
        address: {
          street: form.address,
          city: form.city,
          state: form.province,
        },
        city: form.city,
        province: form.province,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
      };

      if (isEditing) {
        await dispatch(editAgency({ id: editingId!, data: payload as any })).unwrap();
      } else {
        await dispatch(createAgency(payload as any)).unwrap();
      }

      await dispatch(fetchAgencies());

      Alert.alert(
        isEditing ? 'Agency Updated' : 'Agency Created',
        `${form.name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to save agency.';
      Alert.alert('Error', msg);
    } finally {
      dispatch(setIsSaving(false));
    }
  }, [form, isEditing, editingId, dispatch, navigation]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Agency' : 'Add Agency'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Basic Info ─────────────────────────── */}
          <Text style={styles.sectionTitle}>Agency Information</Text>

          <CustomInput
            label="Name *"
            value={form.name}
            onChangeText={v => updateField('name', v)}
            placeholder="Agency name"
            error={form.errors.name}
          />

          <CustomDropdown
            label="Type *"
            options={AGENCY_TYPE_OPTIONS}
            value={form.type}
            onChange={v => updateField('type', v)}
            placeholder="Select type…"
          />

          <CustomInput
            label="Description"
            value={form.description}
            onChangeText={v => updateField('description', v)}
            placeholder="Brief description"
            multiline
          />

          {/* ── Address ────────────────────────────── */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Address & Contact</Text>

          <CustomInput
            label="Address *"
            value={form.address}
            onChangeText={v => updateField('address', v)}
            placeholder="Street address"
            error={form.errors.address}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomInput
                label="City *"
                value={form.city}
                onChangeText={v => updateField('city', v)}
                placeholder="City"
                error={form.errors.city}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomDropdown
                label="Province"
                options={PROVINCE_OPTIONS}
                value={form.province}
                onChange={v => updateField('province', v)}
                placeholder="Select…"
              />
            </View>
          </View>

          <CustomInput
            label="Phone *"
            value={form.contactPhone}
            onChangeText={v => updateField('contactPhone', v)}
            placeholder="+92-XXX-XXXXXXX"
            keyboardType="phone-pad"
            error={form.errors.contactPhone}
          />

          <CustomInput
            label="Email"
            value={form.contactEmail}
            onChangeText={v => updateField('contactEmail', v)}
            placeholder="email@agency.pk"
            keyboardType="email-address"
            error={form.errors.contactEmail}
          />

          {/* ── Actions ────────────────────────────── */}
          <View style={styles.btnRow}>
            <View style={styles.btnCol}>
              <CustomButton
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="secondary"
                size="lg"
                fullWidth
              />
            </View>
            <View style={{ width: spacing.sm }} />
            <View style={styles.btnCol}>
              <CustomButton
                title={isEditing ? 'Update Agency' : 'Create Agency'}
                onPress={handleSave}
                variant="primary"
                size="lg"
                fullWidth
                isLoading={form.isSaving}
                disabled={form.isSaving}
              />
            </View>
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
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

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.sm },
  row: { flexDirection: 'row' },

  btnRow: { flexDirection: 'row', marginTop: spacing.lg },
  btnCol: { flex: 1 },
});

export default AgencyFormScreen;
