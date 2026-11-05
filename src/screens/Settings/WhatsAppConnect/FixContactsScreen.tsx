// ═══════════════════════════════════════════════════════
// FinMatrix — Fix contacts (FinMatrix Connect)
// Customers and vendors WhatsApp cannot reach yet: no number,
// a number that is not on WhatsApp, no consent, or opted out.
// Tap one to fix it on its form.
// ═══════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { THEME } from '../../../theme';
import { ReportContainer, ReportHeader, EmptyBlock, ErrorBlock, LoadingBlock } from '../../../components/reports/ReportUI';
import { getContactHealthAPI } from '../../../networks/messaging/messagingNetwork';
import { CONTACT_STATUS_WORDS, type ContactHealth, type ContactHealthRow, type ContactStatus } from '../../../models/messagingModel';
import { formatWhatsappPreview } from '../../../utils/whatsappPreview';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

const { colors, typography, spacing, radius } = THEME;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

/** What to do about each status, in the words the owner reads. */
const FIX: Record<ContactStatus, string> = {
  ready: 'Ready',
  unverified: 'Not delivered to yet — it will verify on the first message',
  no_consent: 'Record their consent on the form',
  missing: 'Add a WhatsApp number',
  invalid: 'The phone is not a WhatsApp number — correct it',
  not_on_whatsapp: 'WhatsApp could not deliver to this number — check it',
  opted_out: 'They replied STOP. They can reply START to receive messages again',
};

const ORDER: ContactStatus[] = ['not_on_whatsapp', 'invalid', 'missing', 'no_consent', 'opted_out', 'unverified', 'ready'];

const FixContactsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [health, setHealth] = useState<ContactHealth | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'customer' | 'vendor'>('all');

  const load = useCallback(
    () =>
      getContactHealthAPI()
        .then(h => {
          setError('');
          setHealth(h);
        })
        .catch((e: { message?: string }) => setError(e?.message ?? 'Could not load contacts')),
    [],
  );

  useEffect(() => {
    void load();
    const unsub = navigation.addListener('focus', () => void load());
    return unsub;
  }, [navigation, load]);

  const rows = useMemo(
    () =>
      (health?.contacts ?? [])
        .filter(c => filter === 'all' || c.partyType === filter)
        .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name)),
    [health, filter],
  );

  const open = (c: ContactHealthRow) =>
    c.partyType === 'customer'
      ? navigation.navigate('CustomerForm', { customerId: c.id })
      : navigation.navigate('VendorForm', { vendorId: c.id });

  const s = health?.summary;
  return (
    <ReportContainer>
      <ReportHeader title="Fix contacts" subtitle="Who WhatsApp cannot reach yet" onBack={() => navigation.goBack()} />
      {!health && !error ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={c => `${c.partyType}-${c.id}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.head}>
              {s ? (
                <Text style={styles.summary}>
                  {s.ready} of {s.total} ready · {s.missing + s.invalid} without a number · {s.noConsent} without consent ·{' '}
                  {s.notOnWhatsapp} not on WhatsApp · {s.optedOut} opted out
                </Text>
              ) : null}
              <View style={styles.filters} accessibilityRole="tablist">
                {(['all', 'customer', 'vendor'] as const).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filter, filter === f && styles.filterOn]}
                    onPress={() => setFilter(f)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === f }}
                  >
                    <Text style={[styles.filterText, filter === f && styles.filterTextOn]}>
                      {f === 'all' ? 'All' : f === 'customer' ? 'Customers' : 'Vendors'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          ListEmptyComponent={<EmptyBlock icon="check-circle" title="Every contact can be messaged" />}
          renderItem={({ item: c }) => (
            <TouchableOpacity style={styles.row} onPress={() => open(c)} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {c.name}
                  {c.code ? <Text style={styles.code}>{`  ${c.code}`}</Text> : null}
                </Text>
                <Text style={styles.number} numberOfLines={1}>
                  {formatWhatsappPreview(c.whatsappE164) ?? c.phone ?? 'No phone'} ·{' '}
                  {c.partyType === 'customer' ? 'Customer' : 'Vendor'}
                </Text>
                <Text style={styles.fix}>{FIX[c.status]}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{CONTACT_STATUS_WORDS[c.status]}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  head: { padding: spacing.md },
  summary: { ...typography.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },
  filters: { flexDirection: 'row' },
  filter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  filterOn: { backgroundColor: colors.primaryLighter, borderColor: colors.primary },
  filterText: { ...typography.labelSm, color: colors.textSecondary },
  filterTextOn: { color: colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  name: { ...typography.labelLg, color: colors.textPrimary },
  code: { ...typography.caption, color: colors.textTertiary },
  number: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xxs },
  fix: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
  pill: {
    backgroundColor: colors.neutral100,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginHorizontal: spacing.xs,
  },
  pillText: { ...typography.labelSm, color: colors.textSecondary },
});

export default FixContactsScreen;
