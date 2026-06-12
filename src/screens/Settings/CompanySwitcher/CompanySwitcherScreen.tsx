import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectActiveCompany, setActiveCompany } from '../../Auth/companySlice';
import { selectCompanies, selectSwitcherLoading, loadCompanies } from './companySwitcherSlice';
import type { CompanySwitcherItem } from '../../../network/settingsNetwork';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const P = {
  brand: '#059669',
  brandLight: '#ECFDF5',
  pageBg: '#F6F8FB',
  card: '#FFFFFF',
  text: '#1E293B',
  sub: '#94A3B8',
  divider: '#E2E8F0',
  active: '#059669',
  activeBg: '#ECFDF5',
};

const CompanySwitcherScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const companies = useAppSelector(selectCompanies);
  const loading = useAppSelector(selectSwitcherLoading);
  const activeCompany = useAppSelector(selectActiveCompany);
  const activeId = activeCompany?.companyId ?? '';

  useEffect(() => { dispatch(loadCompanies()); }, [dispatch]);

  const handleSwitch = useCallback(
    (id: string) => {
      dispatch(setActiveCompany(id));
      Alert.alert('Switched', 'Active company changed.', [
        { text: 'OK', onPress: () => nav.goBack() },
      ]);
    },
    [dispatch, nav],
  );

  const handleLongPress = useCallback(
    (item: CompanySwitcherItem) => {
      Alert.alert(item.name, 'Choose an action', [
        { text: 'Switch', onPress: () => handleSwitch(item.companyId) },
        { text: 'Edit', onPress: () => nav.navigate('CompanyProfile') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [handleSwitch, nav],
  );

  const handleNewCompany = useCallback(() => {
    Alert.alert('New Company', 'Company creation wizard coming soon.');
  }, []);

  const renderCompany = ({ item }: { item: CompanySwitcherItem }) => {
    const isActive = item.companyId === activeId;
    return (
      <TouchableOpacity
        style={[s.companyCard, isActive && s.activeCard]}
        activeOpacity={0.6}
        onPress={() => handleSwitch(item.companyId)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={s.cardTop}>
          <View style={[s.companyIcon, isActive && { backgroundColor: P.activeBg }]}>
            <Feather name="briefcase" size={20} color={isActive ? P.active : P.brand} />
          </View>
          <View style={s.cardInfo}>
            <Text style={s.companyName}>{item.name}</Text>
            <Text style={s.companyIndustry}>{item.industry}</Text>
          </View>
          {isActive && (
            <View style={s.activeBadge}>
              <Feather name="check-circle" size={14} color={P.active} />
              <Text style={s.activeText}>Active</Text>
            </View>
          )}
        </View>
        <View style={s.cardBottom}>
          <View style={s.chip}>
            <Feather name="user" size={12} color={P.sub} />
            <Text style={s.chipText}>{item.role}</Text>
          </View>
          <View style={s.chip}>
            <Feather name="users" size={12} color={P.sub} />
            <Text style={s.chipText}>{item.memberCount} members</Text>
          </View>
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
        <Text style={s.headerTitle}>Companies</Text>
        <TouchableOpacity onPress={handleNewCompany}>
          <Feather name="plus" size={22} color={P.brand} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={companies}
        keyExtractor={i => i.companyId}
        renderItem={renderCompany}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Text style={s.empty}>Loading…</Text>
          ) : (
            <Text style={s.empty}>No companies found</Text>
          )
        }
        ListFooterComponent={
          <TouchableOpacity style={s.newBtn} activeOpacity={0.6} onPress={handleNewCompany}>
            <Feather name="plus-circle" size={20} color={P.brand} />
            <Text style={s.newBtnText}>New Company</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
};

export default CompanySwitcherScreen;

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
    fontFamily: THEME.typography.fontFamily,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 14,
    color: P.sub,
    fontFamily: THEME.typography.fontFamily,
  },
  companyCard: {
    backgroundColor: P.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: P.active,
    backgroundColor: '#FAFFFE',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: P.brandLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: P.text,
    fontFamily: THEME.typography.fontFamily,
  },
  companyIndustry: {
    fontSize: 13,
    color: P.sub,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.activeBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: P.active,
    fontFamily: THEME.typography.fontFamily,
  },
  cardBottom: {
    flexDirection: 'row',
    marginTop: 12,
    gap: spacing.sm,
    paddingLeft: 56,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.pageBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    color: P.sub,
    fontFamily: THEME.typography.fontFamily,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.brandLight,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    marginTop: spacing.sm,
    gap: 8,
    borderWidth: 1.5,
    borderColor: P.brand,
    borderStyle: 'dashed',
  },
  newBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: P.brand,
    fontFamily: THEME.typography.fontFamily,
  },
});
