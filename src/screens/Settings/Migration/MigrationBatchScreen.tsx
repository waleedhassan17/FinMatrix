// ═══════════════════════════════════════════════════════
// FinMatrix — one migration (owner only)
// ═══════════════════════════════════════════════════════
// Loads the batch, owns the actions, and renders MigrationBatchView. Every
// decision that changes the books (import, undo, close) asks first, through
// the web-safe Alert shim.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';

import { THEME } from '../../../utils/theme';
import { Alert } from '../../../utils/alert';
import { ErrorBlock, LoadingBlock, ReportContainer, ReportHeader } from '../../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import {
  MAX_BACKUP_BYTES,
  MAX_SPREADSHEET_BYTES,
  formatSize,
  isLargeUploadFile,
  isSpreadsheetFile,
  isUploadActive,
  openingDateOf,
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
import {
  cancelLargeUploadAPI,
  deletePickedCopy,
  openPickedFile,
  uploadLargeFileAPI,
  type PieceSource,
} from '../../../networks/settings/migrationLargeUpload';
import { MIGRATION_ERRORS_EN, migrationErrorMessage } from '../../../utils/migrationErrors';
import { WEB_APP_URL } from '../../../utils/webAppUrl';
import { MigrationBatchView, type BackupSending, type BatchAction } from './MigrationBatchView';

const { colors, spacing } = THEME;

/** While the server reads a Peachtree backup in the background. */
const READING_POLL_MS = 3000;
/** A backup this large gets a word about mobile data first. */
const CONFIRM_ABOVE_BYTES = 20 * 1024 * 1024;
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
  // A Peachtree backup (.ptb) has no type of its own (iOS offers it only under
  // "any file"); files are routed by their extension below.
  '*/*',
];

