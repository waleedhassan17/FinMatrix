import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { colors, spacing, borderRadius } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppSelector } from '../../../hooks/useReduxHooks';
import { selectReportCategories } from './reportsHubSlice';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

/* ───────────────────── unified palette ───────────────────── */

const P = {
  brand: '#1B5E92',
  brandLight: '#EBF3FA',
  brandBorder: '#C8DCF0',

  pageBg: '#F6F8FB',
  cardBg: '#FFFFFF',
  headerBg: '#FFFFFF',
  surfaceMuted: '#F1F4F8',

  textPrimary: '#1A2636',
  textSecondary: '#5A6D80',
  textTertiary: '#8A9BB0',
  textOnBrand: '#1B5E92',

  borderDefault: '#E3E9F0',
  borderLight: '#EDF1F6',
  borderCard: '#E0E7EF',

  readyDot: '#1B5E92',
  readyBg: '#EBF3FA',
  readyBorder: '#C8DCF0',

  accentReady: '#1B5E92',
};

/* ───────────────────── category icons ───────────────────── */

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  financial: 'bar-chart-2',
  ar: 'arrow-down-left',
  inventory: 'package',
  sales: 'trending-up',
  delivery: 'truck',
};

const getCatIcon = (key: string): keyof typeof Feather.glyphMap =>
  CATEGORY_ICONS[key] ?? 'file-text';

/* ───────────────────── component ───────────────────── */

const ReportsHubScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const categories = useAppSelector(selectReportCategories);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map(c => ({
        ...c,
        items: c.items.filter(
          i =>
            i.title.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q),
        ),
      }))
      .filter(c => c.items.length > 0);
  }, [categories, search]);

  const handlePress = useCallback(
    (item: { title: string; target: string }) => {
      navigation.navigate(item.target as any);
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Reports</Text>
              <Text style={styles.headerSub}>Financial &amp; operations reporting</Text>
            </View>
            <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
              <Feather name="download" size={16} color={P.brand} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
              <Feather name="sliders" size={16} color={P.brand} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Feather name="search" size={15} color={P.textTertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reports…"
              placeholderTextColor={P.textTertiary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x-circle" size={15} color={P.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Categories ── */}
        {filtered.length === 0 && (
          <View style={styles.emptyWrap}>
            <Feather name="search" size={24} color={P.textTertiary} />
            <Text style={styles.emptyText}>No reports match "{search}"</Text>
          </View>
        )}

        {filtered.map(category => (
          <View key={category.key} style={styles.card}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={styles.catIcon}>
                <Feather name={getCatIcon(category.key)} size={15} color={P.brand} />
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catTitle}>{category.title}</Text>
                <Text style={styles.catMeta}>
                  {category.items.length} report{category.items.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* Items */}
            {category.items.map((item, idx) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.6}
                style={[
                  styles.itemRow,
                  idx < category.items.length - 1 && styles.itemRowBordered,
                ]}
                onPress={() => handlePress(item)}
              >
                <View
                  style={[styles.itemAccent, { backgroundColor: P.accentReady }]}
                />
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSub}>View report</Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    { backgroundColor: P.readyBg, borderColor: P.readyBorder },
                  ]}
                >
                  <View
                    style={[styles.badgeDot, { backgroundColor: P.readyDot }]}
                  />
                  <Text style={[styles.badgeText, { color: P.textOnBrand }]}>
                    Ready
                  </Text>
                </View>

                <Feather
                  name="chevron-right"
                  size={16}
                  color={P.textTertiary}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ───────────────────── styles ───────────────────── */

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.pageBg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },

  /* Header */
  header: {
    backgroundColor: P.headerBg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.borderDefault,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    ...THEME.typography.h2,
    color: P.textPrimary,
  },
  headerSub: {
    ...THEME.typography.bodySm,
    marginTop: 2,
    color: P.textSecondary,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: P.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.brandBorder,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surfaceMuted,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.borderDefault,
    marginTop: spacing.sm + 2,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    ...THEME.typography.bodySm,
    flex: 1,
    color: P.textPrimary,
    paddingVertical: 0,
  },

  /* Card */
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: P.cardBg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.borderCard,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1A2636',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: P.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: P.brandBorder,
  },
  catInfo: { flex: 1 },
  catTitle: {
    ...THEME.typography.h5,
    color: P.textPrimary,
  },
  catMeta: {
    ...THEME.typography.caption,
    marginTop: 1,
    color: P.textTertiary,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: P.borderLight,
    marginHorizontal: 14,
  },

  /* Item */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
  },
  itemRowBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.borderLight,
  },
  itemAccent: { width: 3, alignSelf: 'stretch' },
  itemContent: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
  },
  itemTitle: {
    ...THEME.typography.bodySm,
    fontWeight: '500',
    color: P.textPrimary,
  },
  itemSub: {
    ...THEME.typography.caption,
    marginTop: 1,
    color: P.textTertiary,
  },

  /* Badge */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    gap: 4,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 0.2,
  },

  /* Empty */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    gap: 10,
  },
  emptyText: {
    ...THEME.typography.bodySm,
    color: P.textTertiary,
  },
});

export default ReportsHubScreen;