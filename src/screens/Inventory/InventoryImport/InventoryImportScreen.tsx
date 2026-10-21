// ═══════════════════════════════════════════════════════
// FinMatrix — Import items from Excel
// ═══════════════════════════════════════════════════════
// 1. Get the template (or an export of every item, to edit and send back).
// 2. Choose a .xlsx / .csv. The server previews it: row by row, what would be
//    created, updated, left alone, or refused and why. Nothing is saved yet.
// 3. Import. Every valid row is applied in one go; rows with problems are
//    skipped and stay listed so they can be fixed and the file sent again —
//    sending the same file twice changes nothing the second time.
//
// Opening quantities in the file are the owner's: they post Dr Inventory /
// Cr Opening Balance Equity on the date chosen here, and the owner confirms
// the exact value the preview showed before anything is recorded.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

import { THEME } from '../../../utils/theme';
import { Alert } from '../../../utils/alert';
import { formatCurrency } from '../../../utils/formatters';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import type { InventoryStackParamList } from '../../../navigators/stacks/InventoryStack';
import {
  Badge,
  DateField,
  ErrorBlock,
  ReportContainer,
  ReportHeader,
  SectionCard,
} from '../../../components/reports/ReportUI';
import CustomButton from '../../../Custom-Components/CustomButton';
import { FilterTabs } from '../../../components/shared/Tabs';
import { downloadInventoryTemplateAPI } from '../../../networks/inventory/inventoryNetwork';
import { fetchInventoryItems } from '../InventoryList/inventoryListSlice';
import {
  IMPORT_FILE_TYPES,
  appliedSummary,
  commitLabel,
  importTabs,
  openingStockDateError,
  rowsForTab,
  rowsToApply,
  type ImportAction,
  type ImportRow,
} from '../../../models/inventoryImportModel';
import {
  commitInventoryImport,
  previewInventoryImport,
  resetInventoryImport,
  selectImportError,
  selectImportFile,
  selectImportIsCommitting,
  selectImportIsPreviewing,
  selectImportPreview,
  selectImportResult,
  selectImportTab,
  selectOpeningStockDate,
  setImportTab,
  setOpeningStockDate,
} from './inventoryImportSlice';

const { colors, spacing, radius, typography, shadows } = THEME;

const ACTION_META: Record<ImportAction, { label: string; color: string }> = {
  create: { label: 'New', color: colors.success },
  update: { label: 'Update', color: colors.info },
  unchanged: { label: 'Unchanged', color: colors.textTertiary },
  error: { label: 'Problem', color: colors.danger },
};
/** A row lists at most this many field changes; the rest are counted. */
const MAX_CHANGES_SHOWN = 6;

const qty = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });
const prettyDate = (iso: string) => dayjs(iso).format('DD MMM YYYY');

const InventoryImportScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<InventoryStackParamList>>();
  const dispatch = useAppDispatch();

  const file = useAppSelector(selectImportFile);
  const preview = useAppSelector(selectImportPreview);
  const result = useAppSelector(selectImportResult);
  const tab = useAppSelector(selectImportTab);
  const openingStockDate = useAppSelector(selectOpeningStockDate);
  const isPreviewing = useAppSelector(selectImportIsPreviewing);
  const isCommitting = useAppSelector(selectImportIsCommitting);
  const error = useAppSelector(selectImportError);

  const [downloading, setDownloading] = useState<'template' | 'export' | null>(null);
  // One key per commit attempt of one file — see commitInventoryImportAPI.
  const idempotencyKey = useRef('');
  const today = dayjs().format('YYYY-MM-DD');

  // Each visit starts clean, and leaves nothing behind for the next one.
  useEffect(() => {
    dispatch(resetInventoryImport());
    return () => {
      dispatch(resetInventoryImport());
    };
  }, [dispatch]);

  const shown = result ?? preview;
  const opening = preview?.summary.openingStock;
  const needsDate = !!preview && preview.openingStockAllowed && !!opening && opening.items > 0;
  const dateError = needsDate
    ? openingStockDateError(openingStockDate, today, preview?.booksLockedUntil ?? null)
    : null;
  const toApply = preview ? rowsToApply(preview.summary) : 0;

  const download = useCallback(async (prefill: boolean) => {
    setDownloading(prefill ? 'export' : 'template');
    try {
      await downloadInventoryTemplateAPI(prefill);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Download failed', text2: e?.message });
    } finally {
      setDownloading(null);
    }
  }, []);

  const chooseFile = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: IMPORT_FILE_TYPES,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    idempotencyKey.current = '';
    if (!openingStockDate) dispatch(setOpeningStockDate(today));
    dispatch(
      previewInventoryImport({
        uri: a.uri,
        name: a.name ?? `items-${Date.now()}.xlsx`,
        mimeType: a.mimeType ?? '',
      }),
    );
  }, [dispatch, openingStockDate, today]);

  const runCommit = useCallback(async () => {
    if (!file || !preview) return;
    if (!idempotencyKey.current) idempotencyKey.current = uuidv4();
    try {
      const raw = await dispatch(
        commitInventoryImport({
          file,
          openingStockDate: needsDate ? openingStockDate : undefined,
          confirmOpeningStockValue: opening && opening.items > 0 ? opening.confirmValue : undefined,
          idempotencyKey: idempotencyKey.current,
        }),
      ).unwrap();
      idempotencyKey.current = '';
      dispatch(fetchInventoryItems());
      const applied = raw?.data?.applied ?? raw?.applied;
      Toast.show({
        type: 'success',
        text1: 'Import complete',
        text2: applied
          ? `${applied.created ?? 0} added, ${applied.updated ?? 0} updated`
          : undefined,
      });
    } catch (e: any) {
      // A server answer frees the key for a fresh attempt; a dropped
      // connection keeps it, so retrying replays rather than repeats.
      if (e?.code) idempotencyKey.current = '';
      if (e?.code === 'IMPORT_PREVIEW_STALE') {
        Toast.show({
          type: 'info',
          text1: 'Your items changed since the preview',
          text2: 'The preview has been refreshed — check it and import again.',
        });
        dispatch(previewInventoryImport(file));
        return;
      }
      Toast.show({ type: 'error', text1: 'Import failed', text2: e?.message });
    }
  }, [dispatch, file, preview, needsDate, openingStockDate, opening]);

  const confirmImport = useCallback(() => {
    if (!preview) return;
    const skipped = preview.summary.error;
    const lines = [
      `${toApply} item${toApply === 1 ? '' : 's'} will be saved.`,
      skipped ? `${skipped} row${skipped === 1 ? '' : 's'} with problems will be skipped.` : '',
      needsDate && opening
        ? `Opening stock for ${opening.items} item${opening.items === 1 ? '' : 's'} worth ${formatCurrency(opening.value)} ` +
          `will be recorded on ${prettyDate(openingStockDate)} (Dr Inventory, Cr Opening Balance Equity).`
        : '',
    ].filter(Boolean);
    Alert.alert(`${commitLabel(preview.summary)}?`, lines.join('\n\n'), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Import', onPress: runCommit },
    ]);
  }, [preview, toApply, needsDate, opening, openingStockDate, runCommit]);

  const startOver = useCallback(() => {
    idempotencyKey.current = '';
    dispatch(resetInventoryImport());
  }, [dispatch]);

  const rows = useMemo(() => (shown ? rowsForTab(shown.rows, tab) : []), [shown, tab]);
  const tabs = useMemo(
    () => (shown ? importTabs(shown.summary).map(t => ({ label: t.label, value: t.key, count: t.count })) : []),
    [shown],
  );

  const renderRow = useCallback(({ item: r }: { item: ImportRow }) => {
    const meta = ACTION_META[r.action];
    const changes = r.action === 'update' ? r.changes : [];
    return (
      <View style={[styles.rowCard, r.action === 'error' && styles.rowCardError]}>
        <View style={styles.rowTop}>
          <Text style={styles.rowNumber}>Row {r.rowNumber}</Text>
          <Badge label={meta.label} color={meta.color} />
        </View>
        <Text style={styles.rowName} numberOfLines={1}>
          {r.name || '—'}
        </Text>
        <Text style={styles.rowSku}>{r.sku || 'No SKU'}</Text>

        {changes.slice(0, MAX_CHANGES_SHOWN).map(c => (
          <Text key={c.field} style={styles.change} numberOfLines={2}>
            {c.label}: <Text style={styles.changeFrom}>{c.from ?? '—'}</Text> → {c.to ?? '—'}
          </Text>
        ))}
        {changes.length > MAX_CHANGES_SHOWN && (
          <Text style={styles.change}>+{changes.length - MAX_CHANGES_SHOWN} more changes</Text>
        )}

        {r.openingStock && (
          <Text style={styles.opening}>
            Opening stock: {qty(r.openingStock.quantity)} × {formatCurrency(r.openingStock.unitCost)} ={' '}
            {formatCurrency(r.openingStock.value)}
          </Text>
        )}
        {r.errors.map(m => (
          <Note key={m} icon="alert-circle" color={colors.danger} text={m} />
        ))}
        {r.warnings.map(m => (
          <Note key={m} icon="alert-triangle" color={colors.warning} text={m} />
        ))}
      </View>
    );
  }, []);

  const header = (
    <View style={styles.headerContent}>
      {!result && (
        <SectionCard title="1 · Get the template" icon="download" style={styles.card}>
          <Text style={styles.body}>
            One item per row. A SKU you already have updates that item; a new SKU adds one. Blank cells leave
            existing values as they are.
          </Text>
          <View style={styles.buttonRow}>
            <View style={styles.buttonCell}>
              <CustomButton
                title="Template"
                variant="secondary"
                size="sm"
                fullWidth
                isLoading={downloading === 'template'}
                disabled={downloading !== null}
                onPress={() => download(false)}
              />
            </View>
            <View style={styles.buttonCell}>
              <CustomButton
                title="Export my items"
                variant="secondary"
                size="sm"
                fullWidth
                isLoading={downloading === 'export'}
                disabled={downloading !== null}
                onPress={() => download(true)}
              />
            </View>
          </View>
        </SectionCard>
      )}

      {!result && (
        <SectionCard title="2 · Choose your file" icon="file-text" style={styles.card}>
          {file && (
            <View style={styles.fileRow}>
              <Feather name="file" size={16} color={colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
            </View>
          )}
          {isPreviewing ? (
            <View style={styles.checking}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.body}>Checking your file…</Text>
            </View>
          ) : (
            <CustomButton
              title={file ? 'Choose another file' : 'Choose Excel or CSV file'}
              variant={file ? 'secondary' : 'primary'}
              fullWidth
              onPress={chooseFile}
            />
          )}
          <Text style={styles.hint}>.xlsx or .csv, up to 1,000 items. Nothing is saved until you import.</Text>
        </SectionCard>
      )}

      {!!error && !isPreviewing && (
        <ErrorBlock message={error} onRetry={file ? () => dispatch(previewInventoryImport(file)) : undefined} />
      )}

      {result?.applied && (
        <SectionCard title="Import complete" icon="check-circle" style={styles.card}>
          <Text style={styles.resultLine}>{appliedSummary(result.applied)}.</Text>
          {result.applied.openingStockItems > 0 && (
            <Text style={styles.body}>
              Opening stock for {result.applied.openingStockItems} item
              {result.applied.openingStockItems === 1 ? '' : 's'} ({formatCurrency(result.applied.openingStockValue)})
              recorded on {prettyDate(result.applied.openingStockDate ?? today)}
              {result.applied.journalReference ? ` as ${result.applied.journalReference}` : ''}.
            </Text>
          )}
          {result.summary.error > 0 && (
            <Text style={styles.body}>
              {result.summary.error} row{result.summary.error === 1 ? ' was' : 's were'} skipped — fix{' '}
              {result.summary.error === 1 ? 'it' : 'them'} in the file and import it again.
            </Text>
          )}
          <View style={styles.buttonRow}>
            <View style={styles.buttonCell}>
              <CustomButton title="Import another" variant="secondary" fullWidth onPress={startOver} />
            </View>
            <View style={styles.buttonCell}>
              <CustomButton title="Done" fullWidth onPress={() => navigation.goBack()} />
            </View>
          </View>
        </SectionCard>
      )}

      {needsDate && !result && opening && (
        <SectionCard title="Opening stock" icon="layers" style={styles.card}>
          <Text style={styles.body}>
            {opening.items} item{opening.items === 1 ? '' : 's'} · {qty(opening.quantity)} units ·{' '}
            <Text style={styles.strong}>{formatCurrency(opening.value)}</Text>
          </Text>
          <Text style={styles.hint}>Recorded as one journal entry: Dr Inventory, Cr Opening Balance Equity.</Text>
          <DateField
            label="Record on"
            value={openingStockDate}
            onChange={d => dispatch(setOpeningStockDate(d))}
            maximumDate={new Date()}
            minimumDate={
              preview?.booksLockedUntil ? dayjs(preview.booksLockedUntil).add(1, 'day').toDate() : undefined
            }
            style={styles.dateField}
          />
          {!!dateError && <Text style={styles.dateError}>{dateError}</Text>}
        </SectionCard>
      )}

      {shown && shown.ignoredColumns.length > 0 && !result && (
        <Text style={styles.ignored}>Not imported: {shown.ignoredColumns.join(', ')}</Text>
      )}

      {shown && tabs.length > 0 && (
        <FilterTabs tabs={tabs} active={tab} onChange={v => dispatch(setImportTab(v))} style={styles.tabs} />
      )}
    </View>
  );

  return (
    <ReportContainer>
      <ReportHeader title="Import items" subtitle="From Excel or CSV" onBack={() => navigation.goBack()} />
      <View style={styles.body0}>
        <FlatList
          data={rows}
          keyExtractor={r => `${r.rowNumber}`}
          renderItem={renderRow}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
        />

        {preview && !result && (
          <View style={styles.footer}>
            <CustomButton
              title={toApply > 0 ? commitLabel(preview.summary) : 'Nothing to import'}
              fullWidth
              isLoading={isCommitting}
              disabled={toApply === 0 || !!dateError || isCommitting || isPreviewing}
              onPress={confirmImport}
            />
          </View>
        )}
      </View>
    </ReportContainer>
  );
};

