import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../../../theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUser } from '../../../Auth/authSlice';
import { selectShadowInventory, selectInventoryUpdateRequests } from '../../Admin/AssignDeliveries/deliverySlice';
import type { DPInventoryStackParamList } from '../../../../navigators/stacks/DPInventoryStack';
import {
  selectDPInventoryState,
  setDPInventoryRequestSearchTerm,
  setDPInventoryRequestSortBy,
  setDPInventoryRequestStatusFilter,
} from './dpInventorySlice';

type Props = NativeStackScreenProps<DPInventoryStackParamList, 'DPInventory'>;

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;
const REQUEST_SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'qty_high', label: 'Qty High-Low' },
  { key: 'qty_low', label: 'Qty Low-High' },
] as const;

const DPInventoryScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const shadowInventory = useAppSelector(selectShadowInventory);
  const updateRequests = useAppSelector(selectInventoryUpdateRequests);
  const { requestSearchTerm, requestStatusFilter, requestSortBy } = useAppSelector(selectDPInventoryState);
  const userId = user?.uid ?? 'dp_002';

  const myInventory = useMemo(
    () => shadowInventory.filter(item => item.personnelId === userId),
    [shadowInventory, userId],
  );

  const myRequests = useMemo(() => {
    const filtered = updateRequests
      .filter(req => req.personnelId === userId)
      .filter(req => {
        if (requestStatusFilter === 'all') {
          return true;
        }
        return req.status === requestStatusFilter;
      })
      .filter(req => {
        if (!requestSearchTerm.trim()) {
          return true;
        }
        const text = requestSearchTerm.trim().toLowerCase();
        return req.itemName.toLowerCase().includes(text) || req.reason.toLowerCase().includes(text);
      });

    return [...filtered].sort((a, b) => {
      if (requestSortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (requestSortBy === 'qty_high') {
        return b.requestedQty - a.requestedQty;
      }
      if (requestSortBy === 'qty_low') {
        return a.requestedQty - b.requestedQty;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [updateRequests, userId, requestStatusFilter, requestSearchTerm, requestSortBy]);

  const pendingRequests = myRequests.filter(req => req.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.heading}>My Inventory Copy</Text>
          <Text style={styles.subtitle}>Track original vs current quantities and inspect change logs.</Text>
          <View style={styles.quickStats}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{myInventory.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending Updates</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('DPShadowInventory')}>
            <Text style={styles.primaryActionText}>Open Shadow Inventory</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Recent Update Requests</Text>
          <Text style={styles.subtitle}>Latest request statuses from warehouse review queue.</Text>

          <TextInput
            value={requestSearchTerm}
            onChangeText={text => dispatch(setDPInventoryRequestSearchTerm(text))}
            placeholder="Search by item or reason"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            {STATUS_FILTERS.map(status => {
              const active = requestStatusFilter === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => dispatch(setDPInventoryRequestStatusFilter(status))}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{status}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            {REQUEST_SORTS.map(sort => {
              const active = requestSortBy === sort.key;
              return (
                <TouchableOpacity
                  key={sort.key}
                  style={[styles.filterChip, active && styles.sortChipActive]}
                  onPress={() => dispatch(setDPInventoryRequestSortBy(sort.key))}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{sort.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {myRequests.slice(0, 4).map(req => (
            <View key={req.id} style={styles.row}>
              <View>
                <Text style={styles.rowTitle}>{req.itemName}</Text>
                <Text style={styles.requestMeta}>Requested qty: {req.requestedQty}</Text>
              </View>
              <Text
                style={[
                  styles.requestStatus,
                  req.status === 'approved'
                    ? styles.statusApproved
                    : req.status === 'rejected'
                      ? styles.statusRejected
                      : styles.statusPending,
                ]}
              >
                {req.status}
              </Text>
            </View>
          ))}
          {!!myRequests.length && (
            <Text style={styles.resultsHint}>Showing {Math.min(4, myRequests.length)} of {myRequests.length} matching requests.</Text>
          )}
          {!myRequests.length && <Text style={styles.empty}>No inventory requests found.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: typography.fontFamily,
  },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  section: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  quickStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryActionText: {
    color: colors.white,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  rowValue: {
    color: colors.secondary,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  filtersRow: {
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    fontFamily: typography.fontFamily,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  requestMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  requestStatus: {
    textTransform: 'capitalize',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: typography.fontFamily,
  },
  statusApproved: { color: '#16A34A' },
  statusRejected: { color: '#DC2626' },
  statusPending: { color: '#D97706' },
  resultsHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  empty: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
});

export default DPInventoryScreen;
