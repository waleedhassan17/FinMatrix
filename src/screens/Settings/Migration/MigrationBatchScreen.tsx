// ═══════════════════════════════════════════════════════
// FinMatrix — one migration (owner only)
// ═══════════════════════════════════════════════════════
// Loads the batch, owns the actions, and renders MigrationBatchView. Every
// decision that changes the books (import, undo, close) asks first, through
// the web-safe Alert shim.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { THEME } from '../../../utils/theme';
import { Alert } from '../../../utils/alert';
import { ErrorBlock, LoadingBlock, ReportContainer, ReportHeader } from '../../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import {
  sourceLabel,
  webBatchUrl,
  type CertificatePreview,
  type IssueGroup,
  type MigrationBatch,
} from '../../../models/migrationModel';
import {
  closeMigrationAPI,
  commitMigrationAPI,
  downloadMigrationCertificateAPI,
  dryRunMigrationAPI,
  getMigrationAPI,
  listMigrationIssuesAPI,
  rollbackMigrationAPI,
  signOffMigrationAPI,
  uploadMigrationFilesAPI,
  validateMigrationAPI,
} from '../../../networks/settings/migrationNetwork';
import { MIGRATION_ERRORS_EN, migrationErrorMessage } from '../../../utils/migrationErrors';
import { WEB_APP_URL } from '../../../utils/webAppUrl';
import { MigrationBatchView, type BatchAction } from './MigrationBatchView';

const { colors, spacing } = THEME;

/** The server's own limit (MIGRATION_MAX_FILE_BYTES); checked here to save a wasted upload. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const FILE_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
  'application/xml',
  'text/xml',
  'application/zip',
  // Android often labels a Tally .xml or a .csv as a plain binary.
  'application/octet-stream',
];

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const fail = (title: string, e: any) =>
  Toast.show({ type: 'error', text1: title, text2: migrationErrorMessage(e?.code, e?.message) });

const MigrationBatchScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<MoreStackParamList, 'MigrationBatch'>>();
  const id = params.batchId;

  const [batch, setBatch] = useState<MigrationBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issueGroups, setIssueGroups] = useState<IssueGroup[]>([]);
  const [preview, setPreview] = useState<CertificatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<BatchAction | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const autoPrepared = useRef(false);

  const show = useCallback(async (b: MigrationBatch) => {
    setBatch(b);
    if (b.issues.blocking + b.issues.warning > 0) {
      try {
        setIssueGroups((await listMigrationIssuesAPI(b.id)).groups ?? []);
      } catch {
        setIssueGroups([]);
      }
    } else {
      setIssueGroups([]);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      await show(await getMigrationAPI(id));
      setError(null);
    } catch (e: any) {
      setError(migrationErrorMessage(e?.code, e?.message));
    }
  }, [id, show]);

  // On arrival and on coming back from the browser: the batch may have moved on.
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

  /** Run one server action; a returned batch replaces the one shown. */
  const act = useCallback(
    async (action: BatchAction, fn: () => Promise<MigrationBatch | { batch: MigrationBatch } | void>, success?: string) => {
      setBusy(action);
      try {
        const r = await fn();
        const next = r && 'batch' in r ? r.batch : (r as MigrationBatch | undefined);
        if (next && 'status' in next) await show(next);
        else await load();
        if (success) Toast.show({ type: 'success', text1: success });
        return true;
      } catch (e: any) {
        fail('That did not work', e);
        await load();
        return false;
      } finally {
        setBusy(null);
      }
    },
    [load, show],
  );

  const prepare = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const r = await dryRunMigrationAPI(id);
      setPreview(r.certificate);
      setTicked(new Set());
      setConfirmed(false);
      await show(r.batch);
    } catch (e: any) {
      fail('The practice import stopped', e);
      await load();
    } finally {
      setPreviewLoading(false);
    }
  }, [id, load, show]);

  // A ready batch gets its practice run once, as on the web.
  useEffect(() => {
    if (batch?.status === 'ready' && !preview && !autoPrepared.current) {
      autoPrepared.current = true;
      prepare();
    }
  }, [batch?.status, preview, prepare]);

  const addFiles = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, multiple: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const tooBig = res.assets.find(a => (a.size ?? 0) > MAX_FILE_BYTES);
    if (tooBig) {
      Toast.show({ type: 'error', text1: tooBig.name, text2: MIGRATION_ERRORS_EN.MIGRATION_FILE_TOO_LARGE });
      return;
    }
    setPreview(null);
    autoPrepared.current = false;
    await act(
      'upload',
      () => uploadMigrationFilesAPI(id, res.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }))),
      res.assets.length === 1 ? 'File read' : `${res.assets.length} files read`,
    );
  }, [act, id]);

  const openWeb = useCallback(() => {
    Linking.openURL(webBatchUrl(WEB_APP_URL, id)).catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open the browser', text2: webBatchUrl(WEB_APP_URL, id) }),
    );
  }, [id]);

  const certificate = useCallback(async () => {
    setBusy('certificate');
    try {
      await downloadMigrationCertificateAPI(id);
    } catch (e: any) {
      fail('The certificate could not be downloaded', e);
    } finally {
      setBusy(null);
    }
  }, [id]);

  const confirmImport = useCallback(() => {
    if (!batch) return;
    Alert.alert(
      'Import into FinMatrix?',
      `Everything is posted dated ${batch.cutoverDate} and your books are closed up to the day before. You can undo it until you close the migration, as long as nothing new depends on it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import', onPress: () => act('import', () => commitMigrationAPI(id), 'Your books are in FinMatrix') },
      ],
    );
  }, [act, batch, id]);

  const confirmUndo = useCallback(() => {
    Alert.alert(
      'Undo this migration?',
      'Every entry it posted is reversed and the customers, vendors, items, invoices and bills it created are removed. This is refused if anything new — a payment, say — already depends on them.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo', style: 'destructive', onPress: () => act('undo', () => rollbackMigrationAPI(id), 'Migration undone') },
      ],
    );
  }, [act, id]);

  const confirmClose = useCallback(() => {
    Alert.alert('Close this migration?', 'After closing it can no longer be undone. Your imported balances stay as they are.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close migration', onPress: () => act('close', () => closeMigrationAPI(id), 'Migration closed') },
    ]);
  }, [act, id]);

  const toggleSpot = useCallback((i: number) => {
    setTicked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  return (
    <ReportContainer>
      <ReportHeader
        title={batch ? sourceLabel(batch.sourceSystem) : 'Migration'}
        subtitle="Move to FinMatrix"
        onBack={() => nav.goBack()}
      />
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {error && !batch ? (
          <ErrorBlock message={error} onRetry={load} />
        ) : !batch ? (
          <LoadingBlock label="Loading migration…" />
        ) : (
          <MigrationBatchView
            batch={batch}
            issueGroups={issueGroups}
            preview={preview}
            previewLoading={previewLoading}
            ticked={ticked}
            confirmed={confirmed}
            busy={busy}
            onToggleSpot={toggleSpot}
            onToggleConfirmed={() => setConfirmed(c => !c)}
            onAddFiles={addFiles}
            onRunChecks={() => act('checks', () => validateMigrationAPI(id))}
            onOpenWeb={openWeb}
            onPrepare={prepare}
            onSignOff={() => act('signOff', () => signOffMigrationAPI(id), 'Signed off')}
            onImport={confirmImport}
            onUndo={confirmUndo}
            onClose={confirmClose}
            onCertificate={certificate}
          />
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
});

export default MigrationBatchScreen;
