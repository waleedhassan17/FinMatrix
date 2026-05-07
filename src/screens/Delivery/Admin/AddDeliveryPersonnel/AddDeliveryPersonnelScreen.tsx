import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoClipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import CustomButton from '../../../../Custom-Components/CustomButton';
import CustomInput from '../../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../../Custom-Components/CustomDropdown';
import { colors, spacing, borderRadius, shadows } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectActiveCompany, addDeliveryPersonnel, addMember } from '../../../Auth/companySlice';
import { registerAdminCreatedPersonnel } from '../../../../network/authNetwork';
import type { DummyDeliveryPerson } from '../../../../models/deliveryModel';
import type { RootStackParamList } from '../../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDeliveryPersonnel'>;

const BRAND = {
  navy: '#0F172A',
  emerald: '#059669',
  emeraldLight: '#10B981',
};

const VEHICLE_TYPES = [
  { label: 'Motorcycle', value: 'motorcycle' },
  { label: 'Van', value: 'van' },
  { label: 'Truck', value: 'truck' },
];

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

const generatePassword = (): string => {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Del@${digits}`;
};

/** Generate username as COMPANYCODE.firstname (lowercase) */
const generateUsername = (companyCode: string, name: string): string => {
  const firstName = name.trim().toLowerCase().split(/\s+/)[0] || 'user';
  return `${companyCode}.${firstName}`;
};

const AddDeliveryPersonnelScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const activeCompany = useAppSelector(selectActiveCompany);
  const inviteCode = activeCompany?.inviteCode ?? 'FM2024';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tempPassword] = useState(generatePassword());
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [maxLoad, setMaxLoad] = useState(15);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdPerson, setCreatedPerson] = useState<{
    name: string; username: string; email: string; password: string;
  } | null>(null);

  const generatedUsername = useMemo(
    () => fullName.trim() ? generateUsername(inviteCode, fullName) : '',
    [fullName, inviteCode],
  );

  const copyToClipboard = (text: string, label: string) => {
    try { ExpoClipboard.setStringAsync(text); } catch {}
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const toggleZone = (zone: string) => {
    setSelectedZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]);
  };

  const generateEmail = (name: string): string => {
    const parts = name.trim().toLowerCase().split(/\s+/);
    return parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}@company.pk` : `${parts[0]}@company.pk`;
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!phone.trim()) errs.phone = 'Phone is required';
    if (!vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreatePersonnel = useCallback(() => {
    if (!validateForm() || !activeCompany) return;
    setIsCreating(true);

    const finalEmail = email.trim() || generateEmail(fullName);
    const username = generatedUsername;
    const userId = `dp_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const person: DummyDeliveryPerson = {
      userId, displayName: fullName.trim(), email: finalEmail.toLowerCase(),
      username, password: tempPassword, phone: phone.trim(), role: 'delivery',
      companyId: activeCompany.companyId, isAvailable: true, currentLoad: 0,
      maxLoad, rating: 0, totalDeliveries: 0, onTimeRate: 0, status: 'active',
      vehicleType: vehicleType as DummyDeliveryPerson['vehicleType'],
      vehicleNumber: vehicleNumber.trim(),
      zones: selectedZones.length > 0 ? selectedZones : ['Zone A'],
    };

    dispatch(addDeliveryPersonnel({ companyId: activeCompany.companyId, person }));
    dispatch(addMember({
      companyId: activeCompany.companyId,
      member: { userId, role: 'delivery', displayName: fullName.trim(), email: finalEmail.toLowerCase(), phone: phone.trim(), joinedAt: now },
    }));

    registerAdminCreatedPersonnel({
      email: finalEmail.toLowerCase(), username, password: tempPassword,
      user: {
        uid: userId, email: finalEmail.toLowerCase(), displayName: fullName.trim(),
        role: 'delivery', companyId: activeCompany.companyId, phoneNumber: phone.trim(),
        photoURL: null, isActive: true, createdAt: now, updatedAt: now, username,
      },
    });

    setIsCreating(false);
    setCreatedPerson({ name: fullName.trim(), username, email: finalEmail.toLowerCase(), password: tempPassword });
    setShowSuccess(true);
  }, [fullName, email, phone, tempPassword, vehicleType, vehicleNumber, selectedZones, maxLoad, activeCompany, dispatch, generatedUsername]);

  const handleDismissSuccess = () => { setShowSuccess(false); navigation.goBack(); };

  const renderQuickAddTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.quickAddDesc}>Create a delivery personnel account directly. They can sign in immediately with the generated username &amp; password.</Text>

      <CustomInput label="Full Name *" value={fullName} onChangeText={t => { setFullName(t); if (errors.fullName) setErrors(p => ({ ...p, fullName: '' })); }} placeholder="Enter full name" error={errors.fullName} />

      {/* Auto-generated Username */}
      {fullName.trim().length > 0 && (
        <View style={styles.usernameRow}>
          <Text style={styles.fieldLabel}>Generated Username</Text>
          <View style={styles.usernameBox}>
            <Text style={styles.usernameText}>{generatedUsername}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(generatedUsername, 'Username')} style={styles.copyButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.usernameHint}>Delivery personnel will use this username to sign in</Text>
        </View>
      )}

      <CustomInput label="Email (auto-generated if blank)" value={email} onChangeText={setEmail} placeholder={fullName.trim() ? generateEmail(fullName) : 'firstname.lastname@company.pk'} keyboardType="email-address" autoCapitalize="none" />
      <CustomInput label="Phone *" value={phone} onChangeText={t => { setPhone(t); if (errors.phone) setErrors(p => ({ ...p, phone: '' })); }} placeholder="+92-3XX-XXXXXXX" keyboardType="phone-pad" error={errors.phone} />

      <View style={styles.passwordRow}>
        <Text style={styles.fieldLabel}>Temporary Password</Text>
        <View style={styles.passwordBox}>
          <Text style={styles.passwordText}>{tempPassword}</Text>
          <TouchableOpacity onPress={() => copyToClipboard(tempPassword, 'Password')} style={styles.copyButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.copyText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CustomDropdown label="Vehicle Type" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
      <CustomInput label="Vehicle Number *" value={vehicleNumber} onChangeText={t => { setVehicleNumber(t); if (errors.vehicleNumber) setErrors(p => ({ ...p, vehicleNumber: '' })); }} placeholder="e.g. LHR-1234" error={errors.vehicleNumber} autoCapitalize="characters" />

      <Text style={styles.fieldLabel}>Assigned Zones</Text>
      <View style={styles.zonesGrid}>
        {ZONES.map(zone => {
          const selected = selectedZones.includes(zone);
          return (
            <TouchableOpacity key={zone} style={[styles.zoneChip, selected && styles.zoneChipSelected]} onPress={() => toggleZone(zone)}>
              <Text style={[styles.zoneChipText, selected && styles.zoneChipTextSelected]}>{zone}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.fieldLabel}>Max Daily Load: {maxLoad}</Text>
        <View style={styles.sliderRow}>
          <TouchableOpacity style={styles.sliderBtn} onPress={() => setMaxLoad(Math.max(1, maxLoad - 1))}><Text style={styles.sliderBtnText}>-</Text></TouchableOpacity>
          <View style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${(maxLoad / 30) * 100}%` }]} /></View>
          <TouchableOpacity style={styles.sliderBtn} onPress={() => setMaxLoad(Math.min(30, maxLoad + 1))}><Text style={styles.sliderBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <CustomButton title="Create Account" onPress={handleCreatePersonnel} variant="primary" size="lg" fullWidth isLoading={isCreating} />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.backIconContainer}><Text style={styles.backArrow}>{'‹'}</Text></View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Personnel</Text>
          <View style={styles.headerSpacer} />
        </View>

        {renderQuickAddTab()}

        <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={handleDismissSuccess}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalCheckCircle}><Text style={styles.modalCheck}>{'\u2713'}</Text></View>
              <Text style={styles.modalTitle}>Account Created</Text>
              {createdPerson && (
                <View style={styles.credentialsCard}>
                  {[
                    { label: 'Name', value: createdPerson.name },
                    { label: 'Username', value: createdPerson.username },
                    { label: 'Password', value: createdPerson.password },
                  ].map((row, i) => (
                    <View key={i} style={styles.credentialRow}>
                      <Text style={styles.credentialLabel}>{row.label}</Text>
                      <Text style={styles.credentialValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.modalButtons}>
                <CustomButton title="Share" onPress={() => { if (createdPerson) copyToClipboard(`Name: ${createdPerson.name}\nUsername: ${createdPerson.username}\nPassword: ${createdPerson.password}`, 'Credentials'); }} variant="secondary" size="md" />
                <View style={{ width: spacing.sm }} />
                <CustomButton title="Done" onPress={handleDismissSuccess} variant="primary" size="md" />
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backIconContainer: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center',
  },
  backArrow: { fontSize: 24, color: colors.textPrimary, marginTop: -2, fontWeight: '300' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: THEME.typography.h3.fontSize, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  headerSpacer: { width: 36 },
  tabContent: { padding: spacing.lg, paddingBottom: spacing.xl + 40 },

  quickAddDesc: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20, fontFamily: THEME.typography.fontFamily },
  fieldLabel: { fontSize: THEME.typography.bodyMd.fontSize, fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },

  // Username
  usernameRow: { marginBottom: spacing.md },
  usernameBox: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    backgroundColor: BRAND.navy + '08', borderRadius: 10,
    borderWidth: 1, borderColor: BRAND.navy + '30', paddingHorizontal: spacing.md,
  },
  usernameText: { flex: 1, fontSize: THEME.typography.bodyLg.fontSize, fontWeight: '700', color: BRAND.navy, fontFamily: THEME.typography.fontFamily, letterSpacing: 0.5 },
  usernameHint: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontFamily: THEME.typography.fontFamily },

  passwordRow: { marginBottom: spacing.md },
  passwordBox: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    backgroundColor: BRAND.emerald + '08', borderRadius: 10,
    borderWidth: 1, borderColor: BRAND.emerald + '30', paddingHorizontal: spacing.md,
  },
  passwordText: { flex: 1, fontSize: THEME.typography.bodyLg.fontSize, fontWeight: '600', color: BRAND.emerald, fontFamily: THEME.typography.fontFamily, letterSpacing: 1.5 },
  copyButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  copyText: { fontSize: THEME.typography.bodyMd.fontSize, color: BRAND.emerald, fontWeight: '600', fontFamily: THEME.typography.fontFamily },
  zonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  zoneChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white,
  },
  zoneChipSelected: { borderColor: BRAND.emerald, backgroundColor: BRAND.emerald + '0A' },
  zoneChipText: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary, fontWeight: '500', fontFamily: THEME.typography.fontFamily },
  zoneChipTextSelected: { color: BRAND.emerald },
  sliderContainer: { marginBottom: spacing.md },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sliderBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND.navy + '0A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.navy + '20',
  },
  sliderBtnText: { fontSize: 20, color: BRAND.navy, fontWeight: '600' },
  sliderTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: 6, backgroundColor: BRAND.emerald, borderRadius: 3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md + 4, padding: spacing.lg,
    width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  modalCheckCircle: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: '#A7F3D0',
  },
  modalCheck: { fontSize: 28, color: colors.success, fontWeight: '700' },
  modalTitle: { fontSize: THEME.typography.h3.fontSize, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md, fontFamily: THEME.typography.fontFamily },
  credentialsCard: {
    width: '100%', backgroundColor: colors.background, borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  credentialRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  credentialLabel: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  credentialValue: { fontSize: THEME.typography.bodyMd.fontSize, color: colors.textPrimary, fontWeight: '600', fontFamily: THEME.typography.fontFamily },
  modalButtons: { flexDirection: 'row' },
});

export default AddDeliveryPersonnelScreen;