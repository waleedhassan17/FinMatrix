import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  selectAuditEntries, selectAuditLoading,
  selectFilterUser, selectFilterModule, selectFilterAction,
  selectSelectedEntry,
  setFilterUser, setFilterModule, setFilterAction,
  setSelectedEntry, clearFilters, fetchAuditTrail,
} from './auditTrailSlice';
import type { AuditEntry, AuditModule, AuditAction } from '../../dummy-data/auditAndSearch';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const P = {
  brand: '#1B5E92',
  brandLight: '#EBF3FA',
  pageBg: '#F6F8FB',
  card: '#FFFFFF',
  text: '#1E293B',
  sub: '#94A3B8',
  divider: '#E2E8F0',
};

const ACTION_COLORS: Record<AuditAction, string> = {
  Created: '#059669',
  Updated: '#2563EB',
  Deleted: '#DC2626',
  Approved: '#7C3AED',
  Voided: '#D97706',
  'Logged In': '#64748B',
  Exported: '#0891B2',
};

const MODULE_OPTIONS: AuditModule[] = [
  'Invoices', 'Customers', 'Vendors', 'Inventory',
  'Banking', 'Payroll', 'Journal Entries', 'Settings', 'Users', 'Deliveries',
];

const ACTION_OPTIONS: AuditAction[] = [
  'Created', 'Updated', 'Deleted', 'Approved', 'Voided', 'Logged In', 'Exported',
];

const USER_OPTIONS = [
  { id: 'u-001', name: 'Ahmed Khan' },
  { id: 'u-002', name: 'Sara Malik' },
  { id: 'u-003', name: 'Bilal Hussain' },
  { id: 'u-004', name: 'Usman Raza' },
  { id: 'u-005', name: 'Fatima Noor' },
];

