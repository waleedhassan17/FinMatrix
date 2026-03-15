import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { colors, spacing, typography, borderRadius } from '../../../../theme';
import type { DPProfileStackParamList } from '../../../../navigators/stacks/DPProfileStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUser } from '../../../Auth/authSlice';
import { selectDeliveries } from '../../Admin/AssignDeliveries/deliverySlice';
import {
  selectDPHistoryState,
  setHistoryStatusFilter,
  setHistoryDateFilter,
  setHistoryDatePreset,
  setHistoryDatePickerOpen,
  nextHistoryPage,
  prevHistoryPage,
} from './dpHistorySlice';

type Props = NativeStackScreenProps<DPProfileStackParamList, 'DPHistory'>;

const FILTERS: Array<'all' | 'delivered' | 'failed' | 'returned'> = ['all', 'delivered', 'failed', 'returned'];
const DATE_PRESETS: Array<{ key: 'all' | 'today' | 'last_7_days' | 'this_month' | 'custom'; label: string }> = [
  { key: 'all', label: 'All Dates' },
  { key: 'today', label: 'Today' },
  { key: 'last_7_days', label: 'Last 7 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'custom', label: 'Pick Date' },
];

const DPHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const deliveries = useAppSelector(selectDeliveries);
  const history = useAppSelector(selectDPHistoryState);
  const userId = user?.uid ?? 'dp_002';

  const filtered = useMemo(() => {
    let list = deliveries.filter(d => d.assignedTo === userId && ['delivered', 'failed', 'returned'].includes(d.status));
    if (history.statusFilter !== 'all') {
      list = list.filter(d => d.status === history.statusFilter);
    }

    if (history.datePreset === 'today') {
      const today = dayjs().format('YYYY-MM-DD');
      list = list.filter(d => d.scheduledDate.startsWith(today));
    } else if (history.datePreset === 'last_7_days') {
      const minDate = dayjs().subtract(6, 'day').startOf('day');
      const maxDate = dayjs().endOf('day');
      list = list.filter(d => {
        const dt = dayjs(d.scheduledDate);
        return dt.isAfter(minDate) && dt.isBefore(maxDate);
      });
    } else if (history.datePreset === 'this_month') {
      const monthPrefix = dayjs().format('YYYY-MM');
      list = list.filter(d => d.scheduledDate.startsWith(monthPrefix));
    } else if (history.dateFilter.trim()) {
      list = list.filter(d => d.scheduledDate.includes(history.dateFilter.trim()));
    }

    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [deliveries, userId, history.statusFilter, history.dateFilter, history.datePreset]);

  const pickerDate = history.dateFilter ? dayjs(history.dateFilter).toDate() : new Date();

  const onSelectPreset = (preset: 'all' | 'today' | 'last_7_days' | 'this_month' | 'custom') => {
    dispatch(setHistoryDatePreset(preset));
    if (preset === 'custom') {
      dispatch(setHistoryDatePickerOpen(true));
    }
  };

  const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    dispatch(setHistoryDatePickerOpen(false));
    if (event.type === 'set' && selectedDate) {
      dispatch(setHistoryDateFilter(dayjs(selectedDate).format('YYYY-MM-DD')));
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / history.pageSize));
  const page = Math.min(history.page, totalPages);
  const start = (page - 1) * history.pageSize;
  const paged = filtered.slice(start, start + history.pageSize);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>Back</Text></TouchableOpacity>
        <Text style={styles.title}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filtersWrap}>
        <TextInput
          value={history.dateFilter}
          onChangeText={text => {
            dispatch(setHistoryDatePreset(text.trim() ? 'custom' : 'all'));
            dispatch(setHistoryDateFilter(text));
          }}
          placeholder="Filter by date (YYYY-MM-DD)"
          placeholderTextColor="#94A3B8"
          style={styles.dateInput}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATE_PRESETS.map(preset => {
            const active = history.datePreset === preset.key;
            return (
              <TouchableOpacity
                key={preset.key}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => onSelectPreset(preset.key)}
              >
                <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>{preset.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map(f => {
            const active = history.statusFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => dispatch(setHistoryStatusFilter(f))}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {paged.length === 0 && <Text style={styles.empty}>No history records found.</Text>}
        {paged.map(d => (
          <View key={d.id} style={styles.card}>
            <Text style={styles.ref}>{d.referenceNo}</Text>
            <Text style={styles.meta}>{d.customerName} • {d.address ?? d.zone}</Text>
            <Text style={styles.meta}>Status: {d.status.replace('_', ' ')} • {new Date(d.updatedAt).toLocaleString()}</Text>
          </View>
        ))}

        <View style={styles.pagination}>
          <TouchableOpacity style={styles.pageBtn} onPress={() => dispatch(prevHistoryPage())}>
            <Text style={styles.pageBtnText}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.pageText}>Page {page} / {totalPages}</Text>
          <TouchableOpacity style={styles.pageBtn} onPress={() => dispatch(nextHistoryPage())}>
            <Text style={styles.pageBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {history.isDatePickerOpen && (
        <DateTimePicker
          mode="date"
          value={pickerDate}
          display="default"
          onChange={onPickerChange}
          maximumDate={new Date()}
        />
      )}
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
  filtersWrap: { padding: spacing.md, gap: spacing.sm },
  dateInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  dateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  dateChipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  dateChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dateChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ref: { ...typography.small, color: colors.textPrimary, fontWeight: '700' },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { ...typography.caption, color: colors.textLight },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  pageBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pageBtnText: { ...typography.caption, color: colors.white, fontWeight: '700' },
  pageText: { ...typography.caption, color: colors.textSecondary },
});

export default DPHistoryScreen;
