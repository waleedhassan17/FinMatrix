// ═══════════════════════════════════════════════════════
// FinMatrix — Subscription Plan Selection Screen
// QuickBooks-inspired plan chooser for new companies
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectUser, setUser } from '../authSlice';
import { getPublicPlansAPI, selfSubscribeAPI } from '../../../networks/billing/superAdminNetwork';
import { submitCompanyAPI } from '../../../networks/auth/authNetwork';
import { getPlansForTypeAPI, type TierPlanCard } from '../../../networks/billing/billingNetwork';
import { getStoredCompanyId } from '../../../utils/storageUtils';
import {
  AuthHeader,
  AuthFooterBar,
  AUTH,
} from '../../../components/auth/AuthUI';
import {
  WAREHOUSE_ONLY_BUILD,
  DEFAULT_COMPANY_TYPE,
} from '../../../utils/featureGates';
import { THEME } from '../../../utils/theme';

// ── Design tokens ─────────────────────────────────────
const DS = {
  navy: '#091E42',
  primary: '#059669',
  primaryDark: '#047857',
  green: '#00875A',
  amber: '#FF991F',
  purple: '#6554C0',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  border: '#DFE1E6',
  text: { h: '#172B4D', sub: '#5E6C84', muted: '#8993A4', inv: '#FFFFFF' },
  radius: { sm: 8, md: 12, lg: 16, xl: 20 },
};

const PLAN_COLORS: Record<string, { gradient: [string, string]; badge: string; accent: string }> = {
  Free:         { gradient: ['#FAFBFC', '#EBECF0'],   badge: '#5E6C84', accent: '#344563' },
  Standard:     { gradient: ['#ECFDF5', '#D1FAE5'],   badge: '#059669', accent: '#047857' },
  Pro:          { gradient: ['#EAE6FF', '#C0B6F2'],   badge: '#6554C0', accent: '#5243AA' },
  Starter:      { gradient: ['#ECFDF5', '#D1FAE5'],   badge: '#059669', accent: '#047857' },
  Professional: { gradient: ['#ECFDF5', '#A7F3D0'],   badge: '#047857', accent: '#065F46' },
  Enterprise:   { gradient: ['#EAE6FF', '#C0B6F2'],   badge: '#6554C0', accent: '#5243AA' },
};

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string;
  maxUsers: number;
  maxInvoices: number | null;
  features: string[] | null;
  isActive: boolean;
  sortOrder: number;
  // Display overrides (Phase1.md: Rs pricing; paid tiers disabled).
  priceLabel?: string;
  durationLabel?: string;
  disabled?: boolean;
}

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionSelect'>;

// Gradient per tier — matches the Super-Admin Subscription Plans card style.
const PLAN_GRADIENTS: Record<string, [string, string]> = {
  Free: ['#42526E', '#253858'],
  Standard: ['#00875A', '#006644'],
  Pro: ['#6554C0', '#5243AA'],
};

