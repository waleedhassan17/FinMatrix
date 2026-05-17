// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Detail Screen
// Tabs: Inventory | Deliveries | Analytics
// ═══════════════════════════════════════════════════════

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectAgencies } from '../AgencyList/agencyListSlice';
import {
  selectAgencyDetailTab,
  setActiveTab,
  resetAgencyDetail,
  type AgencyDetailTab,
} from './agencyDetailSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { AGENCY_TYPE_COLORS } from '../../../models/agencyModel';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type DetailRoute = RouteProp<MoreStackParamList, 'AgencyDetail'>;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

const TABS: { key: AgencyDetailTab; label: string }[] = [
  { key: 'deliveries', label: 'Deliveries' },
  { key: 'analytics', label: 'Analytics' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const AgencyDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const agencies = useAppSelector(selectAgencies);
  const activeTab = useAppSelector(selectAgencyDetailTab);

  const agency = agencies.find(a => a.id === route.params.agencyId);

  // Reset tab state on unmount
  React.useEffect(() => {
    return () => { dispatch(resetAgencyDetail()); };
  }, [dispatch]);

  if (!agency) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Agency not found</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{agency.name}</Text>
        <CustomButton
          title="Edit"
          onPress={() => navigation.navigate('AgencyForm', { agencyId: agency.id })}
          variant="text"
          size="sm"
        />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoName}>{agency.name}</Text>
            <View style={[styles.typeBadge, { backgroundColor: AGENCY_TYPE_COLORS[agency.type] + '18' }]}>
              <Text style={[styles.typeBadgeText, { color: AGENCY_TYPE_COLORS[agency.type] }]}>
                {agency.type}
              </Text>
            </View>
          </View>
        </View>
        {agency.description ? (
          <Text style={styles.infoDesc}>{agency.description}</Text>
        ) : null}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍</Text>
          <Text style={styles.infoValue}>
            {typeof agency.address === 'object'
              ? [agency.address?.street, agency.address?.city, agency.address?.state].filter(Boolean).join(', ')
              : String(agency.address ?? '')}
            {agency.city ? `, ${agency.city}` : ''}
            {agency.province ? `, ${agency.province}` : ''}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📞</Text>
          <Text style={styles.infoValue}>{agency.contactPhone}</Text>
        </View>
        {agency.contactEmail ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>✉️</Text>
            <Text style={styles.infoValue}>{agency.contactEmail}</Text>
          </View>
        ) : null}
        <View style={styles.statRow}>
          <StatBox label="Type" value={agency.type} />
          <StatBox label="City" value={agency.city || '—'} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setActiveTab(t.key))}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {activeTab === 'deliveries' && <DeliveriesTab agencyName={agency.name} />}
      {activeTab === 'analytics' && <AnalyticsTab agencyName={agency.name} />}
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STAT BOX
// ═══════════════════════════════════════════════════════
const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);


// ═══════════════════════════════════════════════════════
// DELIVERIES TAB
// ═══════════════════════════════════════════════════════
interface DeliveryEntry {
  id: string;
  reference: string;
  date: string;
  itemCount: number;
  status: 'Delivered' | 'In Transit' | 'Pending';
}

const MOCK_DELIVERIES: DeliveryEntry[] = [
  { id: 'd1', reference: 'DEL-2026-001', date: '2026-03-10', itemCount: 12, status: 'Delivered' },
  { id: 'd2', reference: 'DEL-2026-002', date: '2026-03-08', itemCount: 8, status: 'Delivered' },
  { id: 'd3', reference: 'DEL-2026-003', date: '2026-03-12', itemCount: 5, status: 'In Transit' },
  { id: 'd4', reference: 'DEL-2026-004', date: '2026-03-13', itemCount: 15, status: 'Pending' },
];

const STATUS_COLORS: Record<string, string> = {
  Delivered: colors.success,
  'In Transit': colors.warning,
  Pending: colors.textLight,
};

const DeliveriesTab: React.FC<{ agencyName: string }> = ({ agencyName }) => (
  <FlatList
    data={MOCK_DELIVERIES}
    keyExtractor={d => d.id}
    contentContainerStyle={{ padding: spacing.lg }}
    showsVerticalScrollIndicator={false}
    renderItem={({ item: d }) => (
      <View style={styles.delCard}>
        <View style={styles.delTop}>
          <Text style={styles.delRef}>{d.reference}</Text>
          <View style={[styles.delStatusBadge, { backgroundColor: STATUS_COLORS[d.status] + '18' }]}>
            <Text style={[styles.delStatusText, { color: STATUS_COLORS[d.status] }]}>{d.status}</Text>
          </View>
        </View>
        <View style={styles.delBottom}>
          <Text style={styles.delDetail}>📅 {d.date}</Text>
          <Text style={styles.delDetail}>📦 {d.itemCount} items</Text>
        </View>
      </View>
    )}
    ListEmptyComponent={
      <View style={styles.center}><Text style={styles.emptyText}>No deliveries</Text></View>
    }
  />
);

// ═══════════════════════════════════════════════════════
// ANALYTICS TAB
// ═══════════════════════════════════════════════════════
const AnalyticsTab: React.FC<{ agencyName: string }> = ({ agencyName }) => (
  <ScrollView contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
    <Text style={styles.sectionTitle}>Delivery Performance</Text>
    <View style={styles.analyticsStatRow}>
      {MOCK_DELIVERIES.map(d => d.status).reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}) && (
        <>
          <View style={styles.analyticsStat}>
            <Text style={styles.analyticsStatVal}>{MOCK_DELIVERIES.length}</Text>
            <Text style={styles.analyticsStatLbl}>Total Deliveries</Text>
          </View>
          <View style={styles.analyticsStat}>
            <Text style={styles.analyticsStatVal}>
              {MOCK_DELIVERIES.filter(d => d.status === 'Delivered').length}
            </Text>
            <Text style={styles.analyticsStatLbl}>Completed</Text>
          </View>
        </>
      )}
    </View>
    <View style={{ height: spacing.xl }} />
  </ScrollView>
);

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
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1, textAlign: 'center' },

  // ── Info Card ─────────────────────────────────────
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  infoTop: { flexDirection: 'row', marginBottom: spacing.sm },
  infoName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  infoDesc: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs + 2, gap: spacing.xs },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 13, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1 },

  statRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: { fontSize: 13, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  statLabel: { fontSize: 10, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  // ── Tabs ──────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: colors.primary },

  // ── Inventory Tab ─────────────────────────────────
  invSearchRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  invSearchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  sortRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: { backgroundColor: colors.secondary + '15', borderColor: colors.secondary },
  sortChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  sortChipTextActive: { color: colors.secondary },

  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  invName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  invSku: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  invRight: { alignItems: 'flex-end' },
  invQty: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  invValue: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── Deliveries Tab ────────────────────────────────
  delCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  delTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  delRef: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  delStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  delStatusText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  delBottom: { flexDirection: 'row', gap: spacing.lg },
  delDetail: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── Analytics Tab ─────────────────────────────────
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.sm },
  analyticsStatRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  analyticsStat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    ...shadows.small,
  },
  analyticsStatVal: { fontSize: 16, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  analyticsStatLbl: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barLabel: { width: 90, fontSize: 11, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: 'hidden', marginHorizontal: spacing.xs },
  barFill: { height: 10, borderRadius: 5, backgroundColor: colors.secondary },
  barValue: { width: 80, fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, textAlign: 'right' },

  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs + 2,
    ...shadows.small,
  },
  catName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  catRight: { alignItems: 'flex-end' },
  catQty: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  catValue: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Common ────────────────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default AgencyDetailScreen;
