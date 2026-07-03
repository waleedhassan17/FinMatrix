// ═══════════════════════════════════════════════════════
// FinMatrix — Renew / Choose Plan (Flow 2 landing + Flow 3 plan chooser)
// When accountStatus='inactive' this is the ONLY reachable screen (renew-only).
// From Settings it is opened as a plan chooser (mode='change').
// ═══════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
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
import { useAppDispatch } from '../../hooks/useReduxHooks';
import { signOut } from '../Auth/authSlice';
import { authSignOut } from '../../network/authNetwork';
import { getBillingStatusAPI, type BillingStatus } from '../../network/billingNetwork';

const DS = {
  navy: '#091E42',
  primary: '#059669',
  amber: '#B54708',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  border: '#DFE1E6',
  text: { h: '#172B4D', sub: '#5E6C84', muted: '#8993A4', inv: '#FFFFFF' },
};

interface PlanOption {
  key: 'standard' | 'pro';
  name: string;
  price: string;
  duration: string;
  total: string;
  perks: string[];
  accent: [string, string];
}

const PAID_PLANS: PlanOption[] = [
  {
    key: 'standard',
    name: 'Standard',
    price: 'Rs 1,000',
    duration: '6 months',
    total: 'Rs 6,000 total',
    perks: ['Up to 3 delivery personnel', 'Full accounting suite', 'Priority support'],
    accent: ['#00875A', '#006644'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 'Rs 2,000',
    duration: '2 months',
    total: 'Rs 4,000 total',
    perks: ['Up to 3 delivery personnel', 'Full accounting suite', 'Advanced analytics'],
    accent: ['#6554C0', '#5243AA'],
  },
];

type Props = NativeStackScreenProps<RootStackParamList, 'RenewSubscription'>;

const RenewSubscriptionScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const mode = route.params?.mode ?? 'renew';
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getBillingStatusAPI());
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const awaiting = status?.lastSubmission?.status === 'submitted';
  const rejected = status?.lastSubmission?.status === 'rejected';

  const choose = (plan: 'standard' | 'pro') => {
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
        {PAID_PLANS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[S.planCard, awaiting && S.planCardDisabled]}
            activeOpacity={0.85}
            disabled={awaiting}
            onPress={() => choose(p.key)}
          >
            <View style={[S.planStripe, { backgroundColor: p.accent[0] }]} />
            <View style={{ flex: 1 }}>
              <View style={S.planHeaderRow}>
                <Text style={S.planName}>{p.name}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={S.planPrice}>
                    {p.price} <Text style={S.planDuration}>/ month</Text>
                  </Text>
                  <Text style={S.planTotal}>
                    {p.duration} · {p.total}
                  </Text>
                </View>
              </View>
              {p.perks.map((perk) => (
                <View key={perk} style={S.perkRow}>
                  <Feather name="check" size={13} color={DS.primary} />
                  <Text style={S.perkText}>{perk}</Text>
                </View>
              ))}
            </View>
            <Feather name="chevron-right" size={20} color={DS.text.muted} />
          </TouchableOpacity>
        ))}

        <Text style={S.footnote}>
          All accounting features are available on every plan — including Free. Paid plans raise
          the delivery-personnel limit from 1 to 3.
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