// ── Plan Card (same UI/UX as Super-Admin Subscription Plans) ──
const PlanCard: React.FC<{
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  isPopular?: boolean;
}> = ({ plan, selected, onSelect, isPopular }) => {
  const gradient = PLAN_GRADIENTS[plan.name] ?? PLAN_GRADIENTS.Free;
  const price = parseFloat(plan.priceMonthly);
  const isFree = price === 0;

  return (
    <TouchableOpacity
      activeOpacity={plan.disabled ? 1 : 0.85}
      onPress={() => { if (!plan.disabled) onSelect(); }}
    >
      <View
        style={[
          S.planCard,
          selected && S.planCardSelected,
          plan.disabled && S.planCardInactive,
        ]}
      >
        {/* Gradient header */}
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.planGrad}>
          <View style={S.planDecor} />
          <View style={S.planHeaderRow}>
            <Text style={S.planName}>{plan.name}</Text>
            {plan.disabled ? (
              <View style={S.tagBadge}><Text style={S.tagBadgeText}>Coming soon</Text></View>
            ) : isPopular ? (
              <View style={S.tagBadge}><Text style={S.tagBadgeText}>Popular</Text></View>
            ) : selected ? (
              <Feather name="check-circle" size={22} color="#FFF" />
            ) : (
              <Feather name="circle" size={22} color="rgba(255,255,255,0.7)" />
            )}
          </View>
          {plan.description ? (
            <Text style={S.planDesc} numberOfLines={2}>{plan.description}</Text>
          ) : null}
          <View style={S.planPriceRow}>
            {isFree ? (
              <Text style={S.planPrice}>Free</Text>
            ) : (
              <>
                <Text style={S.planPrice}>{plan.priceLabel ?? `Rs ${Math.round(price).toLocaleString()}`}</Text>
                {!!plan.durationLabel && <Text style={S.planPriceFreq}>{plan.durationLabel}</Text>}
              </>
            )}
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={S.planBody}>
          <View style={S.planMetaRow}>
            <View style={S.planMeta}>
              <Feather name="users" size={13} color={DS.text.sub} />
              <Text style={S.planMetaText}>Up to {plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} users</Text>
            </View>
            <View style={S.planMeta}>
              <Feather name="file-text" size={13} color={DS.text.sub} />
              <Text style={S.planMetaText}>{plan.maxInvoices == null ? 'Unlimited' : plan.maxInvoices} invoices/mo</Text>
            </View>
          </View>

          {plan.features && plan.features.length > 0 && (
            <View style={S.featuresList}>
              {plan.features.slice(0, 4).map((f, i) => (
                <View key={i} style={S.featureItem}>
                  <Feather name="check" size={12} color="#10B981" />
                  <Text style={S.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer: select state / coming soon */}
          <View style={S.planFooter}>
            {plan.disabled ? (
              <View style={S.footerDisabled}>
                <Feather name="clock" size={14} color={DS.text.muted} />
                <Text style={S.footerDisabledText}>Coming soon</Text>
              </View>
            ) : selected ? (
              <View style={S.footerSelected}>
                <Feather name="check" size={14} color="#FFF" />
                <Text style={S.footerSelectedText}>Selected</Text>
              </View>
            ) : (
              <View style={S.footerSelect}>
                <Text style={S.footerSelectText}>Select plan</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Tier plan card (three-tier model: 3mo vs 6mo side by side) ──
const TIER_TITLES: Record<string, string> = {
  small_business: 'Small Business',
  large_org: 'Large Organization',
  warehouse: 'Warehouse',
};

/** "12 months" reads as a count; "1 year" reads as a plan. */
const formatDuration = (months: number): string =>
  months === 12 ? '1 year' : months % 12 === 0 ? `${months / 12} years` : `${months} months`;

const TierCard: React.FC<{
  plan: TierPlanCard;
  selected: boolean;
  onSelect: () => void;
}> = ({ plan, selected, onSelect }) => {
  // The longer period carries the savings badge. Comparing against a
  // hardcoded month count would break again the next time the offered
  // durations change, so key off the badge the server computed.
  const isLonger = !!plan.monthlySavingsLabel;
  const durationLabel = formatDuration(plan.durationMonths);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onSelect} style={{ flex: 1 }}>
      <View style={[S.tierCard, selected && S.tierCardSelected]}>
        {isLonger ? (
          <View style={S.saveBadge}>
            <Feather name="zap" size={10} color="#FFF" />
            <Text style={S.saveBadgeText}>Save {plan.monthlySavingsLabel}</Text>
          </View>
        ) : (
          <View style={S.saveBadgeSpacer} />
        )}
        <Text style={S.tierDuration}>{durationLabel}</Text>
        <View style={S.tierPriceRow}>
          <Text style={S.tierPrice}>{plan.monthlyLabel}</Text>
          <Text style={S.tierPriceUnit}>/mo</Text>
        </View>
        <Text style={S.tierTotal}>
          {plan.totalLabel} billed once{'\n'}for {durationLabel}
        </Text>
        <View style={[S.tierSelect, selected && S.tierSelectOn]}>
          <Feather name={selected ? 'check-circle' : 'circle'} size={15} color={selected ? '#FFF' : DS.text.muted} />
          <Text style={[S.tierSelectText, selected && S.tierSelectTextOn]}>
            {selected ? 'Selected' : 'Select'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
const SubscriptionSelectScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);

  // Three-tier flow (FinMatrix.md): when the company registered with a type,
  // show ONLY that type's TWO plans (3-month and 6-month) from the server's
  // PLAN_CONFIG, then hand off to the bank-transfer payment screen. The
  // legacy plan list below remains for pre-tiering drafts (no companyType).
  // WAREHOUSE-ONLY BUILD: fall back to warehouse rather than null, so a
  // pre-tiering draft shows the two warehouse plans instead of the legacy
  // Free/Standard/Pro list. Drop the last fallback to restore three tiers.
  const companyType =
    route.params?.companyType ??
    (user as any)?.companyType ??
    (WAREHOUSE_ONLY_BUILD ? DEFAULT_COMPANY_TYPE : null);
  const [tierPlans, setTierPlans] = useState<TierPlanCard[]>([]);

  // Group the offered plans by delivery-personnel allowance, cheapest rung
  // first, so each rung shows its 3-month / 6-month pair together.
  const personnelRungs = React.useMemo(() => {
    const byLimit = new Map<number, TierPlanCard[]>();
    for (const p of tierPlans) {
      const list = byLimit.get(p.deliveryPersonnelLimit) ?? [];
      list.push(p);
      byLimit.set(p.deliveryPersonnelLimit, list);
    }
    return [...byLimit.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([limit, plans]) => ({
        limit,
        plans: [...plans].sort((a, b) => a.durationMonths - b.durationMonths),
      }));
  }, [tierPlans]);
  const [selectedTierKey, setSelectedTierKey] = useState<string | null>(null);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  const loadTierPlans = async () => {
    try {
      const data = await getPlansForTypeAPI(companyType);
      const list = data?.plans ?? [];
      setTierPlans(list);
      // Pre-select the 6-month plan (best value).
      setSelectedTierKey(list.find(p => !!p.monthlySavingsLabel)?.key ?? list[0]?.key ?? null);
    } catch {
      // Empty state below
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleContinueTier = async () => {
    if (!selectedTierKey) {
      Alert.alert('Select a Plan', 'Please choose a subscription plan to continue.');
      return;
    }
    const storedId = await getStoredCompanyId();
    const companyId = storedId ?? route.params?.companyId ?? user?.companyId ?? '';
    navigation.navigate('SubscriptionPay', {
      plan: selectedTierKey,
      mode: 'signup',
      companyId,
    });
  };

  const loadPlans = async () => {
    try {
      const data = await getPublicPlansAPI();
      const list: Plan[] = Array.isArray(data) ? data : (data?.data ?? []);
      // Canonical signup tiers (Phase1.md): only Free is selectable; Standard &
      // Pro are display-only ("Coming soon"). Free is backed by the real free
      // plan so the subscription is created for real.
      const realFree = list.find(p => parseFloat(p.priceMonthly) === 0 && p.isActive);
      const freeId = realFree?.id ?? 'free';
      const cards: Plan[] = [
        {
          id: freeId,
          name: 'Free',
          description: 'Everything you need to start running your books.',
          priceMonthly: '0',
          priceYearly: '0',
          maxUsers: realFree?.maxUsers ?? 3,
          maxInvoices: realFree?.maxInvoices ?? null,
          features: realFree?.features ?? ['Full accounting', 'Invoices & bills', 'Reports'],
          isActive: true,
          sortOrder: 0,
        },
        {
          id: 'standard',
          name: 'Standard',
          description: 'For growing teams — more seats and volume.',
          priceMonthly: '1000',
          priceYearly: '6000',
          maxUsers: 10,
          maxInvoices: null,
          features: ['Everything in Free', 'Priority support', 'Higher limits'],
          isActive: true,
          sortOrder: 1,
          priceLabel: 'Rs 1,000',
          durationLabel: '/ 6 months',
          disabled: true,
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'For established businesses that need it all.',
          priceMonthly: '2000',
          priceYearly: '8000',
          maxUsers: 999,
          maxInvoices: null,
          features: ['Everything in Standard', 'Advanced analytics', 'Dedicated support'],
          isActive: true,
          sortOrder: 2,
          priceLabel: 'Rs 2,000',
          durationLabel: '/ 3 months',
          disabled: true,
        },
      ];
      setPlans(cards);
      setSelectedId(freeId); // pre-select Free (the only selectable tier)
    } catch {
      // Fallback: will show empty state
    } finally {
      setLoadingPlans(false);
    }
  };

  // The header entrance animation went with the old bespoke header. Its two
  // Animated.Values were the source of this file's "cannot access refs during
  // render" lint errors, so they are gone rather than left orphaned.
  useEffect(() => {
    if (companyType) loadTierPlans();
    else loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    if (!selectedId) {
      Alert.alert('Select a Plan', 'Please choose a subscription plan to continue.');
      return;
    }
    setSubmitting(true);
    // Real backend company id (set during CreateCompany); the x-company-id
    // header also carries it, but submit needs it in the URL.
    const storedId = await getStoredCompanyId();
    const companyId = storedId ?? route.params?.companyId ?? user?.companyId ?? '';
    try {
      // Step B: choose plan.
      await selfSubscribeAPI(selectedId);
      // Step C: submit company onboarding for platform-admin approval.
      let status = 'pending_approval';
      try {
        const res = await submitCompanyAPI(companyId);
        status = res?.status ?? 'pending_approval';
      } catch (submitErr: any) {
        Alert.alert(
          'Almost there',
          submitErr?.message ??
            'Your plan was saved but submission failed. Please try again.',
        );
      }
      if (user) {
        dispatch(setUser({ ...user, companyId, companyStatus: status }));
      }
    } catch (e: any) {
      Alert.alert('Subscription Failed', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    // A plan is required before submitting, so "skip" keeps the company as a
    // draft and returns the admin to plan selection.
    if (user) {
      const companyId = route.params?.companyId ?? user.companyId;
      dispatch(setUser({ ...user, companyId, companyStatus: 'email_verified' }));
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedId);

  return (
    <View style={S.rootShell}>
      <AuthHeader
        pill="Choose a Plan"
        title="Choose your plan"
        subtitle={'Select the plan that best fits your business.\nYou can upgrade anytime.'}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}>
        {/* Plans */}
        <View style={S.content}>
          {loadingPlans ? (
            <View style={S.loaderWrap}>
              <ActivityIndicator size="large" color={DS.primary} />
              <Text style={S.loadingText}>Loading plans…</Text>
            </View>
          ) : companyType ? (
            tierPlans.length === 0 ? (
              <View style={S.loaderWrap}>
                <Text style={S.loadingText}>Could not load plans. Check your connection and try again.</Text>
              </View>
            ) : (
              <>
                <Text style={S.tierHeading}>
                  {TIER_TITLES[companyType] ?? 'Your'} plans — choose your delivery team size
                </Text>
                {/* Plans are grouped by delivery-personnel allowance: pick the
                    rung that fits your team, then the billing period. A flat
                    row of six cards differing only by price would make the
                    actual decision invisible. */}
                {personnelRungs.map(rung => (
                  <View key={rung.limit} style={S.rungBlock}>
                    <View style={S.rungHeader}>
                      <Feather name="truck" size={14} color={DS.primary} />
                      <Text style={S.rungTitle}>
                        Up to {rung.limit} delivery personnel
                      </Text>
                    </View>
                    <View style={S.tierRow}>
                      {rung.plans.map(p => (
                        <TierCard
                          key={p.key}
                          plan={p}
                          selected={selectedTierKey === p.key}
                          onSelect={() => setSelectedTierKey(p.key)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
                <View style={S.tierNote}>
                  <Feather name="info" size={13} color={DS.primary} />
                  <Text style={S.tierNoteText}>
                    Pay once by bank transfer and upload the receipt — your company activates as
                    soon as an administrator verifies the payment.
                  </Text>
                </View>
              </>
            )
          ) : plans.length === 0 ? (
            <View style={S.loaderWrap}>
              <Text style={S.loadingText}>Could not load plans. Tap Continue to proceed.</Text>
            </View>
          ) : (
            plans.map(p => (
              <PlanCard
                key={p.id}
                plan={p}
                selected={selectedId === p.id}
                onSelect={() => setSelectedId(p.id)}
                isPopular={p.name === 'Standard'}
              />
            ))
          )}

          <Text style={S.legalText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            Plans billed monthly or annually. Cancel anytime.
          </Text>
        </View>
      </ScrollView>

      <AuthFooterBar
        primary={{
          label: companyType
            ? selectedTierKey
              ? 'Continue to payment'
              : 'Select a plan'
            : selectedPlan && parseFloat(selectedPlan.priceMonthly) === 0
            ? 'Continue with Free Plan'
            : selectedPlan
            ? `Start ${selectedPlan.name} Plan`
            : 'Continue',
          onPress: companyType ? handleContinueTier : handleContinue,
          loading: submitting,
          loadingLabel: 'Setting up',
          disabled: !!companyType && !selectedTierKey,
        }}
        secondary={{ label: 'Skip for now', onPress: handleSkip }}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────
const S = StyleSheet.create({
  // Shared auth shell: flat navy header, light canvas, sticky footer.
  rootShell: { flex: 1, backgroundColor: AUTH.canvas },
  root: { flex: 1, backgroundColor: DS.bg },
  scroll: { flexGrow: 1 },

  // Header
  header: { position: 'relative', overflow: 'hidden' },
  orbTR: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    top: -70, right: -60, backgroundColor: 'rgba(99,102,241,0.12)',
  },
  orbBL: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    bottom: -40, left: -40, backgroundColor: 'rgba(16,185,129,0.08)',
  },
  headerContent: { paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12 },
  logoRow: { marginBottom: 20 },
  brand: { fontSize: 22, fontWeight: '800', fontFamily: THEME.typography.fontFamily },
  headerTitle: {
    fontSize: 28, fontWeight: '800', color: DS.text.inv, letterSpacing: -0.5,
    fontFamily: THEME.typography.fontFamily, marginBottom: 10,
  },
  headerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 22,
    fontFamily: THEME.typography.fontFamily, marginBottom: 16,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  pillText: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // Content
  content: { padding: 16, gap: 12 },
  loaderWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, color: DS.text.sub },

  // Plan Card
  // ── Plan card (matches Super-Admin Subscription Plans) ──
  planCard: {
    backgroundColor: DS.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: DS.border,
    shadowColor: '#0052CC', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  planCardSelected: { borderColor: DS.primary, borderWidth: 2.5 },
  planCardInactive: { opacity: 0.65 },
  planGrad: { padding: 18, position: 'relative', overflow: 'hidden' },
  planDecor: {
    position: 'absolute', right: -20, top: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: 20, fontWeight: '800', color: '#FFF', fontFamily: THEME.typography.fontFamily },
  tagBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tagBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  planDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 17 },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, gap: 6 },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  planPriceFreq: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 3 },

  planBody: { padding: 14 },
  planMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 10, flexWrap: 'wrap' },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  planMetaText: { fontSize: 12, color: DS.text.sub },
  featuresList: { gap: 5, marginBottom: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 12, color: '#172B4D', fontFamily: THEME.typography.fontFamily },

  planFooter: { borderTopWidth: 1, borderTopColor: DS.border, paddingTop: 12 },
  footerSelect: {
    alignItems: 'center', paddingVertical: 9, borderRadius: 8,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  footerSelectText: { fontSize: 13, fontWeight: '700', color: DS.primary },
  footerSelected: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 8, backgroundColor: DS.primary,
  },
  footerSelectedText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  footerDisabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 8, backgroundColor: '#F1F5F9',
  },
  footerDisabledText: { fontSize: 13, fontWeight: '600', color: DS.text.muted },

  // CTA
  ctaSection: { marginTop: 8, gap: 10 },
  cta: {
    height: 54, borderRadius: DS.radius.lg,
    backgroundColor: DS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaLabel: {
    fontSize: 16, fontWeight: '700', color: '#FFF',
    fontFamily: THEME.typography.fontFamily, letterSpacing: 0.3,
  },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: {
    fontSize: 14, color: DS.text.muted,
    fontFamily: THEME.typography.fontFamily, fontWeight: '500',
  },

  // ── Tier plan cards (three-tier model) ──
  tierHeading: {
    fontSize: 15, fontWeight: '700', color: DS.text.h,
    fontFamily: THEME.typography.fontFamily, marginBottom: 2,
  },
  tierRow: { flexDirection: 'row', gap: 12 },
  rungBlock: { marginBottom: 18 },
  rungHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  rungTitle: {
    fontFamily: THEME.typography.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: DS.text.h,
    letterSpacing: 0.2,
  },
  tierCard: {
    backgroundColor: DS.surface, borderRadius: 16, borderWidth: 1.5, borderColor: DS.border,
    padding: 14, alignItems: 'center',
    shadowColor: '#0052CC', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  tierCardSelected: { borderColor: DS.primary, borderWidth: 2.5 },
  saveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: DS.amber, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  saveBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
  saveBadgeSpacer: { height: 19, marginBottom: 8 },
  tierDuration: { fontSize: 13, fontWeight: '700', color: DS.text.sub },
  tierPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
  tierPrice: { fontSize: 24, fontWeight: '800', color: DS.text.h },
  tierPriceUnit: { fontSize: 13, color: DS.text.muted, marginBottom: 3 },
  tierTotal: {
    fontSize: 11, color: DS.text.muted, textAlign: 'center', lineHeight: 16, marginTop: 6,
  },
  tierSelect: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'stretch', paddingVertical: 8, borderRadius: 8, marginTop: 12,
    backgroundColor: '#F1F5F9',
  },
  tierSelectOn: { backgroundColor: DS.primary },
  tierSelectText: { fontSize: 12, fontWeight: '700', color: DS.text.sub },
  tierSelectTextOn: { color: '#FFF' },
  tierNote: {
    flexDirection: 'row', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12,
  },
  tierNoteText: { flex: 1, fontSize: 12, color: DS.text.sub, lineHeight: 18 },

  legalText: {
    fontSize: 10, color: DS.text.muted, textAlign: 'center',
    lineHeight: 16, marginTop: 4, fontFamily: THEME.typography.fontFamily,
  },
});

export default SubscriptionSelectScreen;
