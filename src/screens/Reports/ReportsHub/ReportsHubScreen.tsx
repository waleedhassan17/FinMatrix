import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  HUB_TODAY_KEYS,
  fetchHubToday,
  selectHubToday,
  selectVisibleReportCategories,
} from './reportsHubSlice';
import TodayRow from './TodayRow';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import { ReportContainer, ReportHeader, EmptyBlock } from '../../../components/reports/ReportUI';
import { HubRow, HubSection, HubSectionLabel, hubContentStyle } from '../../../components/shared/HubList';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

// One icon per report, so a report row has the same anatomy as a row on the
// Transactions and More hubs. Keyed by the hub item's key.
const REPORT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  pl: 'trending-up',
  bs: 'layers',
  tb: 'columns',
  cf: 'repeat',
  gl: 'book',
  budgets: 'target',
  analytics: 'pie-chart',
  'ar-aging': 'arrow-down-left',
  'ap-aging': 'arrow-up-right',
  'inv-valuation': 'package',
  'delivery-daily': 'calendar',
  'delivery-performance': 'activity',
};

const reportIcon = (key: string): keyof typeof Feather.glyphMap => REPORT_ICONS[key] ?? 'file-text';

const ReportsHubScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectVisibleReportCategories);
  const today = useAppSelector(selectHubToday);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Today's figures are refreshed each time the hub comes back into view:
  // they are the reason to glance at it.
  const loadToday = useCallback(
    () => Promise.all(HUB_TODAY_KEYS.map(k => dispatch(fetchHubToday(k)))),
    [dispatch],
  );
  useFocusEffect(
    useCallback(() => {
      loadToday();
    }, [loadToday]),
  );
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadToday();
    setRefreshing(false);
  }, [loadToday]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map(c => ({
        ...c,
        items: c.items.filter(
          i =>
            i.title.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q),
        ),
      }))
      .filter(c => c.items.length > 0);
  }, [categories, search]);

  const handlePress = useCallback(
    (item: { title: string; target: string }) => navigation.navigate(item.target as any),
    [navigation],
  );

  return (
    <ReportContainer>
      {/* No header actions: the download and filter icons that used to sit here
          had no onPress at all — they were decoration that looked like
          function. A control that does nothing is worse than no control. */}
      <ReportHeader
        title="Reports"
        subtitle="Financial & operations reporting"
      />

      <ScrollView
        contentContainerStyle={hubContentStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} tintColor={THEME.colors.primary} />
        }
      >
        {/* Today, before any report */}
        {!search ? (
          <View>
            <HubSectionLabel title="Today" />
            <TodayRow
              today={today}
              onOpen={(target, params) => navigation.navigate(target as any, params as any)}
              onRetry={key => dispatch(fetchHubToday(key))}
              canOpen={target => !!navigation.getState()?.routeNames?.includes(target as never)}
            />
          </View>
        ) : null}

        {/* Search */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={THEME.colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reports…"
            placeholderTextColor={THEME.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x-circle" size={16} color={THEME.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <EmptyBlock icon="search" title={`No reports match "${search}"`} />
          </View>
        )}

        {filtered.map(category => (
          <HubSection key={category.key} title={category.title}>
            {category.items.map((item, idx) => (
              <HubRow
                key={item.key}
                icon={reportIcon(item.key)}
                title={item.title}
                subtitle={item.description}
                onPress={() => handlePress(item)}
                last={idx === category.items.length - 1}
              />
            ))}
          </HubSection>
        ))}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: THEME.colors.border,
    paddingHorizontal: 12,
    height: 44,
    ...THEME.shadows.xs,
  },
  searchInput: { flex: 1, ...THEME.typography.bodyMd, color: THEME.colors.textPrimary, paddingVertical: 0 },

  emptyWrap: { paddingTop: 16 },
});

export default ReportsHubScreen;
