import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import { ROUTES } from '../../../../navigations-map/Base';
import EmptyState from '../../../../components/EmptyState';
import { useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectActiveCompany } from '../../../Auth/companySlice';
import { dummyDeliveryPersonnel, type DummyDeliveryPerson } from '../../../../models/deliveryModel';
import type { RootStackParamList } from '../../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryPersonnelList'>;

type FilterKey = 'all' | 'available' | 'busy' | 'on_leave';

const STATUS_COLORS: Record<string, string> = {
  available: colors.success,
  busy: '#F59E0B',
  on_leave: '#9CA3AF',
  active: colors.success,
  inactive: '#9CA3AF',
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck',
};

const TAB_COLORS: Record<FilterKey, string> = {
  all: colors.primary,
  available: colors.success,
  busy: '#F59E0B',
  on_leave: '#9CA3AF',
};

const DeliveryPersonnelListScreen: React.FC<Props> = ({ navigation }) => {
  const activeCompany = useAppSelector(selectActiveCompany);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const allPersonnel: DummyDeliveryPerson[] = useMemo(() => {
    const companyPersonnel = activeCompany?.deliveryPersonnel ?? [];
    const knownIds = new Set(companyPersonnel.map(p => p.userId));
    const fromDummy = dummyDeliveryPersonnel.filter(d => !knownIds.has(d.userId));
    return [...companyPersonnel, ...fromDummy];
  }, [activeCompany]);

  const getEffectiveStatus = (p: DummyDeliveryPerson): string => {
    if (p.status === 'on_leave' || p.status === 'inactive') return 'on_leave';
    if (p.isAvailable && p.currentLoad < p.maxLoad) return 'available';
    return 'busy';
  };

  const filteredPersonnel = useMemo(() => {
    let list = allPersonnel;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.displayName.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
      );
    }
    if (activeFilter !== 'all') {
      list = list.filter(p => getEffectiveStatus(p) === activeFilter);
    }
    return list;
  }, [allPersonnel, searchQuery, activeFilter]);

  const stats = useMemo(() => {
    const total = allPersonnel.length;
    const active = allPersonnel.filter(p => p.status === 'active').length;
    const onLeave = allPersonnel.filter(p => p.status === 'on_leave').length;
    const available = allPersonnel.filter(
      p => p.isAvailable && p.status === 'active' && p.currentLoad < p.maxLoad,
    ).length;
    return { total, active, onLeave, available };
  }, [allPersonnel]);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const getLoadColor = (current: number, max: number) => {
    const pct = (current / max) * 100;
    if (pct < 50) return colors.success;
    if (pct <= 80) return '#F59E0B';
    return colors.danger;
  };

  const renderPersonCard = ({ item }: { item: DummyDeliveryPerson }) => {
    const status = getEffectiveStatus(item);
    const statusColor = STATUS_COLORS[status] || colors.textLight;
    const loadColor = getLoadColor(item.currentLoad, item.maxLoad);
    const loadPct = Math.min((item.currentLoad / item.maxLoad) * 100, 100);

    return (
      <TouchableOpacity
        style={styles.personCard}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate(ROUTES.DELIVERY_PERSONNEL_DETAIL as any, { userId: item.userId })
        }>
        <View style={[styles.avatar, { backgroundColor: statusColor + '10' }]}>
          <Text style={[styles.avatarText, { color: statusColor }]}>
            {getInitials(item.displayName)}
          </Text>
        </View>

        <View style={styles.personInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.personName} numberOfLines={1}>{item.displayName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '12' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {status === 'on_leave' ? 'Leave' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>
              {VEHICLE_LABELS[item.vehicleType] || item.vehicleType}
            </Text>
            <View style={styles.vehicleSeparator} />
            <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
          </View>

          <View style={styles.loadContainer}>
            <Text style={styles.loadLabel}>{item.currentLoad}/{item.maxLoad} deliveries</Text>
            <View style={styles.loadTrack}>
              <View style={[styles.loadFill, { width: `${loadPct}%`, backgroundColor: loadColor }]} />
            </View>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)} rating</Text>
            <View style={styles.zonesRow}>
              {item.zones.slice(0, 3).map(zone => (
                <React.Fragment key={zone}>
                  <View style={styles.zoneTag}>
                    <Text style={styles.zoneText}>{zone}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'available', label: 'Available', count: stats.available },
    { key: 'busy', label: 'Busy', count: stats.active - stats.available },
    { key: 'on_leave', label: 'On Leave', count: stats.onLeave },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={styles.backIconContainer}>
            <Text style={styles.backArrow}>{'‹'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Team</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate(ROUTES.ADD_DELIVERY_PERSONNEL as any)}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryBar}>
        {[
          { label: 'Total', value: stats.total, color: colors.primary },
          { label: 'Active', value: stats.active, color: colors.success },
          { label: 'On Leave', value: stats.onLeave, color: '#9CA3AF' },
          { label: 'Available', value: stats.available, color: colors.success },
        ].map((item, i) => (
          <View key={i} style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearIcon}>{'\u00D7'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filterTrack}>
        {filters.map(f => {
          const active = activeFilter === f.key;
          const accent = TAB_COLORS[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterTab,
                active && styles.filterTabActive,
                active && { borderLeftWidth: 3, borderLeftColor: accent },
              ]}
              activeOpacity={0.7}
              onPress={() => setActiveFilter(f.key)}>
              <Text style={[styles.filterLabel, active && { color: accent, fontWeight: '600' as const }]}>
                {f.label}
              </Text>
              <View style={[
                styles.filterCount,
                active && { backgroundColor: accent + '18' },
              ]}>
                <Text style={[
                  styles.filterCountText,
                  active && { color: accent },
                ]}>
                  {f.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={filteredPersonnel}
        renderItem={renderPersonCard}
        keyExtractor={item => item.userId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="No Personnel Found"
            message={searchQuery ? 'Try a different search term.' : 'Add your first delivery team member.'}
            actionLabel={searchQuery ? undefined : '+ Add Personnel'}
            onAction={searchQuery ? undefined : () => navigation.navigate(ROUTES.ADD_DELIVERY_PERSONNEL as any)}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: THEME.typography.h3.fontSize, fontWeight: '600',
    color: colors.textPrimary, fontFamily: THEME.typography.fontFamily,
  },
  addButton: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2, borderRadius: 8,
  },
  addButtonText: {
    color: colors.white, fontSize: THEME.typography.bodyMd.fontSize, fontWeight: '600', fontFamily: THEME.typography.fontFamily,
  },
  summaryBar: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    gap: spacing.sm, backgroundColor: colors.white,
  },
  summaryItem: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 8,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  summaryNumber: {
    fontSize: 20, fontWeight: '700', fontFamily: THEME.typography.fontFamily,
  },
  summaryLabel: {
    fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, marginTop: 2, fontFamily: THEME.typography.fontFamily,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    paddingHorizontal: spacing.md, height: 42, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: {
    flex: 1, fontSize: THEME.typography.bodyMd.fontSize, color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily, padding: 0,
  },
  clearIcon: { fontSize: 20, color: colors.textLight, padding: spacing.xs },
  filterTrack: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: spacing.sm,
    marginBottom: spacing.xs, padding: 3, borderRadius: 12,
    backgroundColor: colors.border + '80', gap: 3,
  },
  filterTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: 10, gap: 5,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: colors.white,
  },
  filterLabel: {
    fontSize: 12, fontWeight: '500', color: colors.textLight, fontFamily: THEME.typography.fontFamily,
  },
  filterCount: {
    minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.border, paddingHorizontal: 4,
  },
  filterCountText: {
    fontSize: 10, fontWeight: '600', color: colors.textLight, fontFamily: THEME.typography.fontFamily,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xl },
  personCard: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.md + 2,
    padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center',
    justifyContent: 'center', marginRight: spacing.sm + 4,
  },
  avatarText: { fontSize: 16, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  personInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs,
  },
  personName: {
    fontSize: 15, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm,
    paddingVertical: 2, borderRadius: 6, gap: 4, marginLeft: spacing.xs,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '500', fontFamily: THEME.typography.fontFamily },
  vehicleRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.xs,
  },
  vehicleLabel: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  vehicleSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textLight },
  vehicleNumber: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  loadContainer: { marginBottom: spacing.xs },
  loadLabel: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, marginBottom: 3, fontFamily: THEME.typography.fontFamily },
  loadTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  loadFill: { height: 4, borderRadius: 2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingText: { fontSize: THEME.typography.caption.fontSize, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  zonesRow: { flexDirection: 'row', gap: spacing.xs },
  zoneTag: {
    backgroundColor: colors.secondary + '0C', paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1, borderRadius: 4,
  },
  zoneText: { fontSize: 10, color: colors.secondary, fontWeight: '500', fontFamily: THEME.typography.fontFamily },
  emptyContainer: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.border + '40',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  emptyIcon: { fontSize: 24, fontWeight: '700', color: colors.textLight },
  emptyText: { fontSize: THEME.typography.bodyLg.fontSize, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default DeliveryPersonnelListScreen;