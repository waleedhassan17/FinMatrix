// ═══════════════════════════════════════════════════════
// FinMatrix — Renew / Choose Plan (Flow 2 landing + Flow 3 plan chooser)
// When accountStatus='inactive' this is the ONLY reachable screen (renew-only).
// From Settings it is opened as a plan chooser (mode='change').
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { signOut } from '../Auth/authSlice';
import { authSignOut } from '../../networks/auth/authNetwork';
import { bootstrapSession } from '../../components/app-container/appContainerSlice';
import {
  getBillingStatusAPI,
  getPlansForTypeAPI,
  type BillingStatus,
  type TierPlanCard,
} from '../../networks/billing/billingNetwork';

const DS = {
  navy: '#091E42',
  primary: '#059669',
  amber: '#B54708',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  border: '#DFE1E6',
  text: { h: '#172B4D', sub: '#5E6C84', muted: '#8993A4', inv: '#FFFFFF' },
};

// Plan cards come from GET /billing/plans — the two tier plans (3mo + 6mo)
// for THIS company's type, with server-set prices. The legacy standard/pro
// cards that used to be hardcoded here are no longer offered anywhere (the
// backend also rejects them for tier companies with PLAN_TYPE_MISMATCH).
const PLAN_ACCENTS = ['#00875A', '#6554C0'];

const perksFor = (p: TierPlanCard): string[] => {
  const perks = ['Full accounting suite'];
  if (p.deliveryPersonnelLimit > 0) {
    perks.push(`Up to ${p.deliveryPersonnelLimit} delivery personnel`);
  }
  if (p.monthlySavingsLabel) {
    perks.push(`Save ${p.monthlySavingsLabel}/month vs the 3-month plan`);
  }
  return perks;
};

type Props = NativeStackScreenProps<RootStackParamList, 'RenewSubscription'>;

const RenewSubscriptionScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const mode = route.params?.mode ?? 'renew';
  const companyStatus = useAppSelector(s => s.auth.user?.companyStatus ?? null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<TierPlanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const resyncing = useRef(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        getBillingStatusAPI(),
        getPlansForTypeAPI().then(r => r.plans).catch(() => [] as TierPlanCard[]),
      ]);
      setStatus(s);
      if (p.length > 0) setPlans(p);
      // Approved while we sat here (renew-only gate): billing says the
      // account is active again but Redux still holds the stale 'inactive'
      // companyStatus that keeps this gate mounted. Re-run the session
      // bootstrap — /auth/me refreshes the user and the navigator swaps
      // straight back into the app. Without this the user stayed stuck on
      // this screen until a full app restart.
      if (
        mode === 'renew' &&
        s.accountStatus === 'active' &&
        companyStatus !== 'active' &&
        !resyncing.current
      ) {
        resyncing.current = true;
        dispatch(bootstrapSession());
      }
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode, companyStatus, dispatch]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const awaiting = status?.lastSubmission?.status === 'submitted';
  const rejected = status?.lastSubmission?.status === 'rejected';

  // While a submission is with the admin, poll so approval lands without the
  // user having to pull-to-refresh (20s is plenty for a manual review flow).
  useEffect(() => {
    if (!awaiting) return;
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [awaiting, load]);

  const choose = (plan: string) => {
    if (awaiting) return; // a submission is already with the admin — no double-pay
    navigation.navigate('SubscriptionPay', { plan, mode: mode === 'renew' ? 'renew' : 'change' });
  };

  const doSignOut = async () => {
    await authSignOut();
    dispatch(signOut());
  };

  if (loading) {
    return (
      <View style={[S.root, S.center]}>
        <ActivityIndicator size="large" color={DS.primary} />
      </View>
    );
  }

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={DS.navy} />
      <SafeAreaView edges={['top']} style={S.header}>
        {mode === 'change' ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.back}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={S.brandRow}>
            <Text style={S.brand}>
              <Text style={{ color: DS.primary }}>Fin</Text>
              <Text style={{ color: '#FFF' }}>Matrix</Text>
            </Text>
          </View>
        )}
        <Text style={S.headerTitle}>
          {mode === 'renew' ? 'Renew your subscription' : 'Choose a plan'}
        </Text>
        <Text style={S.headerSub}>
          {mode === 'renew'
            ? 'Your subscription has expired and your account is paused. Renew to restore full access.'
            : 'Upgrade or change your plan at any time.'}
        </Text>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        {mode === 'renew' && (
          <View style={S.reassure}>
            <Feather name="shield" size={18} color={DS.primary} />
            <Text style={S.reassureText}>
              Your data is safe. All your invoices, ledger, inventory and delivery records are
              intact and will be exactly as you left them after you renew.
            </Text>
          </View>
        )}

        {/* Current plan snapshot */}
        {status && (
          <View style={S.currentCard}>
            <Text style={S.currentLabel}>CURRENT PLAN</Text>
            <View style={S.currentRow}>
              <Text style={S.currentPlan}>{status.planLabel}</Text>
              <View style={[S.pill, statusPill(status.subscriptionStatus)]}>
                <Text style={S.pillText}>{status.subscriptionStatus.toUpperCase()}</Text>
              </View>
            </View>
            {status.expiryDate && (
              <Text style={S.currentMeta}>
                {status.subscriptionStatus === 'expired' ? 'Expired on ' : 'Renews / expires on '}
                {new Date(status.expiryDate).toDateString()}
              </Text>
            )}
          </View>
        )}

        {awaiting && (
          <View style={[S.banner, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <Feather name="clock" size={16} color={DS.amber} />
            <Text style={[S.bannerText, { color: DS.amber }]}>
              Bill submitted successfully — waiting for admin approval. Your plan activates
              automatically once the payment is verified.
            </Text>
          </View>
        )}
        {rejected && !awaiting && (
          <View style={[S.banner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Feather name="alert-circle" size={16} color="#B91C1C" />
            <Text style={[S.bannerText, { color: '#B91C1C' }]}>
              Your last payment could not be verified
              {status?.lastSubmission?.rejectionReason
                ? `: ${status.lastSubmission.rejectionReason}`
                : ''}
              . Please submit again.
            </Text>
          </View>
        )}

        <Text style={S.pickHeading}>{mode === 'renew' ? 'Select a plan to renew' : 'Available plans'}</Text>
        {plans.length === 0 ? (
          <View style={S.banner}>
            <Feather name="wifi-off" size={16} color={DS.text.sub} />
            <Text style={[S.bannerText, { color: DS.text.sub }]}>
              Could not load the plans. Pull down to try again.
            </Text>
          </View>
        ) : (
          plans.map((p, i) => (
            <TouchableOpacity
              key={p.key}
              style={[S.planCard, awaiting && S.planCardDisabled]}
              activeOpacity={0.85}
              disabled={awaiting}
              onPress={() => choose(p.key)}
            >
              <View style={[S.planStripe, { backgroundColor: PLAN_ACCENTS[i % PLAN_ACCENTS.length] }]} />
              <View style={{ flex: 1 }}>
                <View style={S.planHeaderRow}>
                  <Text style={S.planName}>{p.durationMonths} months</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={S.planPrice}>
                      {p.monthlyLabel} <Text style={S.planDuration}>/ month</Text>
                    </Text>
                    <Text style={S.planTotal}>
                      {p.durationMonths} months · {p.totalLabel} total
                    </Text>
                  </View>
                </View>
                {perksFor(p).map((perk) => (
                  <View key={perk} style={S.perkRow}>
                    <Feather name="check" size={13} color={DS.primary} />
                    <Text style={S.perkText}>{perk}</Text>
                  </View>
                ))}
              </View>
              <Feather name="chevron-right" size={20} color={DS.text.muted} />
            </TouchableOpacity>
          ))
        )}

        <Text style={S.footnote}>
          Prices are for your company's tier. All features of your tier stay available for the
          whole subscription period, and your data is never deleted between renewals.
        </Text>

        {mode === 'renew' && (
          <TouchableOpacity style={S.signOut} onPress={doSignOut}>
            <Feather name="log-out" size={16} color={DS.text.sub} />
            <Text style={S.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

function statusPill(s: string) {
  if (s === 'expired') return { backgroundColor: '#FEE2E2' };
  if (s === 'expiring') return { backgroundColor: '#FEF3C7' };
  return { backgroundColor: '#DCFCE7' };
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: DS.navy, paddingHorizontal: 20, paddingBottom: 22 },
  back: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 12,
  },
  brandRow: { marginBottom: 14, marginTop: 4 },
  brand: { fontSize: 20, fontWeight: '800' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6, lineHeight: 19 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },

  reassure: {
    flexDirection: 'row', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  reassureText: { flex: 1, fontSize: 13, color: '#166534', lineHeight: 19 },

  currentCard: { backgroundColor: DS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: DS.border },
  currentLabel: { fontSize: 11, fontWeight: '700', color: DS.text.muted, letterSpacing: 1 },
  currentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  currentPlan: { fontSize: 20, fontWeight: '800', color: DS.text.h },
  currentMeta: { fontSize: 12, color: DS.text.sub, marginTop: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 10, fontWeight: '800', color: DS.text.h },

  banner: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1 },
  bannerText: { flex: 1, fontSize: 12, lineHeight: 17 },

  pickHeading: { fontSize: 14, fontWeight: '700', color: DS.text.h, marginTop: 4 },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DS.surface,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: DS.border,
  },
  planCardDisabled: { opacity: 0.45 },
  planStripe: { width: 4, alignSelf: 'stretch', borderRadius: 3 },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planName: { fontSize: 17, fontWeight: '800', color: DS.text.h },
  planPrice: { fontSize: 15, fontWeight: '800', color: DS.primary },
  planDuration: { fontSize: 12, fontWeight: '600', color: DS.text.muted },
  planTotal: { fontSize: 11, fontWeight: '600', color: DS.text.sub, marginTop: 2 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 2 },
  perkText: { fontSize: 12, color: DS.text.sub },

  footnote: { fontSize: 11, color: DS.text.muted, textAlign: 'center', lineHeight: 16, marginTop: 4 },
  signOut: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  signOutText: { fontSize: 14, color: DS.text.sub, fontWeight: '600' },
});

export default RenewSubscriptionScreen;
