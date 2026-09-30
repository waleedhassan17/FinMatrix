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
  Modal
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ExpoClipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
// The handle must satisfy the server's rule; see the model for what went wrong
// when this lived here as a local helper.
import { generateRiderUsername } from '../../../../models/riderUsername';
import { riderContactEmail, riderEmailError } from '../../../../models/riderContact';
import CustomButton from '../../../../Custom-Components/CustomButton';
import CustomInput from '../../../../Custom-Components/CustomInput';
import { ReportHeader, HEADER_NAVY } from '../../../../components/reports/ReportUI';
import CustomDropdown from '../../../../Custom-Components/CustomDropdown';
import { THEME } from '../../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectActiveCompany, addDeliveryPersonnel, addMember } from '../../../Auth/companySlice';
import { registerAdminCreatedPersonnel } from '../../../../networks/auth/authNetwork';
import type { DummyDeliveryPerson } from '../../../../models/deliveryModel';
import type { RootStackParamList } from '../../../../types';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, shadows, spacing, typography } = THEME;

type Props = NativeStackScreenProps<RootStackParamList, 'AddDeliveryPersonnel'>;

const BRAND = {
  navy: colors.neutral900,
  emerald: colors.actionGreen,
  emeraldLight: colors.success
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

const AddDeliveryPersonnelScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const activeCompany = useAppSelector(selectActiveCompany);
  const inviteCode = activeCompany?.inviteCode ?? 'FM2024';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tempPassword, setTempPassword] = useState(generatePassword());
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
    () => fullName.trim() ? generateRiderUsername(inviteCode, fullName) : '',
    [fullName, inviteCode],
  );

  const copyToClipboard = (text: string, label: string) => {
    try { ExpoClipboard.setStringAsync(text); } catch {}
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const toggleZone = (zone: string) => {
    setSelectedZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    // Email is a contact detail, not a credential, so it is only checked when
    // one was actually typed. This used to require an address and, when none
    // was given, invent one from the company name -- which is how riders ended
    // up owning mailboxes at domains nobody has ever registered.
    const emailError = riderEmailError(email);
    if (emailError) errs.email = emailError;
    if (!phone.trim()) errs.phone = 'Phone is required';
    // 8 is the server's minimum (CreatePersonnelDto). Accepting 6 here only
    // moved the rejection to a 400 the admin could do nothing about.
    if (!tempPassword.trim() || tempPassword.trim().length < 8) errs.password = 'Password must be at least 8 characters';
    if (!vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreatePersonnel = useCallback(async () => {
    if (!validateForm() || !activeCompany) return;
    setIsCreating(true);

    const contactEmail = riderContactEmail(email);
    const username = generatedUsername;
    const now = new Date().toISOString();

    try {
      const result = await registerAdminCreatedPersonnel({
        email: contactEmail, username, password: tempPassword,
        vehicleType: vehicleType || 'motorcycle',
        vehicleNumber: vehicleNumber.trim(),
        zones: selectedZones.length > 0 ? selectedZones : ['Zone A'],
        maxLoad,
        user: {
          displayName: fullName.trim(),
          role: 'delivery', companyId: activeCompany.companyId, phoneNumber: phone.trim(),
          photoURL: null, isActive: true, createdAt: now, updatedAt: now, username,
        }
      });

      const backendUserId = result?.data?.userId ?? result?.data?.id ?? `dp_${uuidv4().slice(0, 8)}`;

      const person: DummyDeliveryPerson = {
        userId: backendUserId, displayName: fullName.trim(), email: contactEmail ?? '',
        username, password: tempPassword, phone: phone.trim(), role: 'delivery',
        companyId: activeCompany.companyId, isAvailable: true, currentLoad: 0,
        maxLoad, rating: 0, totalDeliveries: 0, onTimeRate: 0, status: 'active',
        vehicleType: vehicleType as DummyDeliveryPerson['vehicleType'],
        vehicleNumber: vehicleNumber.trim(),
        zones: selectedZones.length > 0 ? selectedZones : ['Zone A']
      };

      dispatch(addDeliveryPersonnel({ companyId: activeCompany.companyId, person }));
      dispatch(addMember({
        companyId: activeCompany.companyId,
        member: { userId: backendUserId, role: 'delivery', displayName: fullName.trim(), email: contactEmail ?? '', phone: phone.trim(), joinedAt: now }
      }));

      setCreatedPerson({ name: fullName.trim(), username, email: contactEmail ?? '', password: tempPassword });
      setShowSuccess(true);
    } catch (e: any) {
      Alert.alert('Failed to create personnel', e?.message ?? 'Please try again.');
    } finally {
      setIsCreating(false);
    }
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

      <CustomInput
        label="Email (optional)"
        value={email}
        onChangeText={t => { setEmail(t); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
        placeholder="Leave empty if they have none"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.email}
      />
      <Text style={styles.usernameHint}>Contact only. Riders sign in with the username above, never an email.</Text>
      <CustomInput label="Phone *" value={phone} onChangeText={t => { setPhone(t); if (errors.phone) setErrors(p => ({ ...p, phone: '' })); }} placeholder="+92-3XX-XXXXXXX" keyboardType="phone-pad" error={errors.phone} />

      <CustomInput
        label="Login Password *"
        value={tempPassword}
        onChangeText={t => { setTempPassword(t); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
        placeholder="Set a password (min 8 characters)"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.password}
      />
      <View style={styles.passwordActionsRow}>
        <TouchableOpacity onPress={() => setTempPassword(generatePassword())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.copyText}>↻ Generate</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => copyToClipboard(tempPassword, 'Password')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.copyText}>Copy</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.usernameHint}>You assign this password — share it with the delivery personnel so they can sign in.</Text>

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

      <View style={{ marginTop: spacing.xl }}>
        <CustomButton title="Create Account" onPress={handleCreatePersonnel} variant="primary" size="lg" fullWidth isLoading={isCreating} />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: HEADER_NAVY[0] }]} edges={['top']}>
      <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ReportHeader
          title="Add Personnel"
          subtitle="Delivery team member"
          onBack={() => navigation.goBack()}
        />

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
                    // Only what the rider signs in with. An email is listed
                    // when one was given, but it is not a credential.
                    { label: 'Username', value: createdPerson.username },
                    { label: 'Password', value: createdPerson.password },
                    ...(createdPerson.email ? [{ label: 'Email', value: createdPerson.email }] : []),
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
                <View style={{ width: spacing.xs }} />
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
  backArrow: { ...typography.displaySm, color: colors.textPrimary, marginTop: -2 },
  tabContent: { padding: spacing.xl, paddingBottom: spacing.xxl + 40 },

  quickAddDesc: { ...THEME.typography.bodyMd, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 20 },
  fieldLabel: { ...THEME.typography.bodyMd,  color: colors.textPrimary, marginBottom: spacing.xxs },

  // Username
  usernameRow: { marginBottom: spacing.md },
  usernameBox: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    backgroundColor: BRAND.navy + '08', borderRadius: 10,
    borderWidth: 1, borderColor: BRAND.navy + '30', paddingHorizontal: spacing.md,
  },
  usernameText: { flex: 1, ...THEME.typography.h4, color: BRAND.navy, letterSpacing: 0.5 },
  usernameHint: { ...typography.caption, color: colors.neutral400, marginTop: 4 },

  passwordRow: { marginBottom: spacing.md },
  passwordBox: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    backgroundColor: BRAND.emerald + '08', borderRadius: 10,
    borderWidth: 1, borderColor: BRAND.emerald + '30', paddingHorizontal: spacing.md,
  },
  passwordText: { flex: 1, ...THEME.typography.h4, color: BRAND.emerald, letterSpacing: 1.5 },
  copyButton: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs },
  copyText: { ...THEME.typography.labelLg, color: BRAND.emerald },
  passwordActionsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: 2, marginBottom: 2 },
  zonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  zoneChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  zoneChipSelected: { borderColor: BRAND.emerald, backgroundColor: BRAND.emerald + '0A' },
  zoneChipText: { ...THEME.typography.bodyMd, color: colors.textSecondary },
  zoneChipTextSelected: { color: BRAND.emerald },
  sliderContainer: { marginBottom: spacing.md },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sliderBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND.navy + '0A',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BRAND.navy + '20',
  },
  sliderBtnText: { ...typography.h3, color: BRAND.navy, fontWeight: typography.labelLg.fontWeight },
  sliderTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: 6, backgroundColor: BRAND.emerald, borderRadius: 3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg + 4, padding: spacing.xl,
    width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  modalCheckCircle: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: colors.actionGreenLighter,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.successLight,
  },
  modalCheck: { ...typography.h1, color: colors.success, fontWeight: typography.labelLg.fontWeight },
  modalTitle: { ...THEME.typography.h3,  color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
  credentialsCard: {
    width: '100%', backgroundColor: colors.background, borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border,
  },
  credentialRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.xxs + 2, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  credentialLabel: { ...THEME.typography.bodyMd, color: colors.textSecondary },
  credentialValue: { ...THEME.typography.labelLg, color: colors.textPrimary },
  modalButtons: { flexDirection: 'row' }
});

export default AddDeliveryPersonnelScreen;