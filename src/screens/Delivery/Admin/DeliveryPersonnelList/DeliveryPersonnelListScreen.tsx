import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { Feather } from '@expo/vector-icons';
// BILLING-DISABLED BUILD: both were only used by the plan-limit fetch below.
// import { useFocusEffect } from '@react-navigation/native';
// import { getPlanLimitsAPI, type PlanLimits } from '../../../../networks/billing/billingNetwork';
import {
  HeaderAction,
  ReportContainer,
  ReportHeader
} from '../../../../components/reports/ReportUI';
import { FilterTabs, type TabItem } from '../../../../components/shared/Tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { THEME, statusStyle } from '../../../../utils/theme';
import { ROUTES } from '../../../../navigations-maps/Base';
import EmptyState from '../../../../components/shared/EmptyState';
import { useAppSelector, useAppDispatch } from '../../../../hooks/useReduxHooks';
import { selectDeliveryPersonnel, fetchDeliveryPersonnel } from '../../Admin/AssignDeliveries/deliverySlice';
import type { DummyDeliveryPerson } from '../../../../models/deliveryModel';
import type { RootStackParamList } from '../../../../types';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, spacing, typography } = THEME;

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryPersonnelList'>;

type RiderStatus = 'available' | 'busy' | 'on_leave' | 'inactive' | 'plan_locked';
type FilterKey = 'all' | RiderStatus;

const STATUS_LABELS: Record<RiderStatus, string> = {
  available: 'Available',
  busy: 'Busy',
  on_leave: 'On leave',
  inactive: 'Inactive',
  plan_locked: 'Paused',
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: 'Motorcycle',
  van: 'Van',
  truck: 'Truck'
};

/**
 * Has anyone actually configured a capacity for this rider?
 *
 * maxLoad 0 means "not set", not "can carry nothing". It was being divided by:
 * `(0 / 0) * 100` is NaN, which fails both `< 50` and `<= 80` and fell through
 * to the danger colour, so every rider without a configured capacity was drawn
 * as critically overloaded with a full red bar. The same comparison
 * (`currentLoad < maxLoad`) also silently kept them out of the Available count.
 *
 * Module scope on purpose: the stats useMemo below calls this during render,
 * which a const declared inside the component would not yet have initialised.
 */
const hasCapacity = (max: number) => max > 0;

/**
 * Where a rider stands, the same five states the web's riders page uses.
 *
 * Inactive used to fold into on_leave, so a deactivated rider read "Leave" on
 * their card while the On Leave count, which looked only at on_leave, said 0.
 */
const riderStatus = (p: DummyDeliveryPerson): RiderStatus => {
  if (p.status === 'plan_locked') return 'plan_locked';
  if (p.status === 'inactive') return 'inactive';
  if (p.status === 'on_leave') return 'on_leave';
  // `currentLoad < maxLoad` is false when maxLoad is 0, so a rider with no
  // capacity configured could never be shown as available. Capacity only
  // disqualifies them when a capacity actually exists.
  if (p.isAvailable && (!hasCapacity(p.maxLoad) || (p.currentLoad ?? 0) < p.maxLoad)) return 'available';
  return 'busy';
};

/** "3 of 15 deliveries", or the bare count for a rider with no capacity set. */
const loadLabel = (p: DummyDeliveryPerson): string => {
  const load = p.currentLoad ?? 0;
  if (hasCapacity(p.maxLoad)) return `${load} of ${p.maxLoad} deliveries`;
  return load > 0 ? `${load} active` : 'No active deliveries';
};

/** Colour on the load only once it is worth noticing. */
const loadColor = (p: DummyDeliveryPerson): string => {
  const load = p.currentLoad ?? 0;
  if (!hasCapacity(p.maxLoad) || load === 0) return colors.textSecondary;
  const pct = (load / p.maxLoad) * 100;
  if (pct > 80) return colors.danger;
  return pct >= 50 ? colors.warning : colors.textSecondary;
};

const DeliveryPersonnelListScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);
  const handlePullRefresh = React.useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await dispatch(fetchDeliveryPersonnel());
    } finally {
      setIsPullRefreshing(false);
    }
  }, [dispatch]);
  const allPersonnel = useAppSelector(selectDeliveryPersonnel);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // BILLING-DISABLED BUILD: nothing reads the plan limits any more — the
  // usage bar and the Add gate are both commented out below — so the fetch
  // goes too rather than polling /billing/plan-limits on every refocus.
  // const [limits, setLimits] = useState<PlanLimits | null>(null);

  useEffect(() => {
    dispatch(fetchDeliveryPersonnel());
  }, [dispatch]);

  // // Plan-based limit (phase2.md): refresh whenever the screen refocuses so the
  // // "X of LIMIT used" count and the Add gate stay accurate after changes.
  // useFocusEffect(
  //   useCallback(() => {
  //     getPlanLimitsAPI().then(setLimits).catch(() => {});
  //   }, []),
  // );
  //
  // const atLimit = !!limits && !limits.canAddMore;

  // BILLING-DISABLED BUILD: the at-limit branch offered an "Upgrade plan"
  // action, and RenewSubscription is no longer a registered route — the
  // `as any` means that would have compiled and then crashed on tap. The
  // server also uncaps the free plan's rider seats while the flag is on
  // (riderSeatLimit in the backend's plan-config.ts), so `atLimit` should
  // never be true here anyway.
  const guardedAdd = useCallback(() => {
    // if (atLimit && limits) {
    //   Alert.alert(
    //     'Personnel limit reached',
    //     `Your ${limits.planLabel} plan allows ${limits.deliveryPersonnelLimit} delivery ` +
    //       `${limits.deliveryPersonnelLimit === 1 ? 'person' : 'people'}. ` +
    //       `Upgrade your plan to add more delivery personnel.`,
    //     [
    //       { text: 'Not now', style: 'cancel' },
    //       {
    //         text: 'Upgrade plan',
    //         onPress: () => navigation.navigate('RenewSubscription' as any, { mode: 'change' })
    //       },
    //     ],
    //   );
    //   return;
    // }
    navigation.navigate(ROUTES.ADD_DELIVERY_PERSONNEL as any);
  }, [navigation]);

  const filteredPersonnel = useMemo(() => {
    let list = allPersonnel;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      // Every field but the name is optional on a rider -- an account created
      // without an email or a phone would have thrown on .toLowerCase() here.
      // Username is searchable because it is what the office hands over.
      list = list.filter(p =>
        [p.displayName, p.username, p.phone, p.email]
          .some(v => (v ?? '').toLowerCase().includes(q)),
      );
    }
    if (activeFilter !== 'all') {
      list = list.filter(p => riderStatus(p) === activeFilter);
    }
    return list;
  }, [allPersonnel, searchQuery, activeFilter]);

  // Counted from the same status the rows show, so a tab's count and what it
  // lists can never disagree.
  const filters = useMemo<TabItem<FilterKey>[]>(() => {
    const count = (status: RiderStatus) => allPersonnel.filter(p => riderStatus(p) === status).length;
    const tabs: TabItem<FilterKey>[] = [
      { label: 'All', value: 'all', count: allPersonnel.length },
      { label: STATUS_LABELS.available, value: 'available', count: count('available') },
      { label: STATUS_LABELS.busy, value: 'busy', count: count('busy') },
      { label: STATUS_LABELS.on_leave, value: 'on_leave', count: count('on_leave') },
    ];
    // Most teams have neither, so they appear only when there is someone in them.
    (['inactive', 'plan_locked'] as const).forEach(status => {
      if (count(status) > 0 || activeFilter === status) {
        tabs.push({ label: STATUS_LABELS[status], value: status, count: count(status) });
      }
    });
    return tabs;
  }, [allPersonnel, activeFilter]);

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Who they are, where they stand, how loaded they are. The name has its line
  // to itself: a status pill beside it cut names short. The status is the dot's
  // colour alone; the avatar used to repeat it. Rating went too: the list has no
  // way to tell a rider's record from the 5.0 every new rider gets, and it lives
  // on the detail screen, which does.
  const renderPersonCard = ({ item }: { item: DummyDeliveryPerson }) => {
    const status = riderStatus(item);
    const zones = item.zones.slice(0, 3).join(', ');
    const statusColor = statusStyle(status).fg;
    const vehicle = [VEHICLE_LABELS[item.vehicleType] || item.vehicleType, item.vehicleNumber].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        style={styles.personCard}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.displayName}, ${STATUS_LABELS[status]}`}
        onPress={() =>
          navigation.navigate(ROUTES.DELIVERY_PERSONNEL_DETAIL as any, { userId: item.userId })
        }>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
        </View>

        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>{item.displayName}</Text>
          <View style={styles.statusLine}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusWord, { color: statusColor }]}>{STATUS_LABELS[status]}</Text>
            {!!vehicle && <Text style={styles.statusVehicle} numberOfLines={1}>· {vehicle}</Text>}
          </View>
          <Text style={styles.personMeta} numberOfLines={1}>
            <Text style={{ color: loadColor(item) }}>{loadLabel(item)}</Text>
            {zones ? ` · ${zones}` : ''}
          </Text>
        </View>

        <Feather name="chevron-right" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <ReportContainer>
      <ReportHeader
        title="Delivery Team"
        onBack={() => navigation.goBack()}
        right={<HeaderAction label="New" onPress={guardedAdd} />}
      />

      {/* BILLING-DISABLED BUILD: the plan-usage bar (phase2.md). The whole
          strip goes, not just its Upgrade link — with the free plan's rider
          seats uncapped server-side it would read "3 of 999999 delivery
          personnel used", which is worse than showing nothing. */}
      {/*
      {limits && (
        <View style={[styles.usageBar, atLimit && styles.usageBarWarn]}>
          <Feather
            name={atLimit ? 'alert-triangle' : 'users'}
            size={15}
            color={atLimit ? colors.warningHover : colors.actionGreen}
          />
          <Text style={[styles.usageText, atLimit && { color: colors.warningHover }]}>
            {limits.currentCount} of {limits.deliveryPersonnelLimit} delivery personnel used
            {atLimit ? ' — plan limit reached' : ''}
            {limits.lockedCount
              ? ` · ${limits.lockedCount} paused by your plan limit`
              : ''}
          </Text>
          {(atLimit || !!limits.lockedCount) && (
            <TouchableOpacity
              onPress={() => navigation.navigate('RenewSubscription' as any, { mode: 'change' })}>
              <Text style={styles.usageUpgrade}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      */}

      {/* Search. The four stat tiles that sat above it are gone: Total,
          Available and On Leave were the same numbers as the tabs below, one
          block lower. */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, username or phone"
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Feather name="x-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <FilterTabs tabs={filters} active={activeFilter} onChange={setActiveFilter} style={styles.filters} />

      {/* List */}
      <FlatList
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={THEME.colors.primary}
          />
        }
        data={filteredPersonnel}
        renderItem={renderPersonCard}
        keyExtractor={item => item.userId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title={allPersonnel.length === 0 ? 'No riders yet' : 'No riders found'}
            message={
              searchQuery
                ? 'Try a different search term.'
                : allPersonnel.length === 0
                  ? 'Add your first delivery team member.'
                  : 'No rider is in this group right now.'
            }
            actionLabel={allPersonnel.length === 0 ? 'Add rider' : undefined}
            onAction={allPersonnel.length === 0 ? guardedAdd : undefined}
          />
        }
      />
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  // Kept for the billing-disabled usage bar above.
  usageBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.actionGreenLighter, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs,
  },
  usageBarWarn: { backgroundColor: colors.warningLighter },
  usageText: { flex: 1, ...typography.labelMd, color: colors.actionGreen },
  usageUpgrade: { ...typography.labelMd, color: colors.warningHover },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    paddingHorizontal: spacing.sm, height: 42, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.textPrimary, paddingVertical: 0 },
  // FilterTabs pads its row by spacing.lg; this lines its first pill up with
  // the search field and the cards, on the screen's spacing.md gutter.
  filters: { marginHorizontal: -spacing.xxs, marginTop: spacing.xxs },

  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xxs, paddingBottom: spacing.xxl },
  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.sm + 2, marginBottom: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.primaryLight,
  },
  avatarText: { ...typography.labelMd, color: colors.primary },
  personInfo: { flex: 1, minWidth: 0 },
  personName: { ...typography.labelLg, color: colors.textPrimary, marginBottom: 2 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs + 1 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusWord: { ...typography.labelSm },
  statusVehicle: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  personMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});

export default DeliveryPersonnelListScreen;