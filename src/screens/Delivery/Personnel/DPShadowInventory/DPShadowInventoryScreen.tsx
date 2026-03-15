import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../../../theme';
import type { DPInventoryStackParamList } from '../../../../navigators/stacks/DPInventoryStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUser } from '../../../Auth/authSlice';
import { selectInventoryUpdateRequests } from '../../Admin/AssignDeliveries/deliverySlice';
import { shadowInventoryRecords } from '../../../../dummy-data/shadowInventory';
import {
  openChangeLog,
  closeChangeLog,
  selectShadowInventoryUI,
  setShadowInventorySearchTerm,
  setShadowInventorySortBy,
} from './dpShadowInventorySlice';
import CustomButton from '../../../../Custom-Components/CustomButton';

type Props = NativeStackScreenProps<DPInventoryStackParamList, 'DPShadowInventory'>;

const STATUS_COLORS: Record<string, string> = {
  synced: '#16A34A',
  pending: '#D97706',
  rejected: '#DC2626',
};

const SORT_OPTIONS = [
  { key: 'name_asc', label: 'Name A-Z' },
  { key: 'name_desc', label: 'Name Z-A' },
  { key: 'qty_low', label: 'Qty Low-High' },
  { key: 'qty_high', label: 'Qty High-Low' },
  { key: 'changes_high', label: 'Most Changes' },
] as const;

const DPShadowInventoryScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const requests = useAppSelector(selectInventoryUpdateRequests);
  const { selectedItemId, showChangeLog, searchTerm, sortBy } = useAppSelector(selectShadowInventoryUI);
  const userId = user?.uid ?? 'dp_002';

  const items = useMemo(() => {
    const filtered = shadowInventoryRecords
      .filter(item => item.personnelId === userId)
      .filter(item => {
        if (!searchTerm.trim()) {
          return true;
        }
        const text = searchTerm.trim().toLowerCase();
        return item.itemName.toLowerCase().includes(text) || item.itemId.toLowerCase().includes(text);
      });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_desc':
          return b.itemName.localeCompare(a.itemName);
        case 'qty_low':
          return a.currentQty - b.currentQty;
        case 'qty_high':
          return b.currentQty - a.currentQty;
        case 'changes_high':
          return b.changesToday.length - a.changesToday.length;
        case 'name_asc':
        default:
          return a.itemName.localeCompare(b.itemName);
      }
    });

    return sorted;
  }, [searchTerm, sortBy, userId]);

  const selectedItem = items.find(i => i.id === selectedItemId);

  const myRequests = useMemo(
    () => requests.filter(r => r.personnelId === userId).slice(0, 5),
    [requests, userId],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>Back</Text></TouchableOpacity>
        <Text style={styles.title}>My Inventory Copy</Text>
        <TouchableOpacity onPress={() => Alert.alert('Shadow Inventory', 'This is your local copy used for delivery execution before sync approval.')}> 
          <Text style={styles.info}>i</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <TextInput
            value={searchTerm}
            onChangeText={text => dispatch(setShadowInventorySearchTerm(text))}
            placeholder="Search by item name or item code"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortWrap}>
            {SORT_OPTIONS.map(option => {
              const active = sortBy === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  onPress={() => dispatch(setShadowInventorySortBy(option.key))}
                >
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          {items.length === 0 && <Text style={styles.empty}>No inventory items match your search.</Text>}
          {items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemRow}
              onPress={() => dispatch(openChangeLog(item.id))}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemMeta}>Original: {item.originalQty} | Current: {item.currentQty}</Text>
                <Text style={styles.itemMeta}>Changes: {item.changesToday.length}</Text>
              </View>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <CustomButton
          title="Submit Inventory Update"
          onPress={() => Alert.alert('Submitted', 'Inventory update request queued for warehouse review.')}
          fullWidth
        />

        <View style={styles.card}>
          <Text style={styles.subhead}>Submitted Requests</Text>
          {myRequests.length === 0 && <Text style={styles.empty}>No submitted requests yet.</Text>}
          {myRequests.map(req => (
            <View key={req.id} style={styles.reqRow}>
              <Text style={styles.reqItem}>{req.itemName} x{req.requestedQty}</Text>
              <Text style={[styles.reqStatus, { color: STATUS_COLORS[req.status] ?? colors.textSecondary }]}>{req.status}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showChangeLog} transparent animationType="slide" onRequestClose={() => dispatch(closeChangeLog())}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedItem?.itemName ?? 'Change Log'}</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {(selectedItem?.changesToday ?? []).map(ch => (
                <View key={ch.id} style={styles.changeRow}>
                  <Text style={styles.changeMain}>{new Date(ch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {ch.delta > 0 ? `+${ch.delta}` : ch.delta}</Text>
                  <Text style={styles.changeSub}>{ch.reason}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => dispatch(closeChangeLog())}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { ...typography.small, color: colors.primary, fontWeight: '700' },
  title: { ...typography.h4, color: colors.textPrimary },
  info: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#E2E8F0',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  sortWrap: {
    marginTop: spacing.sm,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
    backgroundColor: colors.white,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { ...typography.small, color: colors.textPrimary, fontWeight: '700' },
  itemMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  status: { ...typography.caption, textTransform: 'capitalize', fontWeight: '700' },
  subhead: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  reqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  reqItem: { ...typography.caption, color: colors.textPrimary },
  reqStatus: { ...typography.caption, textTransform: 'capitalize', fontWeight: '700' },
  empty: { ...typography.caption, color: colors.textLight },
  modalBackdrop: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.sm },
  changeRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  changeMain: { ...typography.small, color: colors.textPrimary, fontWeight: '700' },
  changeSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  closeBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  closeBtnText: { ...typography.small, color: colors.white, fontWeight: '700' },
});

export default DPShadowInventoryScreen;
