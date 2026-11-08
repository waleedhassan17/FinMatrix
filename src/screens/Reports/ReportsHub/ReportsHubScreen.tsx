import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
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
import {
  ReportContainer,
  ReportHeader,
  SectionCard,
  EmptyBlock
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  financial: 'bar-chart-2',
  ar: 'arrow-down-left',
  inventory: 'package',
  sales: 'trending-up',
  delivery: 'truck'
};

const getCatIcon = (key: string): keyof typeof Feather.glyphMap => CATEGORY_ICONS[key] ?? 'file-text';

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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} tintColor={THEME.colors.primary} />
        }
      >
        {/* Today, before any report */}
        {!search ? (
          <View style={styles.today}>
            <Text style={styles.todayTitle}>Today</Text>
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
          <SectionCard
            key={category.key}
            title={category.title}
            subtitle={`${category.items.length} report${category.items.length !== 1 ? 's' : ''}`}
            icon={getCatIcon(category.key)}
            style={styles.catCard}
          >
            {/* A plain grouped list: what the report is, what it answers, and
                a chevron. Every report is always available, so a "Ready" badge
                on each row said nothing, and the coloured bar beside every row
                was decoration that competed with the figures above. */}
            <View style={styles.itemList}>
              {category.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.6}
                  style={styles.itemRow}
                  onPress={() => handlePress(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}. ${item.description}`}
                >
                  {/* The rule starts at the text, not the card edge. */}
                  <View style={[styles.itemContent, idx < category.items.length - 1 && styles.itemContentBordered]}>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={THEME.colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  today: { gap: THEME.spacing.xs, marginBottom: THEME.spacing.sm },
  todayTitle: { ...THEME.typography.overline, color: THEME.colors.textTertiary },
  content: { padding: THEME.spacing.md, gap: THEME.spacing.sm + 2, paddingBottom: THEME.spacing.xl },

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

  emptyWrap: { paddingTop: 40 },
  catCard: { marginTop: 0 },

  itemList: { marginHorizontal: -THEME.spacing.md, marginVertical: -THEME.spacing.md },
  itemRow: { paddingLeft: THEME.spacing.md },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    minHeight: 56,
    paddingVertical: THEME.spacing.sm,
    paddingRight: THEME.spacing.md,
  },
  itemContentBordered: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.borderLight },
  itemText: { flex: 1 },
  itemTitle: { ...THEME.typography.labelLg, color: THEME.colors.textPrimary },
  itemSub: { ...THEME.typography.caption, color: THEME.colors.textTertiary, marginTop: 2 }
});

export default ReportsHubScreen;
