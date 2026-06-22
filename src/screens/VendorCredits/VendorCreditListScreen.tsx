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
const FILTERS: VendorCreditStatusFilter[] = ['all', 'open', 'applied', 'closed', 'void'];

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
      <ReportHeader title="Vendor Credits" subtitle="Returns & overcharges"
        right={<HeaderIconButton icon="plus" onPress={() => navigation.navigate('VendorCreditForm', {})} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => dispatch(setVendorCreditStatusFilter(f))}
            style={[styles.chip, state.statusFilter === f && styles.chipActive]}>
            <Text style={[styles.chipText, state.statusFilter === f && styles.chipTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
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

export default VendorCreditListScreen;
