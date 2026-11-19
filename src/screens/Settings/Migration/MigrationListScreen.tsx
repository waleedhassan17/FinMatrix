// ═══════════════════════════════════════════════════════
// FinMatrix — Move to FinMatrix (owner only)
// ═══════════════════════════════════════════════════════
// Start a migration (where the books come from, and the cutover date) and
// list the ones already started. Opening one goes to MigrationBatchScreen,
// where files are uploaded and the migration is checked, signed off and
// imported. Matching columns and fixing rows is done on the web.

import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import { THEME } from '../../../utils/theme';
import {
  Badge,
  DateField,
  ErrorBlock,
  LoadingBlock,
  NoticeBanner,
  ReportContainer,
  ReportHeader,
  SectionCard,
} from '../../../components/reports/ReportUI';
import CustomButton from '../../../Custom-Components/CustomButton';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import {
  MIGRATION_STATUS_LABEL,
  SOURCE_OPTIONS,
  sourceLabel,
  type MigrationBatch,
  type MigrationSourceSystem,
} from '../../../models/migrationModel';
import {
  createMigrationAPI,
  downloadMigrationTemplateAPI,
  listMigrationsAPI,
} from '../../../networks/settings/migrationNetwork';
import { migrationErrorMessage } from '../../../utils/migrationErrors';
import { migrationStatusColor } from './MigrationBatchView';

const { colors, spacing, radius, typography } = THEME;

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const MigrationListScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [list, setList] = useState<MigrationBatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<MigrationSourceSystem>('finmatrix_template');
  const [cutover, setCutover] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [gettingTemplate, setGettingTemplate] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await listMigrationsAPI());
      setError(null);
    } catch (e: any) {
      setError(migrationErrorMessage(e?.code, e?.message));
    }
  }, []);

  // On arrival and on coming back from a batch, whose status may have moved on.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const start = useCallback(async () => {
    setStarting(true);
    setStartError(null);
    try {
      const batch = await createMigrationAPI({ sourceSystem: source, cutoverDate: cutover });
      nav.navigate('MigrationBatch', { batchId: batch.id });
    } catch (e: any) {
      setStartError(migrationErrorMessage(e?.code, e?.message));
    } finally {
      setStarting(false);
    }
  }, [cutover, nav, source]);

  const template = useCallback(async () => {
    setGettingTemplate(true);
    try {
      await downloadMigrationTemplateAPI();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Download failed', text2: e?.message });
    } finally {
      setGettingTemplate(false);
    }
  }, []);

  const active = list?.find(b => !['closed', 'rolled_back'].includes(b.status));

  return (
    <ReportContainer>
      <ReportHeader title="Move to FinMatrix" subtitle="Bring your opening books across" onBack={() => nav.goBack()} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <SectionCard title="How it works" icon="info" style={styles.card}>
          <Text style={styles.text}>
            Upload your chart of accounts, customers, vendors, items, trial balance, open invoices, open bills and
            stock. FinMatrix checks that every figure ties out to the rupee, shows you a certificate, and imports
            only after you sign it off. You can undo the import until you close the migration.
          </Text>
          <View style={styles.inlineButton}>
            <CustomButton
              title="Get the starter workbook"
              variant="secondary"
              size="sm"
              isLoading={gettingTemplate}
              onPress={template}
            />
          </View>
        </SectionCard>

        {active ? (
          <NoticeBanner icon="alert-circle" message="A migration is already in progress. Open it below to continue." />
        ) : (
          <SectionCard title="Start a migration" icon="play-circle" style={styles.card}>
            <Text style={styles.label}>Where are your books now?</Text>
            {SOURCE_OPTIONS.map(o => {
              const on = o.id === source;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[styles.option, on && styles.optionOn]}
                  onPress={() => setSource(o.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  activeOpacity={0.8}
                >
                  <Feather name={on ? 'check-circle' : 'circle'} size={16} color={on ? colors.primary : colors.textTertiary} />
                  <Text style={[styles.optionText, on && styles.optionTextOn]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
            <DateField label="Cutover date" value={cutover} onChange={setCutover} maximumDate={new Date()} style={styles.date} />
            <Text style={styles.hint}>
              Your balances are brought in as at the start of this day. FinMatrix closes the books before it, so
              nothing can be posted into the old period afterwards.
            </Text>
            {startError ? <Text style={styles.error}>{startError}</Text> : null}
            <CustomButton title="Start" fullWidth isLoading={starting} disabled={starting || !cutover} onPress={start} />
          </SectionCard>
        )}

        <SectionCard title="Your migrations" icon="layers" style={styles.card}>
          {error && !list ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : !list ? (
            <LoadingBlock label="Loading…" />
          ) : list.length === 0 ? (
            <Text style={styles.hint}>None yet.</Text>
          ) : (
            list.map((b, i) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.row, i > 0 && styles.rowDivider]}
                onPress={() => nav.navigate('MigrationBatch', { batchId: b.id })}
                accessibilityRole="button"
                accessibilityLabel={`Open migration from ${sourceLabel(b.sourceSystem)}`}
                activeOpacity={0.8}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{sourceLabel(b.sourceSystem)}</Text>
                  <Text style={styles.hint}>
                    Cutover {dayjs(b.cutoverDate).format('DD MMM YYYY')} · {b.readiness}% ready
                  </Text>
                </View>
                <Badge label={MIGRATION_STATUS_LABEL[b.status]} color={migrationStatusColor(b.status)} />
                <Feather name="chevron-right" size={16} color={colors.textTertiary} style={styles.chevron} />
              </TouchableOpacity>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.sm },
  card: { marginBottom: 0 },
  text: { ...typography.bodySm, color: colors.textSecondary },
  label: { ...typography.labelMd, color: colors.textSecondary, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs, marginBottom: spacing.xs },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.xs },
  inlineButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xxs,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionText: { ...typography.bodySm, color: colors.textPrimary },
  optionTextOn: { ...typography.labelMd, color: colors.primary },
  date: { marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowMain: { flex: 1 },
  rowTitle: { ...typography.labelMd, color: colors.textPrimary },
  chevron: { marginLeft: spacing.xxs },
});

export default MigrationListScreen;
