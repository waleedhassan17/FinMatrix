import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, SectionList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  selectSearchQuery, selectSearchResults, selectIsSearching, selectRecentSearches,
  setQuery, clearSearch, addRecentSearch, performSearch,
} from './globalSearchSlice';
import { selectFeatures, selectUser } from '../Auth/authSlice';
import { isFeatureVisible } from '../../utils/featureGates';
import type { SearchResult, SearchModule } from '../../models/auditModel';
import { MODULE_COLORS } from '../../models/auditModel';

const P = {
  brand: '#059669',
  brandLight: '#ECFDF5',
  pageBg: '#F6F8FB',
  card: '#FFFFFF',
  text: '#1E293B',
  sub: '#94A3B8',
  divider: '#E2E8F0',
};

const GlobalSearchScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const dispatch = useAppDispatch();
  const query = useAppSelector(selectSearchQuery);
  const results = useAppSelector(selectSearchResults);
  const searching = useAppSelector(selectIsSearching);
  const recentSearches = useAppSelector(selectRecentSearches);
  const features = useAppSelector(selectFeatures);
  const companyType = useAppSelector(selectUser)?.companyType;
  // Three-tier model: only mention inventory when the tier can search it.
  const searchPlaceholder = isFeatureVisible('inventory', features, companyType)
    ? 'Search customers, invoices, inventory…'
    : 'Search customers, invoices, bills…';
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { dispatch(clearSearch()); };
  }, [dispatch]);

  const handleChangeText = useCallback((text: string) => {
    dispatch(setQuery(text));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim().length >= 2) {
        dispatch(performSearch(text));
      }
    }, 300);
  }, [dispatch]);

  const handleTapResult = useCallback((item: SearchResult) => {
    dispatch(addRecentSearch(item.title));
    nav.navigate(item.routeName, item.routeParams);
  }, [dispatch, nav]);

  const handleRecentTap = useCallback((term: string) => {
    dispatch(setQuery(term));
    dispatch(performSearch(term));
  }, [dispatch]);

  /* group results by module */
  const sections = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!groups[r.module]) groups[r.module] = [];
      groups[r.module].push(r);
    });
    return Object.entries(groups).map(([title, data]) => ({ title: title as SearchModule, data }));
  }, [results]);

  const hasQuery = query.trim().length >= 2;

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
            <TouchableOpacity onPress={() => { dispatch(clearSearch()); }}>
              <Feather name="x" size={16} color={P.sub} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading */}
      {searching && (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={P.brand} />
        </View>
      )}

      {/* Recent Searches (when empty) */}
      {!hasQuery && !searching && (
        <View style={s.recentSection}>
          <Text style={s.recentTitle}>Recent Searches</Text>
          {recentSearches.map((term, idx) => (
            <TouchableOpacity key={idx} style={s.recentRow} onPress={() => handleRecentTap(term)}>
              <Feather name="clock" size={14} color={P.sub} />
              <Text style={s.recentText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results */}
      {hasQuery && !searching && (
        <SectionList
          sections={sections}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
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
              <TouchableOpacity style={s.resultCard} activeOpacity={0.6} onPress={() => handleTapResult(item)}>
                <View style={[s.resultDot, { backgroundColor: mc?.fg ?? P.sub }]} />
                <View style={s.resultContent}>
                  <Text style={s.resultTitle}>{item.title}</Text>
                  <Text style={s.resultSub}>{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={P.sub} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Feather name="search" size={40} color={P.divider} />
              <Text style={s.emptyText}>No results for "{query}"</Text>
            </View>
          }
        />
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
  recentTitle: {
    ...THEME.typography.bodySm,
    fontWeight: '600',
    color: P.sub,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: P.divider,
  },
  recentText: { ...THEME.typography.bodyMd, color: P.text },
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
  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyText: { ...THEME.typography.bodyMd, color: P.sub, marginTop: spacing.sm },
});