/* ─── Filter Chip Strip ─── */
interface ChipStripProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}
function ChipStrip<T extends string>({ label, options, selected, onSelect }: ChipStripProps<T>) {
  return (
    <View style={s.chipStrip}>
      <Text style={s.chipLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {options.map(o => {
          const active = o.value === selected;
          return (
            <TouchableOpacity
              key={o.value}
              style={[s.chip, active && s.chipActive]}
              onPress={() => onSelect(active ? ('' as T) : o.value)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ─── Detail Modal ─── */
const DetailModal: React.FC<{ entry: AuditEntry | null; onClose: () => void }> = ({ entry, onClose }) => {
  if (!entry) return null;
  const renderJson = (obj: Record<string, unknown> | undefined, label: string) => {
    if (!obj) return <Text style={s.modalEmpty}>No {label.toLowerCase()} data</Text>;
    return (
      <View style={s.jsonBlock}>
        <Text style={s.jsonLabel}>{label}</Text>
        {Object.entries(obj).map(([k, v]) => (
          <View key={k} style={s.jsonRow}>
            <Text style={s.jsonKey}>{k}:</Text>
            <Text style={s.jsonVal}>{String(v)}</Text>
          </View>
        ))}
      </View>
    );
  };
  return (
    <Modal visible transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Audit Detail</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={P.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={s.modalMeta}>
              <Text style={s.modalMetaLabel}>User</Text>
              <Text style={s.modalMetaVal}>{entry.userName}</Text>
            </View>
            <View style={s.modalMeta}>
              <Text style={s.modalMetaLabel}>Action</Text>
              <Text style={[s.modalMetaVal, { color: ACTION_COLORS[entry.action] }]}>{entry.action}</Text>
            </View>
            <View style={s.modalMeta}>
              <Text style={s.modalMetaLabel}>Module</Text>
              <Text style={s.modalMetaVal}>{entry.module}</Text>
            </View>
            <View style={s.modalMeta}>
              <Text style={s.modalMetaLabel}>Timestamp</Text>
              <Text style={s.modalMetaVal}>{new Date(entry.timestamp).toLocaleString()}</Text>
            </View>
            <Text style={s.modalDesc}>{entry.description}</Text>
            <View style={s.divider} />
            {renderJson(entry.before, 'Before')}
            {renderJson(entry.after, 'After')}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Main Screen ─── */
const AuditTrailScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const entries = useAppSelector(selectAuditEntries);
  const loading = useAppSelector(selectAuditLoading);
  const filterUser = useAppSelector(selectFilterUser);
  const filterModule = useAppSelector(selectFilterModule);
  const filterAction = useAppSelector(selectFilterAction);
  const selectedEntry = useAppSelector(selectSelectedEntry);

  useEffect(() => { dispatch(fetchAuditTrail()); }, [dispatch]);

  const handleRefresh = useCallback(() => { dispatch(fetchAuditTrail()); }, [dispatch]);

  const applyFilter = useCallback(() => { dispatch(fetchAuditTrail()); }, [dispatch]);

  useEffect(() => { applyFilter(); }, [filterUser, filterModule, filterAction]);

  const userOpts = useMemo(() =>
    USER_OPTIONS.map(u => ({ value: u.id, label: u.name })),
    [],
  );
  const moduleOpts = useMemo(() =>
    MODULE_OPTIONS.map(m => ({ value: m, label: m })),
    [],
  );
  const actionOpts = useMemo(() =>
    ACTION_OPTIONS.map(a => ({ value: a, label: a })),
    [],
  );

  const activeFilterCount =
    (filterUser ? 1 : 0) + (filterModule ? 1 : 0) + (filterAction ? 1 : 0);

  const renderEntry = ({ item }: { item: AuditEntry }) => {
    const time = new Date(item.timestamp);
    const actionColor = ACTION_COLORS[item.action] ?? P.sub;
    return (
      <TouchableOpacity
        style={s.entryCard}
        activeOpacity={0.6}
        onPress={() => { dispatch(setSelectedEntry(item)); }}
      >
        <View style={s.entryTop}>
          <View style={[s.actionBadge, { backgroundColor: actionColor + '18' }]}>
            <Text style={[s.actionText, { color: actionColor }]}>{item.action}</Text>
          </View>
          <Text style={s.module}>{item.module}</Text>
        </View>
        <Text style={s.entryDesc} numberOfLines={2}>{item.description}</Text>
        <View style={s.entryBottom}>
          <View style={s.entryUser}>
            <Feather name="user" size={12} color={P.sub} />
            <Text style={s.entryUserText}>{item.userName}</Text>
          </View>
          <Text style={s.entryTime}>
            {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={P.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Audit Trail</Text>
        {activeFilterCount > 0 ? (
          <TouchableOpacity onPress={() => { dispatch(clearFilters()); }}>
            <Feather name="x-circle" size={20} color={P.brand} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 20 }} />
        )}
      </View>

      {/* Filters */}
      <View style={s.filterSection}>
        <ChipStrip label="User" options={userOpts} selected={filterUser} onSelect={v => { dispatch(setFilterUser(v)); }} />
        <ChipStrip label="Module" options={moduleOpts} selected={filterModule} onSelect={v => { dispatch(setFilterModule(v)); }} />
        <ChipStrip label="Action" options={actionOpts} selected={filterAction} onSelect={v => { dispatch(setFilterAction(v)); }} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={i => i.id}
        renderItem={renderEntry}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={P.brand} colors={[P.brand]} />
        }
        ListEmptyComponent={
          !loading ? <Text style={s.empty}>No audit entries match your filters</Text> : null
        }
      />

      <DetailModal entry={selectedEntry} onClose={() => { dispatch(setSelectedEntry(null)); }} />
    </SafeAreaView>
  );
};

export default AuditTrailScreen;

/* ─── styles ─── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.pageBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: P.card,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: P.text, fontFamily: THEME.typography.fontFamily },
  filterSection: {
    backgroundColor: P.card,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  chipStrip: { paddingLeft: spacing.md, marginTop: spacing.sm },
  chipLabel: { fontSize: 11, fontWeight: '600', color: P.sub, letterSpacing: 0.5, marginBottom: 4 },
  chipRow: { paddingRight: spacing.md, gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: P.pageBg,
    borderWidth: 1,
    borderColor: P.divider,
  },
  chipActive: { backgroundColor: P.brandLight, borderColor: P.brand },
  chipText: { fontSize: 12, color: P.sub, fontFamily: THEME.typography.fontFamily },
  chipTextActive: { color: P.brand, fontWeight: '600' },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 14, color: P.sub, fontFamily: THEME.typography.fontFamily },
  entryCard: {
    backgroundColor: P.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  entryTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  module: { fontSize: 12, fontWeight: '600', color: P.sub, fontFamily: THEME.typography.fontFamily },
  entryDesc: { fontSize: 14, color: P.text, lineHeight: 20, fontFamily: THEME.typography.fontFamily },
  entryBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  entryUser: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryUserText: { fontSize: 12, color: P.sub, fontFamily: THEME.typography.fontFamily },
  entryTime: { fontSize: 11, color: P.sub, fontFamily: THEME.typography.fontFamily },
  /* modal */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: P.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: P.text, fontFamily: THEME.typography.fontFamily },
  modalMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  modalMetaLabel: { fontSize: 13, color: P.sub, fontFamily: THEME.typography.fontFamily },
  modalMetaVal: { fontSize: 13, fontWeight: '600', color: P.text, fontFamily: THEME.typography.fontFamily },
  modalDesc: { fontSize: 14, color: P.text, marginVertical: spacing.sm, lineHeight: 20, fontFamily: THEME.typography.fontFamily },
  divider: { height: 1, backgroundColor: P.divider, marginVertical: spacing.sm },
  jsonBlock: { marginBottom: spacing.md },
  jsonLabel: { fontSize: 13, fontWeight: '700', color: P.brand, marginBottom: 6, fontFamily: THEME.typography.fontFamily },
  jsonRow: { flexDirection: 'row', paddingVertical: 3, paddingLeft: 8 },
  jsonKey: { fontSize: 12, fontWeight: '600', color: P.sub, width: 120, fontFamily: THEME.typography.fontFamily },
  jsonVal: { fontSize: 12, color: P.text, flex: 1, fontFamily: THEME.typography.fontFamily },
  modalEmpty: { fontSize: 13, color: P.sub, fontStyle: 'italic', fontFamily: THEME.typography.fontFamily },
});