interface PickedBackup {
  uri: string;
  name: string;
  size: number;
  file?: Blob;
}

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
  const [sending, setSending] = useState<BackupSending | null>(null);
  const backup = useRef<{ picked: PickedBackup; source: PieceSource | null; uploadId: string | null; abort: AbortController | null; byBackground: boolean } | null>(null);

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

  // ── A Peachtree backup, in pieces ─────────────────────────
  const stopBackup = useCallback(() => {
    const cur = backup.current;
    cur?.abort?.abort();
    cur?.source?.close();
    if (cur) {
      cur.abort = null;
      cur.source = null;
    }
  }, []);

  const sendBackup = useCallback(async () => {
    const cur = backup.current;
    if (!cur) return;
    stopBackup();
    const abort = new AbortController();
    cur.abort = abort;
    cur.byBackground = false;
    setSending(s => ({ name: cur.picked.name, sent: s?.sent ?? 0, total: cur.picked.size, paused: false, error: null }));
    try {
      cur.source = openPickedFile(cur.picked);
      await uploadLargeFileAPI(id, cur.picked.name, cur.source, {
        signal: abort.signal,
        onProgress: p => {
          cur.uploadId = p.uploadId;
          setSending(s => (s ? { ...s, sent: p.sent, total: p.total } : s));
        },
      });
      stopBackup();
      deletePickedCopy(cur.picked.uri);
      backup.current = null;
      setSending(null);
      Toast.show({ type: 'success', text1: `${cur.picked.name} uploaded`, text2: 'Reading it now. This takes a minute or two.' });
      await load();
    } catch (e: any) {
      // Paused (by the owner, or the app left): a newer run may already be
      // going, so touch nothing.
      if (abort.signal.aborted) return;
      stopBackup();
      setSending(s => (s ? { ...s, paused: true, error: migrationErrorMessage(e?.code, e?.message) } : s));
      await load();
    }
  }, [id, load, stopBackup]);

  const pauseBackup = useCallback(() => {
    stopBackup();
    setSending(s => (s ? { ...s, paused: true, error: null } : s));
  }, [stopBackup]);

  const cancelBackup = useCallback(async () => {
    const cur = backup.current;
    stopBackup();
    backup.current = null;
    setSending(null);
    if (cur?.uploadId) await cancelLargeUploadAPI(id, cur.uploadId).catch((): void => undefined);
    if (cur) deletePickedCopy(cur.picked.uri);
    await load();
  }, [id, load, stopBackup]);

  const discardUpload = useCallback(
    async (uploadId: string) => {
      try {
        await cancelLargeUploadAPI(id, uploadId);
      } catch (e: any) {
        fail('Could not discard it', e);
      }
      await load();
    },
    [id, load],
  );

  const startBackup = useCallback(
    (picked: PickedBackup) => {
      setPreview(null);
      autoPrepared.current = false;
      backup.current = { picked, source: null, uploadId: null, abort: null, byBackground: false };
      setSending({ name: picked.name, sent: 0, total: picked.size, paused: false, error: null });
      sendBackup();
    },
    [sendBackup],
  );

  // iOS and Android stop the app's network once it leaves the screen: pause
  // when it goes to the background, carry on when it comes back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      const cur = backup.current;
      if (!cur) return;
      if (state !== 'active' && cur.abort) {
        cur.byBackground = true;
        pauseBackup();
      } else if (state === 'active' && cur.byBackground) {
        sendBackup();
      }
    });
    return () => sub.remove();
  }, [pauseBackup, sendBackup]);
  // Leaving the screen pauses it too; the server keeps every piece it has.
  useEffect(() => () => stopBackup(), [stopBackup]);

  // Keep asking while the server reads the backup.
  const readingNow = (batch?.uploads ?? []).some(isUploadActive);
  useEffect(() => {
    if (!readingNow) return;
    const t = setInterval(() => {
      load();
    }, READING_POLL_MS);
    return () => clearInterval(t);
  }, [readingNow, load]);

  const addFiles = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, multiple: true, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const backups = res.assets.filter(a => isLargeUploadFile(a.name, a.size ?? 0));
    const sheets = res.assets.filter(a => isSpreadsheetFile(a.name) && !isLargeUploadFile(a.name, a.size ?? 0));
    const other = res.assets.filter(a => !isLargeUploadFile(a.name, a.size ?? 0) && !isSpreadsheetFile(a.name));
    if (other.length) {
      Toast.show({ type: 'error', text1: 'Not a file FinMatrix can read', text2: `${other.map(a => a.name).join(', ')}: add .xlsx, .csv, Tally .xml, .zip or a Peachtree .ptb backup.` });
    }
    if (backups.length > 1) {
      Toast.show({ type: 'error', text1: 'One large file at a time', text2: 'Add one large file (or Peachtree backup) first; the others can follow.' });
      return;
    }
    if (backups.length === 1) {
      const a = backups[0];
      const size = a.size ?? 0;
      if (size > MAX_BACKUP_BYTES) {
        Toast.show({ type: 'error', text1: a.name, text2: `${formatSize(size)}: a file can be up to ${formatSize(MAX_BACKUP_BYTES)}.` });
        return;
      }
      if (sending && !sending.paused) {
        Toast.show({ type: 'error', text1: `${sending.name} is still being sent` });
        return;
      }
      const picked: PickedBackup = { uri: a.uri, name: a.name, size, file: (a as any).file };
      if (size > CONFIRM_ABOVE_BYTES) {
        Alert.alert(
          `Upload ${formatSize(size)}?`,
          `${a.name} is large. Use Wi-Fi if you can — on mobile data it uses ${formatSize(size)} of your allowance. Keep FinMatrix open while it uploads; if you leave, it pauses and carries on when you come back.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => deletePickedCopy(a.uri) },
            { text: 'Upload', onPress: () => startBackup(picked) },
          ],
        );
      } else startBackup(picked);
    }
    if (!sheets.length) return;
    const tooBig = sheets.find(a => (a.size ?? 0) > MAX_SPREADSHEET_BYTES);
    if (tooBig) {
      Toast.show({ type: 'error', text1: tooBig.name, text2: MIGRATION_ERRORS_EN.MIGRATION_FILE_TOO_LARGE });
      return;
    }
    setPreview(null);
    autoPrepared.current = false;
    await act(
      'upload',
      () => uploadMigrationFilesAPI(id, sheets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }))),
      sheets.length === 1 ? 'File read' : `${sheets.length} files read`,
    );
  }, [act, id, sending, startBackup]);

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
      `Everything is posted dated ${openingDateOf(batch)}, the day before your cutover, and your books are closed through that day. You can undo it until you close the migration, as long as nothing new depends on it.`,
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
            sending={sending}
            onPauseUpload={pauseBackup}
            onResumeUpload={sendBackup}
            onCancelUpload={cancelBackup}
            onDiscardUpload={discardUpload}
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
