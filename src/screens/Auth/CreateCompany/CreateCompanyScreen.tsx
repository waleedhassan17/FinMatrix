import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { v4 as uuidv4 } from 'uuid';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { ROUTES } from '../../../navigations-map/Base';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser } from '../authSlice';
import {
  createCompany,
  type CompanyData,
  type CompanyMember,
} from '../companySlice';
import {
  warehouseAgencies,
  type WarehouseAgency,
} from '../../../dummy-data/warehouseAgencies';
import { dummyDeliveryPersonnel } from '../../../dummy-data/deliveryPersonnel';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateCompany'>;

const INDUSTRIES = [
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Supply Chain', value: 'Supply Chain' },
  { label: 'Distribution', value: 'Distribution' },
  { label: 'Retail', value: 'Retail' },
  { label: 'Services', value: 'Services' },
  { label: 'Other', value: 'Other' },
];

const COUNTRIES = [
  { label: 'Pakistan', value: 'Pakistan' },
  { label: 'UAE', value: 'UAE' },
  { label: 'Saudi Arabia', value: 'Saudi Arabia' },
  { label: 'Other', value: 'Other' },
];

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const STEP_LABELS = ['Company Info', 'Agencies', 'Review'];

const CreateCompanyScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [taxId, setTaxId] = useState('');

  // Step 2 fields
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customAgencies, setCustomAgencies] = useState<WarehouseAgency[]>([]);
  const [customAgency, setCustomAgency] = useState({
    name: '', type: '', description: '', address: '', contact: '',
  });

  // Step 3
  const [inviteCode] = useState(generateInviteCode());
  const [isCreating, setIsCreating] = useState(false);

  const progressAnim = useRef(new Animated.Value(1)).current;

  const animateStep = (step: number) => {
    Animated.spring(progressAnim, {
      toValue: step,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    if (!street.trim()) errs.street = 'Street address is required';
    if (!city.trim()) errs.city = 'City is required';
    if (!stateProv.trim()) errs.state = 'State/Province is required';
    if (!zipCode.trim()) errs.zipCode = 'ZIP code is required';
    if (!phone.trim()) errs.phone = 'Phone is required';
    if (!email.trim()) errs.email = 'Email is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    if (selectedAgencyIds.length === 0) {
      setErrors({ agencies: 'Select at least one agency' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      animateStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
      animateStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      animateStep(currentStep - 1);
      setErrors({});
    } else {
      navigation.goBack();
    }
  };

  const toggleAgency = (agencyId: string) => {
    setSelectedAgencyIds(prev =>
      prev.includes(agencyId)
        ? prev.filter(id => id !== agencyId)
        : [...prev, agencyId],
    );
    if (errors.agencies) setErrors({});
  };

  const toggleExpandAgency = (agencyId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedAgencyId(prev => (prev === agencyId ? null : agencyId));
  };

  const addCustomAgency = () => {
    if (!customAgency.name.trim()) {
      Alert.alert('Error', 'Agency name is required');
      return;
    }
    const newAgency: WarehouseAgency = {
      id: `custom_${uuidv4().slice(0, 8)}`,
      name: customAgency.name,
      type: (customAgency.type as any) || 'Distribution',
      typeBadgeColor: '#F39C12',
      description: customAgency.description || 'Custom agency',
      productCount: 0,
      city: '',
      province: '',
      address: customAgency.address,
      contactPhone: customAgency.contact,
      contactEmail: '',
      inventory: [],
    };
    setCustomAgencies(prev => [...prev, newAgency]);
    setSelectedAgencyIds(prev => [...prev, newAgency.id]);
    setShowCustomForm(false);
    setCustomAgency({ name: '', type: '', description: '', address: '', contact: '' });
  };

  const allAgencies = [...warehouseAgencies, ...customAgencies];
  const selectedAgencies = allAgencies.filter(a => selectedAgencyIds.includes(a.id));
  const totalItems = selectedAgencies.reduce((sum, a) => sum + a.inventory.length, 0);

  const handleCreate = useCallback(() => {
    if (!user) return;
    setIsCreating(true);

    const companyId = `company_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const adminMember: CompanyMember = {
      userId: user.uid,
      role: 'admin',
      displayName: user.displayName,
      email: user.email,
      phone: user.phoneNumber,
      joinedAt: now,
    };

    const companyData: CompanyData = {
      companyId,
      name: companyName.trim(),
      industry,
      address: street.trim(),
      city: city.trim(),
      state: stateProv.trim(),
      zipCode: zipCode.trim(),
      country,
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      taxId: taxId.trim(),
      logo: null,
      inviteCode,
      agencies: selectedAgencies,
      members: [adminMember],
      deliveryPersonnel: [...dummyDeliveryPersonnel.map(dp => ({ ...dp, companyId }))],
      createdAt: now,
    };

    dispatch(createCompany(companyData));
    dispatch(setUser({ ...user, companyId }));

    setIsCreating(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'AdminTabs' as any }],
    });
  }, [
    user, companyName, industry, street, city, stateProv, zipCode, country,
    phone, email, website, taxId, inviteCode, selectedAgencies, dispatch, navigation,
  ]);

  // ── Progress Bar ──
  const renderProgressBar = () => {
    const progressWidth = progressAnim.interpolate({
      inputRange: [1, 2, 3],
      outputRange: ['33%', '66%', '100%'],
    });
    return (
      <View style={styles.progressContainer}>
        <View style={styles.stepsRow}>
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = currentStep >= stepNum;
            return (
              <View key={i} style={styles.stepItem}>
                <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
                  <Text style={[styles.stepCircleText, isActive && styles.stepCircleTextActive]}>
                    {currentStep > stepNum ? '\u2713' : stepNum}
                  </Text>
                </View>
                <Text style={[styles.stepItemLabel, isActive && styles.stepItemLabelActive]}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    );
  };

  // ── Step 1 ──
  const renderStep1 = () => (
    <ScrollView
      contentContainerStyle={styles.stepContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.stepTitle}>Company Information</Text>
      <Text style={styles.stepSubtitle}>
        Enter your business details to get started
      </Text>

      <CustomInput
        label="Company Name *"
        value={companyName}
        onChangeText={t => { setCompanyName(t); if (errors.companyName) setErrors(p => ({ ...p, companyName: '' })); }}
        placeholder="Enter company name"
        error={errors.companyName}
      />

      <CustomDropdown
        label="Industry"
        options={INDUSTRIES}
        value={industry}
        onChange={setIndustry}
        placeholder="Select industry"
      />

      <View style={styles.sectionHeader}>
        <View style={styles.sectionDividerLine} />
        <Text style={styles.sectionHeaderText}>Address</Text>
        <View style={styles.sectionDividerLine} />
      </View>

      <CustomInput label="Street *" value={street} onChangeText={t => { setStreet(t); if (errors.street) setErrors(p => ({ ...p, street: '' })); }} placeholder="Street address" error={errors.street} />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <CustomInput label="City *" value={city} onChangeText={t => { setCity(t); if (errors.city) setErrors(p => ({ ...p, city: '' })); }} placeholder="City" error={errors.city} />
        </View>
        <View style={styles.halfInput}>
          <CustomInput label="State/Province *" value={stateProv} onChangeText={t => { setStateProv(t); if (errors.state) setErrors(p => ({ ...p, state: '' })); }} placeholder="State" error={errors.state} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <CustomInput label="ZIP Code *" value={zipCode} onChangeText={t => { setZipCode(t); if (errors.zipCode) setErrors(p => ({ ...p, zipCode: '' })); }} placeholder="ZIP" keyboardType="number-pad" error={errors.zipCode} />
        </View>
        <View style={styles.halfInput}>
          <CustomDropdown label="Country" options={COUNTRIES} value={country} onChange={setCountry} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionDividerLine} />
        <Text style={styles.sectionHeaderText}>Contact</Text>
        <View style={styles.sectionDividerLine} />
      </View>

      <CustomInput label="Phone *" value={phone} onChangeText={t => { setPhone(t); if (errors.phone) setErrors(p => ({ ...p, phone: '' })); }} placeholder="+92-300-1234567" keyboardType="phone-pad" error={errors.phone} />
      <CustomInput label="Email *" value={email} onChangeText={t => { setEmail(t); if (errors.email) setErrors(p => ({ ...p, email: '' })); }} placeholder="company@domain.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <CustomInput label="Website (optional)" value={website} onChangeText={setWebsite} placeholder="https://www.company.com" autoCapitalize="none" />
      <CustomInput label="Tax ID / NTN (optional)" value={taxId} onChangeText={setTaxId} placeholder="1234567-8" />

      <View style={styles.buttonRow}>
        <CustomButton title="Back" onPress={handleBack} variant="secondary" size="lg" />
        <View style={styles.buttonSpacer} />
        <CustomButton title="Continue" onPress={handleNext} variant="primary" size="lg" />
      </View>
    </ScrollView>
  );

  // ── Agency Card ──
  const renderAgencyCard = (agency: WarehouseAgency) => {
    const isSelected = selectedAgencyIds.includes(agency.id);
    const isExpanded = expandedAgencyId === agency.id;

    return (
      <React.Fragment key={agency.id}>
        <View style={[styles.agencyCard, isSelected && styles.agencyCardSelected]}>
          <TouchableOpacity
            style={styles.agencyCardHeader}
            onPress={() => toggleAgency(agency.id)}
            activeOpacity={0.7}>
            <View style={styles.agencyCheckbox}>
              {isSelected ? (
                <View style={styles.checkboxChecked}>
                  <Text style={styles.checkmark}>{'\u2713'}</Text>
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.agencyInfo}>
              <View style={styles.agencyNameRow}>
                <Text style={styles.agencyName}>{agency.name}</Text>
                <View style={[styles.typeBadge, { backgroundColor: agency.typeBadgeColor + '12' }]}>
                  <Text style={[styles.typeBadgeText, { color: agency.typeBadgeColor }]}>{agency.type}</Text>
                </View>
              </View>
              <Text style={styles.agencyDesc} numberOfLines={2}>{agency.description}</Text>
              <View style={styles.agencyMeta}>
                <Text style={styles.agencyMetaText}>{agency.inventory.length} products</Text>
                <View style={styles.metaSeparator} />
                <Text style={styles.agencyMetaText}>{agency.city}, {agency.province}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.expandButton} onPress={() => toggleExpandAgency(agency.id)}>
            <Text style={styles.expandText}>{isExpanded ? 'Hide Items' : 'Preview Items'}</Text>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.inventoryPreview}>
              {agency.inventory.map(item => (
                <React.Fragment key={item.id}>
                  <View style={styles.inventoryRow}>
                    <Text style={styles.inventoryItemName}>{item.name}</Text>
                    <Text style={styles.inventoryItemPrice}>PKR {item.sellingPrice.toLocaleString()}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </React.Fragment>
    );
  };

  // ── Step 2 ──
  const renderStep2 = () => (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Connect Warehouse Agencies</Text>
      <Text style={styles.stepSubtitle}>Select the agencies whose inventory you want to manage</Text>

      {errors.agencies ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errors.agencies}</Text>
        </View>
      ) : null}

      {allAgencies.map(renderAgencyCard)}

      {!showCustomForm ? (
        <TouchableOpacity
          style={styles.addCustomButton}
          onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowCustomForm(true); }}>
          <Text style={styles.addCustomText}>+ Add Custom Agency</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.customForm}>
          <Text style={styles.customFormTitle}>Add Custom Agency</Text>
          <CustomInput label="Agency Name *" value={customAgency.name} onChangeText={t => setCustomAgency(p => ({ ...p, name: t }))} placeholder="Agency name" />
          <CustomDropdown label="Type" options={[{ label: 'Manufacturing', value: 'Manufacturing' }, { label: 'Supply', value: 'Supply' }, { label: 'Distribution', value: 'Distribution' }]} value={customAgency.type} onChange={v => setCustomAgency(p => ({ ...p, type: v }))} />
          <CustomInput label="Description" value={customAgency.description} onChangeText={t => setCustomAgency(p => ({ ...p, description: t }))} placeholder="Brief description" />
          <CustomInput label="Address" value={customAgency.address} onChangeText={t => setCustomAgency(p => ({ ...p, address: t }))} placeholder="Agency address" />
          <CustomInput label="Contact Phone" value={customAgency.contact} onChangeText={t => setCustomAgency(p => ({ ...p, contact: t }))} placeholder="+92-XXX-XXXXXXX" keyboardType="phone-pad" />
          <View style={styles.buttonRow}>
            <CustomButton title="Cancel" onPress={() => setShowCustomForm(false)} variant="secondary" size="md" />
            <View style={styles.buttonSpacer} />
            <CustomButton title="Add Agency" onPress={addCustomAgency} variant="primary" size="md" />
          </View>
        </View>
      )}

      <View style={styles.buttonRow}>
        <CustomButton title="Back" onPress={handleBack} variant="secondary" size="lg" />
        <View style={styles.buttonSpacer} />
        <CustomButton title="Continue" onPress={handleNext} variant="primary" size="lg" />
      </View>
    </ScrollView>
  );

  // ── Step 3 ──
  const renderStep3 = () => (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Review & Create</Text>
      <Text style={styles.stepSubtitle}>Review your company details before creating</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Company Details</Text>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Name</Text><Text style={styles.summaryValue}>{companyName}</Text></View>
        {industry ? <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Industry</Text><Text style={styles.summaryValue}>{industry}</Text></View> : null}
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Address</Text><Text style={styles.summaryValue}>{street}, {city}, {stateProv} {zipCode}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Contact</Text><Text style={styles.summaryValue}>{phone}</Text></View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Selected Agencies ({selectedAgencies.length})</Text>
        {selectedAgencies.map(a => (
          <React.Fragment key={a.id}>
            <View style={styles.agencySummaryRow}>
              <Text style={styles.agencySummaryName}>{a.name}</Text>
              <Text style={styles.agencySummaryItems}>{a.inventory.length} items</Text>
            </View>
          </React.Fragment>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Inventory Items</Text>
          <Text style={styles.totalValue}>{totalItems}</Text>
        </View>
      </View>

      <View style={styles.inviteCodeCard}>
        <Text style={styles.inviteCodeLabel}>Company Invite Code</Text>
        <View style={styles.codeBoxesRow}>
          {inviteCode.split('').map((char, i) => (
            <React.Fragment key={i}>
              <View style={styles.codeBox}>
                <Text style={styles.codeChar}>{char}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.inviteCodeHint}>Share this code with your team to join</Text>
      </View>

      <View style={styles.buttonRow}>
        <CustomButton title="Back" onPress={handleBack} variant="secondary" size="lg" />
        <View style={styles.buttonSpacer} />
        <CustomButton title="Create Company" onPress={handleCreate} variant="primary" size="lg" isLoading={isCreating} />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.backIconContainer}>
              <Text style={styles.backArrow}>{'‹'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Company</Text>
          <View style={styles.headerSpacer} />
        </View>

        {renderProgressBar()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {},
  backIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { fontSize: 24, color: colors.textPrimary, marginTop: -2, fontWeight: '300' },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: typography.h4.fontSize, fontWeight: '600',
    color: colors.textPrimary, fontFamily: typography.fontFamily,
  },
  headerSpacer: { width: 36 },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepCircleText: {
    fontSize: 12, fontWeight: '600', color: colors.textLight, fontFamily: typography.fontFamily,
  },
  stepCircleTextActive: { color: colors.white },
  stepItemLabel: {
    fontSize: typography.caption.fontSize, color: colors.textLight, fontFamily: typography.fontFamily,
  },
  stepItemLabelActive: { color: colors.textPrimary, fontWeight: '500' },
  progressTrack: {
    height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },

  // Steps
  stepContent: { padding: spacing.lg, paddingBottom: spacing.xl + 40 },
  stepTitle: {
    fontSize: 22, fontWeight: '700', color: colors.textPrimary,
    marginBottom: spacing.xs, fontFamily: typography.fontFamily, letterSpacing: -0.2,
  },
  stepSubtitle: {
    fontSize: typography.small.fontSize, color: colors.textSecondary,
    marginBottom: spacing.lg, lineHeight: 20, fontFamily: typography.fontFamily,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.md,
  },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  sectionHeaderText: {
    fontSize: typography.small.fontSize, color: colors.textSecondary,
    marginHorizontal: spacing.md, fontWeight: '500', fontFamily: typography.fontFamily,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
  buttonRow: { flexDirection: 'row', marginTop: spacing.lg },
  buttonSpacer: { width: spacing.sm },

  // Agency Cards
  agencyCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md + 2,
    marginBottom: spacing.md, borderWidth: 1.5, borderColor: colors.border,
  },
  agencyCardSelected: { borderColor: colors.success },
  agencyCardHeader: { flexDirection: 'row', padding: spacing.md },
  agencyCheckbox: { marginRight: spacing.sm + 4, marginTop: 2 },
  checkboxUnchecked: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border,
  },
  checkboxChecked: {
    width: 22, height: 22, borderRadius: 6, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '700' },
  agencyInfo: { flex: 1 },
  agencyNameRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs,
  },
  agencyName: {
    fontSize: typography.body.fontSize, fontWeight: '600', color: colors.textPrimary, fontFamily: typography.fontFamily,
  },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: {
    fontSize: typography.caption.fontSize, fontWeight: '600', fontFamily: typography.fontFamily,
  },
  agencyDesc: {
    fontSize: typography.small.fontSize, color: colors.textSecondary, marginBottom: spacing.sm, fontFamily: typography.fontFamily,
  },
  agencyMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  agencyMetaText: {
    fontSize: typography.caption.fontSize, color: colors.textLight, fontFamily: typography.fontFamily,
  },
  metaSeparator: {
    width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textLight,
  },
  expandButton: {
    borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm, alignItems: 'center',
  },
  expandText: {
    fontSize: typography.caption.fontSize, color: colors.secondary, fontWeight: '500', fontFamily: typography.fontFamily,
  },
  inventoryPreview: {
    paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  inventoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1, borderBottomColor: colors.border + '60',
  },
  inventoryItemName: {
    fontSize: typography.small.fontSize, color: colors.textPrimary, flex: 1, fontFamily: typography.fontFamily,
  },
  inventoryItemPrice: {
    fontSize: typography.small.fontSize, color: colors.success, fontWeight: '600', fontFamily: typography.fontFamily,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: borderRadius.sm + 2, padding: spacing.sm + 4,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  errorBannerText: {
    color: '#991B1B', fontSize: typography.small.fontSize, textAlign: 'center', fontFamily: typography.fontFamily,
  },
  addCustomButton: {
    borderWidth: 1.5, borderColor: colors.secondary + '40', borderStyle: 'dashed',
    borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.md,
  },
  addCustomText: {
    color: colors.secondary, fontSize: typography.body.fontSize, fontWeight: '600', fontFamily: typography.fontFamily,
  },
  customForm: {
    backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  customFormTitle: {
    fontSize: typography.h4.fontSize, fontWeight: '600', color: colors.textPrimary,
    marginBottom: spacing.md, fontFamily: typography.fontFamily,
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.white, borderRadius: borderRadius.md + 2, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  summaryCardTitle: {
    fontSize: typography.h4.fontSize, fontWeight: '600', color: colors.textPrimary,
    marginBottom: spacing.md, fontFamily: typography.fontFamily,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryLabel: { fontSize: typography.small.fontSize, color: colors.textSecondary, fontFamily: typography.fontFamily },
  summaryValue: {
    fontSize: typography.small.fontSize, color: colors.textPrimary, fontWeight: '500',
    flex: 1, textAlign: 'right', marginLeft: spacing.sm, fontFamily: typography.fontFamily,
  },
  agencySummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs + 2,
  },
  agencySummaryName: { fontSize: typography.small.fontSize, color: colors.textPrimary, fontFamily: typography.fontFamily },
  agencySummaryItems: { fontSize: typography.small.fontSize, color: colors.textSecondary, fontFamily: typography.fontFamily },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1,
    borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.body.fontSize, fontWeight: '600', color: colors.textPrimary, fontFamily: typography.fontFamily,
  },
  totalValue: {
    fontSize: typography.body.fontSize, fontWeight: '700', color: colors.success, fontFamily: typography.fontFamily,
  },
  inviteCodeCard: {
    backgroundColor: colors.primary + '06', borderRadius: borderRadius.md + 2, padding: spacing.lg,
    marginBottom: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '15',
  },
  inviteCodeLabel: {
    fontSize: typography.small.fontSize, color: colors.textSecondary, marginBottom: spacing.md, fontFamily: typography.fontFamily,
  },
  codeBoxesRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  codeBox: {
    width: 44, height: 52, borderRadius: borderRadius.sm + 2, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primary,
  },
  codeChar: {
    fontSize: 22, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily,
  },
  inviteCodeHint: {
    fontSize: typography.caption.fontSize, color: colors.textSecondary, textAlign: 'center', fontFamily: typography.fontFamily,
  },
});

export default CreateCompanyScreen;