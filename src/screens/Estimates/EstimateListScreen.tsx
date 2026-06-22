import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchEstimates, selectEstimateState, setEstimateStatusFilter, setEstimateSearch, type EstimateStatusFilter } from './estimateSlice';
import { formatCurrency } from '../../utils/formatters';
import type { EstimateStatus } from '../../models/estimateModel';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import {
  ReportContainer, ReportHeader, HeaderIconButton, Badge, EmptyBlock, LoadingBlock, ErrorBlock, ACCENT,
} from '../../components/reports/ReportUI';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');

const STATUS_COLOR: Record<EstimateStatus, string> = {
  draft: THEME.colors.textSecondary, sent: ACCENT.blue, accepted: ACCENT.green,
  declined: ACCENT.red, converted: ACCENT.violet, expired: ACCENT.amber,
};
const FILTERS: EstimateStatusFilter[] = ['all', 'draft', 'sent', 'accepted', 'converted', 'declined'];

const EstimateListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectEstimateState);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    dispatch(fetchEstimates({
      status: state.statusFilter === 'all' ? undefined : state.statusFilter,
      search: state.searchQuery || undefined,
    }));
  }, [dispatch, state.statusFilter, state.searchQuery]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ReportContainer>
      <ReportHeader
        title="Estimates"
        subtitle="Quotes & proposals"
        right={<HeaderIconButton icon="plus" onPress={() => navigation.navigate('EstimateForm', {})} />}
      />
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={THEME.colors.textSecondary} />
        <TextInput
          style={styles.search}
          placeholder="Search estimates…"
          placeholderTextColor={THEME.colors.textSecondary}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => dispatch(setEstimateSearch(q))}
          returnKeyType="search"
        />
        {q.length > 0 && <TouchableOpacity onPress={() => { setQ(''); dispatch(setEstimateSearch('')); }}><Feather name="x" size={16} color={THEME.colors.textSecondary} /></TouchableOpacity>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => dispatch(setEstimateStatusFilter(f))}
            style={[styles.chip, state.statusFilter === f && styles.chipActive]}>
            <Text style={[styles.chipText, state.statusFilter === f && styles.chipTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={state.isLoading} onRefresh={load} tintColor={THEME.colors.primary} />}
      >
        {state.isLoading && state.estimates.length === 0 && <LoadingBlock label="Loading estimates…" />}
        {!!state.error && <ErrorBlock message={state.error} onRetry={load} />}
        {!state.isLoading && state.estimates.length === 0 && !state.error && (
          <EmptyBlock icon="file-text" title="No estimates yet" hint="Tap + to create your first quote." />
        )}
        {state.estimates.map(e => (
          <TouchableOpacity key={e.id} style={styles.card} activeOpacity={0.7}
            onPress={() => navigation.navigate('EstimateDetail', { estimateId: e.id })}>
            <View style={styles.cardTop}>
              <Text style={styles.cardNumber}>{e.estimateNumber}</Text>
              <Badge label={e.status} color={STATUS_COLOR[e.status]} dot />
            </View>
            <Text style={styles.cardCustomer}>{e.customerName || 'Customer'}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.cardDate}>{e.estimateDate}</Text>
              <Text style={styles.cardTotal}>{rs(e.total)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, paddingHorizontal: 12, height: 42, backgroundColor: THEME.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: THEME.colors.border },
  search: { flex: 1, ...THEME.typography.bodyMd, color: THEME.colors.textPrimary },
  chipsRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border },
  chipActive: { backgroundColor: THEME.colors.primary + '18', borderColor: THEME.colors.primary },
  chipText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  chipTextActive: { color: THEME.colors.primary, fontWeight: '700' },
  content: { padding: 16, paddingTop: 4, gap: 10 },
  card: { backgroundColor: THEME.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: THEME.colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNumber: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, fontWeight: '700' },
  cardCustomer: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, marginTop: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardDate: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  cardTotal: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, fontWeight: '800' },
});

export default EstimateListScreen;
