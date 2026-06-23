import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { fetchVendorCredits, selectVendorCreditState, setVendorCreditStatusFilter, type VendorCreditStatusFilter } from './vendorCreditSlice';
import { formatCurrency } from '../../utils/formatters';
import type { VendorCreditStatus } from '../../models/vendorCreditModel';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader, HeaderIconButton, Badge, EmptyBlock, LoadingBlock, ErrorBlock, ACCENT } from '../../components/reports/ReportUI';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const rs = (n: number) => formatCurrency(n, 'Rs ');
const STATUS_COLOR: Record<VendorCreditStatus, string> = {
  open: ACCENT.blue, applied: ACCENT.green, closed: ACCENT.violet, void: THEME.colors.textSecondary,
};
const FILTERS: { label: string; value: VendorCreditStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Applied', value: 'applied' },
  { label: 'Closed', value: 'closed' },
  { label: 'Void', value: 'void' },
];

const VendorCreditListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectVendorCreditState);
  const load = useCallback(() => {
    dispatch(fetchVendorCredits({ status: state.statusFilter === 'all' ? undefined : state.statusFilter }));
  }, [dispatch, state.statusFilter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ReportContainer>
      <ReportHeader 
        title="Vendor Credits" 
        subtitle="Returns & overcharges"
        onBack={() => navigation.goBack()}
        right={<HeaderIconButton icon="plus" onPress={() => navigation.navigate('VendorCreditForm', {})} />} 
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
        {FILTERS.map(f => {
          const active = state.statusFilter === f.value;
          return (
            <TouchableOpacity 
              key={f.value} 
              onPress={() => dispatch(setVendorCreditStatusFilter(f.value))}
              activeOpacity={0.7}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={state.isLoading} onRefresh={load} tintColor={THEME.colors.primary} />}>
        {state.isLoading && state.vendorCredits.length === 0 && <LoadingBlock label="Loading…" />}
        {!!state.error && <ErrorBlock message={state.error} onRetry={load} />}
        {!state.isLoading && state.vendorCredits.length === 0 && !state.error && (
          <EmptyBlock icon="corner-up-left" title="No vendor credits" hint="Tap + to record a credit from a vendor." />
        )}
        {state.vendorCredits.map(c => (
          <TouchableOpacity key={c.id} style={styles.card} activeOpacity={0.7}
            onPress={() => navigation.navigate('VendorCreditDetail', { vendorCreditId: c.id })}>
            <View style={styles.cardTop}>
              <Text style={styles.cardNumber}>{c.vendorCreditNumber}</Text>
              <Badge label={c.status} color={STATUS_COLOR[c.status]} dot />
            </View>
            <Text style={styles.cardCustomer}>{c.vendorName || 'Vendor'}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.cardDate}>{c.date} · {rs(c.balance)} available</Text>
              <Text style={styles.cardTotal}>{rs(c.total)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  tabsScroll: { minHeight: 44, flexGrow: 0 },
  tabsRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, alignItems: 'center', gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border },
  tabActive: { backgroundColor: THEME.colors.primary, borderColor: THEME.colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: THEME.colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: THEME.colors.surface },
  content: { padding: 16, paddingTop: 4, gap: 10 },
  card: { backgroundColor: THEME.colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: THEME.colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNumber: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, fontWeight: '700' },
  cardCustomer: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, marginTop: 4 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardDate: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  cardTotal: { ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, fontWeight: '800' },
});

export default VendorCreditListScreen;
