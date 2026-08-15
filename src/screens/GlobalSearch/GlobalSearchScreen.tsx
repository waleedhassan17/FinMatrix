import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SectionList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  selectSearchQuery, selectSearchResults, selectIsSearching, selectSearchError, selectRecentSearches,
  setQuery, clearSearch, addRecentSearch, removeRecentSearch, clearRecentSearches,
  performSearch, MIN_QUERY_LENGTH,
} from './globalSearchSlice';
import { selectFeatures, selectUser } from '../Auth/authSlice';
import { isFeatureVisible } from '../../utils/featureGates';
import type { SearchResult, SearchModule } from '../../models/auditModel';
import { MODULE_COLORS, SEARCH_MODULES } from '../../models/auditModel';

const P = {
  brand: '#059669',
  brandLight: '#ECFDF5',
  pageBg: '#F6F8FB',
  card: '#FFFFFF',
  text: '#1E293B',
  sub: '#94A3B8',
  divider: '#E2E8F0',
};

type SearchNav = NavigationProp<Record<string, object | undefined>>;

const GlobalSearchScreen: React.FC = () => {
  const nav = useNavigation<SearchNav>();
  const dispatch = useAppDispatch();
  const query = useAppSelector(selectSearchQuery);
  const results = useAppSelector(selectSearchResults);
  const searching = useAppSelector(selectIsSearching);
  const searchError = useAppSelector(selectSearchError);
  const recentSearches = useAppSelector(selectRecentSearches);
  const features = useAppSelector(selectFeatures);
  const companyType = useAppSelector(selectUser)?.companyType;
  // Three-tier model: only mention — and only show — inventory when the tier
  // can actually open an inventory screen.
  const showInventory = isFeatureVisible('inventory', features, companyType);
  const searchPlaceholder = showInventory
    ? 'Search customers, invoices, inventory…'
    : 'Search customers, invoices, bills…';
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      // Drop a pending debounce with the screen, so a keystroke made on the
      // way out cannot fire a search into an unmounted screen.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      dispatch(clearSearch());
    };
  }, [dispatch]);

  const handleChangeText = useCallback((text: string) => {
    dispatch(setQuery(text));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim().length >= MIN_QUERY_LENGTH) {
        dispatch(performSearch(text));
      }
    }, 300);
  }, [dispatch]);

  // Results are opened across tab stacks (an invoice lives in
  // TransactionsStack, a customer in MoreStack), so each one carries the
  // stack that owns its detail screen.
  const handleTapResult = useCallback((item: SearchResult) => {
    // Record the query, not the row title: tapping a recent search should
    // reproduce the search the user actually ran.
    const term = query.trim();
    if (term.length >= MIN_QUERY_LENGTH) dispatch(addRecentSearch(term));
    nav.navigate(item.stack, { screen: item.routeName, params: item.routeParams });
  }, [dispatch, nav, query]);

  const handleRecentTap = useCallback((term: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dispatch(setQuery(term));
    dispatch(performSearch(term));
  }, [dispatch]);

  const handleClear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    dispatch(clearSearch());
    inputRef.current?.focus();
  }, [dispatch]);

  const handleRetry = useCallback(() => {
    if (query.trim().length >= MIN_QUERY_LENGTH) dispatch(performSearch(query));
  }, [dispatch, query]);

  const handleRemoveRecent = useCallback((term: string) => {
    dispatch(removeRecentSearch(term));
  }, [dispatch]);

  const handleClearRecents = useCallback(() => {
    dispatch(clearRecentSearches());
  }, [dispatch]);

  /* Group results by module, in a fixed module order so sections never
     reshuffle between searches. Inventory hits are dropped for tiers that
     cannot open an inventory screen — the server already omits them, this is
     the client-side belt to its braces. */
  const sections = useMemo(() => {
    const visible = (Array.isArray(results) ? results : []).filter(
      r => r.module !== 'Inventory' || showInventory,
    );
    const groups = new Map<SearchModule, SearchResult[]>();
    for (const r of visible) {
      const bucket = groups.get(r.module);
      if (bucket) bucket.push(r);
      else groups.set(r.module, [r]);
    }
    return SEARCH_MODULES.filter(m => groups.has(m)).map(m => ({ title: m, data: groups.get(m) as SearchResult[] }));
  }, [results, showInventory]);

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const resultCount = sections.reduce((n, sec) => n + sec.data.length, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Search Bar */}
      <View style={s.searchBar}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={P.text} />
        </TouchableOpacity>
        <View style={s.inputWrap}>
          <Feather name="search" size={16} color={P.sub} />
          <TextInput
            ref={inputRef}
            style={s.input}
            placeholder={searchPlaceholder}
            placeholderTextColor={P.sub}
            value={query}
            onChangeText={handleChangeText}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={16} color={P.sub} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Recent searches — shown until the query is long enough to search */}
      {!hasQuery && (
        <View style={s.recentSection}>
          <View style={s.recentHeader}>
            <Text style={s.recentTitle}>Recent Searches</Text>
            {recentSearches.length > 0 && (
              <TouchableOpacity
                onPress={handleClearRecents}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentSearches.length === 0 ? (
            <Text style={s.recentEmptyText}>
              {query.length > 0
                ? `Keep typing — searches start at ${MIN_QUERY_LENGTH} characters.`
                : 'No recent searches'}
            </Text>
          ) : (
            recentSearches.map(term => (
              <View key={term} style={s.recentRow}>
                <TouchableOpacity style={s.recentTap} onPress={() => handleRecentTap(term)}>
                  <Feather name="clock" size={14} color={P.sub} />
                  <Text style={s.recentText} numberOfLines={1}>{term}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemoveRecent(term)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={14} color={P.sub} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* Results — a failed search reads differently from an empty one, and
          a refresh keeps the results already on screen rather than blanking. */}
      {hasQuery && (
        searchError && !searching ? (
          <View style={s.stateWrap}>
            <Feather name="alert-circle" size={36} color={P.divider} />
            <Text style={s.stateTitle}>Search unavailable</Text>
            <Text style={s.stateText}>{searchError}</Text>
            <TouchableOpacity style={s.retryBtn} activeOpacity={0.8} onPress={handleRetry}>
              <Feather name="refresh-cw" size={14} color={P.card} />
              <Text style={s.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : searching && resultCount === 0 ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="small" color={P.brand} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={
              resultCount > 0 ? (
                <Text style={s.resultCount}>
                  {resultCount} {resultCount === 1 ? 'result' : 'results'}
                  {searching ? ' · updating…' : ''}
                </Text>
              ) : null
            }
            renderSectionHeader={({ section }) => {
              const mc = MODULE_COLORS[section.title as SearchModule];
              return (
                <View style={s.sectionHeader}>
                  <View style={[s.moduleBadge, { backgroundColor: mc?.bg ?? P.pageBg }]}>
                    <Text style={[s.moduleBadgeText, { color: mc?.fg ?? P.sub }]}>{section.title}</Text>
                  </View>
                  <Text style={s.sectionCount}>{section.data.length}</Text>
                </View>
              );
            }}
            renderItem={({ item }) => {
              const mc = MODULE_COLORS[item.module];
              return (
                <TouchableOpacity
                  style={s.resultCard}
                  activeOpacity={0.6}
                  onPress={() => handleTapResult(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.module}: ${item.title}. ${item.subtitle}`}
                >
                  <View style={[s.resultDot, { backgroundColor: mc?.fg ?? P.sub }]} />
                  <View style={s.resultContent}>
                    <Text style={s.resultTitle} numberOfLines={1}>{item.title}</Text>
                    {!!item.subtitle && <Text style={s.resultSub} numberOfLines={1}>{item.subtitle}</Text>}
                  </View>
                  <Feather name="chevron-right" size={16} color={P.sub} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={s.stateWrap}>
                <Feather name="search" size={40} color={P.divider} />
                <Text style={s.stateText}>No results for “{query.trim()}”</Text>
              </View>
            }
          />
        )
      )}

    </SafeAreaView>
  );
};

export default GlobalSearchScreen;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: P.pageBg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: P.card,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.pageBg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  input: {
    flex: 1,
    ...THEME.typography.h4,
    color: P.text,
    padding: 0,
  },
  loadingWrap: { paddingVertical: spacing.lg, alignItems: 'center' },
  recentSection: { padding: spacing.md },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recentTitle: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: P.sub,
    letterSpacing: 0.5,
  },
  clearAllText: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: P.brand,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  recentTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentText: { ...THEME.typography.bodyMd, color: P.text },
  recentEmptyText: {
    ...THEME.typography.bodyMd,
    color: P.sub,
    paddingVertical: 10,
  },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  moduleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moduleBadgeText: { ...THEME.typography.labelMd, fontWeight: '700' },
  sectionCount: { ...THEME.typography.caption, color: P.sub },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.card,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: 6,
    ...shadows.small,
  },
  resultDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  resultContent: { flex: 1 },
  resultTitle: { ...THEME.typography.h4, color: P.text },
  resultSub: { ...THEME.typography.caption, color: P.sub, marginTop: 2 },
  resultCount: { ...THEME.typography.caption, color: P.sub, marginBottom: spacing.xs },
  stateWrap: { alignItems: 'center', marginTop: 80, paddingHorizontal: spacing.lg },
  stateTitle: { ...THEME.typography.h4, color: P.text, marginTop: spacing.sm },
  stateText: { ...THEME.typography.bodyMd, color: P.sub, marginTop: spacing.xs, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  retryText: { ...THEME.typography.bodySm, fontWeight: '700', color: P.card },
});
