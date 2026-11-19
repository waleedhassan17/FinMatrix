// ═══════════════════════════════════════════════════════
// FinMatrix — Backup & export (owner only)
// ═══════════════════════════════════════════════════════
// The whole company as one ZIP: every record as CSV, the main reports as
// PDF, the attachments, and a manifest whose trial balance proves the file
// is complete. The server builds it in the background; this screen asks for
// one, polls while it builds, then saves it to the phone and opens the share
// sheet. A ready file can be downloaded for 24 hours.

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';

import { THEME } from '../../../utils/theme';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  ReportContainer,
  ReportHeader,
  SectionCard,
} from '../../../components/reports/ReportUI';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  EXPORT_STATUS_LABEL,
  anyExportInFlight,
  formatBytes,
  type CompanyExport,
  type ExportStatus,
} from '../../../models/dataPortabilityModel';
import {
  createExportAPI,
  downloadAndShareExport,
  listExportsAPI,
} from '../../../networks/settings/dataPortabilityNetwork';
import { migrationErrorMessage } from '../../../utils/migrationErrors';

const { colors, spacing, typography } = THEME;

/** While a backup is being built the list is asked again this often. */
const POLL_MS = 4000;

const STATUS_COLOR: Record<ExportStatus, string> = {
  queued: colors.info,
  running: colors.info,
  ready: colors.success,
  failed: colors.danger,
  expired: colors.textTertiary,
};

const CONTENTS: Array<{ icon: keyof typeof Feather.glyphMap; text: string }> = [
  { icon: 'file-text', text: 'Every record as a CSV file, which Excel opens with Urdu names intact' },
  { icon: 'bar-chart-2', text: 'Trial balance, balance sheet, profit and loss, and the aging reports as PDF' },
  { icon: 'paperclip', text: 'Payment proofs, item photos, delivery photos and your logo' },
  { icon: 'check-circle', text: 'A manifest with a checksum for every file and the trial balance it adds up to' },
];

const when = (iso: string | null) => (iso ? dayjs(iso).format('DD MMM YYYY, h:mm A') : '');

const BackupExportScreen: React.FC = () => {
  const nav = useNavigation();
  const [list, setList] = useState<CompanyExport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [includeXlsx, setIncludeXlsx] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await listExportsAPI());
      setError(null);
    } catch (e: any) {
      setError(migrationErrorMessage(e?.code, e?.message));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Poll only while something is still being built.
  const inFlight = !!list && anyExportInFlight(list);
  useEffect(() => {
    if (!inFlight) return undefined;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [inFlight, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      await createExportAPI(includeXlsx);
      Toast.show({ type: 'success', text1: 'Backup started', text2: 'It will be ready to download in a few minutes.' });
      await load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Backup not started', text2: migrationErrorMessage(e?.code, e?.message) });
    } finally {
      setCreating(false);
    }
  }, [includeXlsx, load]);

  const download = useCallback(async (item: CompanyExport) => {
    setDownloading(item.id);
    try {
      await downloadAndShareExport(item);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Download failed', text2: migrationErrorMessage(e?.code, e?.message) });
      load();
    } finally {
      setDownloading(null);
    }
  }, [load]);

  return (
    <ReportContainer>
      <ReportHeader title="Backup & export" subtitle="Your whole company in one file" onBack={() => nav.goBack()} />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SectionCard title="Download everything" icon="download-cloud" style={styles.card}>
          {CONTENTS.map(c => (
            <View key={c.icon} style={styles.contentRow}>
              <Feather name={c.icon} size={14} color={colors.primary} style={styles.contentIcon} />
              <Text style={styles.body2}>{c.text}</Text>
            </View>
          ))}
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.strong}>Include an Excel workbook</Text>
              <Text style={styles.hint}>One sheet per record type, for opening without unzipping</Text>
            </View>
            <Switch
              value={includeXlsx}
              onValueChange={setIncludeXlsx}
              accessibilityLabel="Include an Excel workbook"
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <CustomButton
            title="Create backup"
            fullWidth
            isLoading={creating}
            disabled={creating}
            onPress={create}
          />
          <Text style={styles.hint}>Up to 3 backups an hour. Each file can be downloaded for 24 hours.</Text>
        </SectionCard>

        <SectionCard title="Your backups" icon="clock" style={styles.card}>
          {error && !list ? (
            <ErrorBlock message={error} onRetry={load} />
          ) : !list ? (
            <LoadingBlock label="Loading backups…" />
          ) : list.length === 0 ? (
            <EmptyBlock icon="archive" title="No backups yet" hint="Create one above; it appears here while it is being built." actionIcon={null} />
          ) : (
            list.map((item, i) => (
              <View key={item.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <View style={styles.rowTop}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <Badge label={EXPORT_STATUS_LABEL[item.status]} color={STATUS_COLOR[item.status]} />
                </View>
                <Text style={styles.hint}>
                  {when(item.createdAt)}
                  {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ''}
                  {item.includeXlsx ? ' · with workbook' : ''}
                  {item.status === 'ready' && item.expiresAt ? ` · until ${when(item.expiresAt)}` : ''}
                </Text>
                {item.status === 'failed' && item.error ? <Text style={styles.failed}>{item.error}</Text> : null}
                {item.status === 'ready' && item.downloadUrl ? (
                  <View style={styles.rowAction}>
                    <CustomButton
                      title="Download & share"
                      variant="secondary"
                      size="sm"
                      isLoading={downloading === item.id}
                      disabled={!!downloading}
                      onPress={() => download(item)}
                      accessibilityLabel={`Download ${item.fileName}`}
                    />
                  </View>
                ) : null}
              </View>
            ))
          )}
        </SectionCard>
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  card: { marginBottom: spacing.sm },
  contentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  contentIcon: { marginTop: 2, marginRight: spacing.xs },
  body2: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  strong: { ...typography.labelMd, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.sm },
  switchText: { flex: 1, marginRight: spacing.sm },
  row: { paddingVertical: spacing.sm },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  fileName: { ...typography.labelMd, color: colors.textPrimary, flex: 1 },
  failed: { ...typography.caption, color: colors.danger, marginTop: spacing.xxs },
  rowAction: { marginTop: spacing.xs, alignSelf: 'flex-start' },
});

export default BackupExportScreen;
