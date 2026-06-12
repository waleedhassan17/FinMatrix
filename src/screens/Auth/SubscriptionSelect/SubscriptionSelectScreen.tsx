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
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectUser, setUser } from '../authSlice';
import { getPublicPlansAPI, selfSubscribeAPI } from '../../../network/superAdminNetwork';
import { submitCompanyAPI } from '../../../network/authNetwork';
import { getStoredCompanyId } from '../../../network/apiHelpers';
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
}

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionSelect'>;

// ── Animated Plan Card ────────────────────────────────
const PlanCard: React.FC<{
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  delay: number;
  isPopular?: boolean;
}> = ({ plan, selected, onSelect, delay, isPopular }) => {
  const slideY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onSelect();
  };

  const cfg = PLAN_COLORS[plan.name] ?? PLAN_COLORS.Starter;
  const price = parseFloat(plan.priceMonthly);
  const isFree = price === 0;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideY }, { scale }] }}>
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <View
          style={[
            S.planCard,
            selected && { borderColor: cfg.accent, borderWidth: 2.5 },
          ]}
        >
          {isPopular && (
            <View style={[S.popularBadge, { backgroundColor: cfg.accent }]}>
              <Text style={S.popularText}>MOST POPULAR</Text>
            </View>
          )}

          <LinearGradient
            colors={cfg.gradient}
            style={S.planGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Top row */}
            <View style={S.planTopRow}>
              <View>
                <Text style={[S.planName, { color: cfg.accent }]}>{plan.name}</Text>
                <Text style={S.planDesc} numberOfLines={2}>
                  {plan.description ?? ''}
                </Text>
              </View>
              <View style={[S.planBadge, { backgroundColor: `${cfg.badge}18` }]}>
                {selected ? (
                  <Feather name="check-circle" size={22} color={cfg.accent} />
                ) : (
                  <Feather name="circle" size={22} color={cfg.badge} />
                )}
              </View>
            </View>

            {/* Price */}
            <View style={S.priceRow}>
              {isFree ? (
                <Text style={[S.priceMain, { color: cfg.accent }]}>Free</Text>
              ) : (
                <>
                  <Text style={[S.priceCurrency, { color: cfg.accent }]}>$</Text>
                  <Text style={[S.priceMain, { color: cfg.accent }]}>
                    {Math.round(price)}
                  </Text>
                  <Text style={[S.priceFreq, { color: DS.text.sub }]}>/month</Text>
                </>
              )}
            </View>
            {!isFree && (
              <Text style={[S.priceSavings, { color: cfg.badge }]}>
                ${Math.round(parseFloat(plan.priceYearly) / 12)}/mo billed annually
              </Text>
            )}

            {/* Limits */}
            <View style={S.limitsRow}>
              <View style={S.limitChip}>
                <Feather name="users" size={11} color={cfg.badge} />
                <Text style={[S.limitText, { color: cfg.badge }]}>
                  {plan.maxUsers >= 999 ? 'Unlimited' : plan.maxUsers} users
                </Text>
              </View>
              <View style={S.limitChip}>
                <Feather name="file-text" size={11} color={cfg.badge} />
                <Text style={[S.limitText, { color: cfg.badge }]}>
                  {plan.maxInvoices == null ? 'Unlimited' : plan.maxInvoices} invoices
                </Text>
              </View>
            </View>

            {/* Features */}
            {plan.features && plan.features.length > 0 && (
              <View style={S.featuresList}>
                {plan.features.slice(0, 4).map((f, i) => (
                  <View key={i} style={S.featureRow}>
                    <Feather name="check" size={12} color={cfg.accent} />
                    <Text style={[S.featureText, { color: DS.text.sub }]}>{f}</Text>
                  </View>
                ))}
                {plan.features.length > 4 && (
                  <Text style={[S.featureMore, { color: cfg.badge }]}>
                    +{plan.features.length - 4} more features
                  </Text>
                )}
              </View>
            )}
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════
const SubscriptionSelectScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const headerY = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await getPublicPlansAPI();
      const list: Plan[] = Array.isArray(data) ? data : (data?.data ?? []);
      setPlans(list.filter(p => p.isActive));
      // Pre-select Free plan if available
      const freePlan = list.find(p => parseFloat(p.priceMonthly) === 0);
      if (freePlan) setSelectedId(freePlan.id);
    } catch {
      // Fallback: will show empty state
    } finally {
      setLoadingPlans(false);
    }
  };

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
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={DS.navy} />

      <ScrollView
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[DS.navy, '#1E293B']}
          style={S.header}
        >
          <View style={S.orbTR} />
          <View style={S.orbBL} />

          <SafeAreaView edges={['top']}>
            <Animated.View
              style={[S.headerContent, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
            >
              <View style={S.logoRow}>
                <Text style={S.brand}>
                  <Text style={{ color: DS.green }}>Fin</Text>
                  <Text style={{ color: DS.text.inv }}>Matrix</Text>
                </Text>
              </View>
              <Text style={S.headerTitle}>Choose Your Plan</Text>
              <Text style={S.headerSub}>
                Select the plan that best fits your business.{'\n'}
                You can upgrade anytime.
              </Text>

              {/* Value pills */}
              <View style={S.pillRow}>
                {['No credit card required', 'Cancel anytime', '99.9% uptime SLA'].map(t => (
                  <View key={t} style={S.pill}>
                    <Feather name="check" size={10} color={DS.green} />
                    <Text style={S.pillText}>{t}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        {/* Plans */}
        <View style={S.content}>
          {loadingPlans ? (
            <View style={S.loaderWrap}>
              <ActivityIndicator size="large" color={DS.primary} />
              <Text style={S.loadingText}>Loading plans…</Text>
            </View>
          ) : plans.length === 0 ? (
            <View style={S.loaderWrap}>
              <Text style={S.loadingText}>Could not load plans. Tap Continue to proceed.</Text>
            </View>
          ) : (
            plans.map((p, i) => (
              <PlanCard
                key={p.id}
                plan={p}
                selected={selectedId === p.id}
                onSelect={() => setSelectedId(p.id)}
                delay={i * 80}
                isPopular={p.name === 'Professional'}
              />
            ))
          )}

          {/* CTA */}
          <View style={S.ctaSection}>
            <TouchableOpacity
              style={[S.cta, submitting && S.ctaDisabled]}
              onPress={handleContinue}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <View style={S.ctaRow}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={S.ctaLabel}>Setting up…</Text>
                </View>
              ) : (
                <Text style={S.ctaLabel}>
                  {selectedPlan && parseFloat(selectedPlan.priceMonthly) === 0
                    ? 'Continue with Free Plan'
                    : selectedPlan
                    ? `Start ${selectedPlan.name} Plan`
                    : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={S.skipBtn} activeOpacity={0.7}>
              <Text style={S.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          <Text style={S.legalText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            Plans billed monthly or annually. Cancel anytime.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────
const S = StyleSheet.create({
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
  planCard: {
    borderRadius: DS.radius.xl, overflow: 'hidden',
    borderWidth: 1.5, borderColor: DS.border,
    backgroundColor: DS.surface,
  },
  planGradient: { padding: 18 },
  popularBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 10, paddingVertical: 4,
    borderBottomLeftRadius: DS.radius.md,
    zIndex: 2,
  },
  popularText: {
    fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.8,
  },
  planTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  planName: { fontSize: 18, fontWeight: '800', fontFamily: THEME.typography.fontFamily },
  planDesc: {
    fontSize: 12, color: DS.text.sub, marginTop: 3,
    lineHeight: 17, maxWidth: 240, fontFamily: THEME.typography.fontFamily,
  },
  planBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // Price
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  priceCurrency: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  priceMain: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  priceFreq: { fontSize: 14, color: DS.text.muted, marginBottom: 6, marginLeft: 2 },
  priceSavings: { fontSize: 11, marginBottom: 12, fontWeight: '500' },

  // Limits
  limitsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  limitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  limitText: { fontSize: 11, fontWeight: '600' },

  // Features
  featuresList: { gap: 5 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  featureText: {
    fontSize: 12, fontFamily: THEME.typography.fontFamily,
  },
  featureMore: { fontSize: 11, fontWeight: '600', marginTop: 4 },

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

  legalText: {
    fontSize: 10, color: DS.text.muted, textAlign: 'center',
    lineHeight: 16, marginTop: 4, fontFamily: THEME.typography.fontFamily,
  },
});

export default SubscriptionSelectScreen;