/** An error or warning line under a row. */
const Note: React.FC<{ icon: keyof typeof Feather.glyphMap; color: string; text: string }> = ({
  icon,
  color,
  text,
}) => (
  <View style={styles.note}>
    <Feather name={icon} size={13} color={color} style={styles.noteIcon} />
    <Text style={[styles.noteText, { color }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  body0: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl },
  headerContent: { paddingTop: spacing.sm },
  card: { marginBottom: spacing.sm },
  body: { ...typography.bodySm, color: colors.textSecondary },
  strong: { ...typography.labelMd, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  buttonRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  buttonCell: { flex: 1 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  fileName: { ...typography.labelMd, color: colors.textPrimary, flex: 1 },
  checking: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  resultLine: { ...typography.h5, color: colors.textPrimary, marginBottom: spacing.xxs },
  dateField: { marginTop: spacing.sm },
  dateError: { ...typography.caption, color: colors.danger, marginTop: spacing.xxs },
  ignored: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.xs },
  tabs: { marginBottom: spacing.xs },

  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    ...shadows.xs,
  },
  rowCardError: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowNumber: { ...typography.overline, color: colors.textTertiary },
  rowName: { ...typography.h5, color: colors.textPrimary, marginTop: spacing.xxs },
  rowSku: { ...typography.caption, color: colors.textSecondary },
  change: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  changeFrom: { color: colors.textTertiary },
  opening: { ...typography.caption, color: colors.primary, marginTop: spacing.xxs },
  note: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xxs },
  noteIcon: { marginTop: 2, marginRight: spacing.xxs },
  noteText: { ...typography.caption, flex: 1 },

  footer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

export default InventoryImportScreen;
