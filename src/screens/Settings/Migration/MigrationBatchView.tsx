// ═══════════════════════════════════════════════════════
// FinMatrix — one migration, as the owner sees it on a phone
// ═══════════════════════════════════════════════════════
// Pure presentation: MigrationBatchScreen loads the batch and passes every
// action in, so each status can be rendered and asserted on its own.
//
//   draft / uploaded / mapped / validated → files, progress, issues, checks;
//       matching and fixing link to the web
//   ready      → certificate, spot checks, sign off, then Import
//   committed  → certificate download, Undo, Close
//   closed / rolled_back → what happened

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../utils/theme';
import { Badge, LoadingBlock, NoticeBanner, ProgressBar, SectionCard } from '../../../components/reports/ReportUI';
import CustomButton from '../../../Custom-Components/CustomButton';
import {
  ENTITY_LABEL,
  MIGRATION_STATUS_LABEL,
  PEACHTREE_REPORTS,
  detectedLabel,
  formatSize,
  isUploadActive,
  uploadStageText,
  WIZARD_STEP_LABEL,
  canImport,
  canRunChecks,
  canSignOff,
  canUpload,
  needsWeb,
  openingDateOf,
  sourceLabel,
  type CertificatePreview,
  type IssueGroup,
  type MigrationBatch,
  type MigrationStatus,
} from '../../../models/migrationModel';
import { migrationErrorMessage } from '../../../utils/migrationErrors';

const { colors, spacing, radius, typography } = THEME;

export type BatchAction = 'upload' | 'checks' | 'prepare' | 'signOff' | 'import' | 'undo' | 'close' | 'certificate';

/** A backup on its way from this phone. */
export interface BackupSending {
  name: string;
  sent: number;
  total: number;
  paused: boolean;
  /** Why it stopped, when it was not the owner's Pause. */
  error: string | null;
}

export function migrationStatusColor(s: MigrationStatus): string {
  switch (s) {
    case 'ready':
    case 'committed':
      return colors.success;
    case 'validated':
      return colors.danger;
    case 'closed':
    case 'rolled_back':
      return colors.textTertiary;
    default:
      return colors.info;
  }
}

const day = (iso: string | null) => (iso ? dayjs(iso).format('DD MMM YYYY') : '');
const money = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : s;
};

export interface MigrationBatchViewProps {
  batch: MigrationBatch;
  issueGroups: IssueGroup[];
  preview: CertificatePreview | null;
  previewLoading: boolean;
  ticked: ReadonlySet<number>;
  confirmed: boolean;
  busy: BatchAction | null;
  onToggleSpot: (index: number) => void;
  onToggleConfirmed: () => void;
  onAddFiles: () => void;
  onRunChecks: () => void;
  onOpenWeb: () => void;
  onPrepare: () => void;
  onSignOff: () => void;
  onImport: () => void;
  onUndo: () => void;
  onClose: () => void;
  onCertificate: () => void;
  sending?: BackupSending | null;
  onPauseUpload?: () => void;
  onResumeUpload?: () => void;
  onCancelUpload?: () => void;
  onDiscardUpload?: (uploadId: string) => void;
}

const Tick: React.FC<{ on: boolean; label: string; onPress: () => void; testID?: string }> = ({ on, label, onPress, testID }) => (
  <TouchableOpacity
    style={styles.tick}
    onPress={onPress}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: on }}
    accessibilityLabel={label}
    testID={testID}
    activeOpacity={0.8}
  >
    <Feather name={on ? 'check-square' : 'square'} size={18} color={on ? colors.primary : colors.textTertiary} />
    <Text style={styles.tickText}>{label}</Text>
  </TouchableOpacity>
);

/** A backup being sent, read, or stopped: what is happening and what to do. */
const BackupStatus: React.FC<MigrationBatchViewProps> = p => {
  const uploads = p.batch.uploads ?? [];
  const reading = uploads.find(isUploadActive);
  const latest = uploads[0];
  const failed = latest?.status === 'failed' && !(p.batch.files ?? []).some(f => f.kind === 'ptb') ? latest : null;
  const interrupted = !p.sending ? uploads.find(u => u.status === 'receiving') : undefined;
  const s = p.sending;
  const pct = s && s.total ? Math.min(100, Math.floor((s.sent / s.total) * 100)) : 0;
  return (
    <View>
      {s && (
        <View style={styles.upload} testID="backup-sending">
          <Text style={styles.strong} numberOfLines={1}>{s.name}</Text>
          <ProgressBar pct={pct} color={s.paused ? colors.warning : colors.primary} />
          <Text style={styles.hint}>
            {formatSize(s.sent)} of {formatSize(s.total)} · {pct}%{s.paused && !s.error ? ' · paused' : ''}
          </Text>
          {s.error ? (
            <Text style={styles.error}>{s.error} Tap Resume to continue from where it stopped.</Text>
          ) : (
            <Text style={styles.hint}>Keep FinMatrix open. If you leave it, the upload pauses and continues when you come back.</Text>
          )}
          <View style={styles.uploadButtons}>
            {s.paused ? (
              <CustomButton title="Resume" variant="secondary" size="sm" onPress={() => p.onResumeUpload?.()} />
            ) : (
              <CustomButton title="Pause" variant="secondary" size="sm" onPress={() => p.onPauseUpload?.()} />
            )}
            <CustomButton title="Cancel" variant="secondary" size="sm" onPress={() => p.onCancelUpload?.()} />
          </View>
        </View>
      )}
      {!s && interrupted && (
        <View style={styles.upload}>
          <Text style={styles.strong}>{interrupted.name} ({formatSize(interrupted.size)}) did not finish uploading</Text>
          <Text style={styles.hint}>Add the same file again: it continues where it stopped, sending only the pieces still missing.</Text>
          <View style={styles.uploadButtons}>
            <CustomButton title="Discard it" variant="secondary" size="sm" onPress={() => p.onDiscardUpload?.(interrupted.id)} />
          </View>
        </View>
      )}
      {reading && (
        <View style={styles.upload} testID="backup-reading">
          <Text style={styles.strong}>Reading {/\.ptb$/i.test(reading.name) ? 'your Peachtree backup' : 'your export'} — {reading.name}</Text>
          <Text style={styles.hint}>{uploadStageText(reading.progress)}. This takes a minute or two; you can leave and come back.</Text>
        </View>
      )}
      {!reading && !s && failed && (
        <View style={styles.upload} testID="backup-failed">
          <Text style={styles.error}>{failed.name} could not be read</Text>
          <Text style={styles.text}>{failed.error ?? migrationErrorMessage(failed.errorCode)}</Text>
        </View>
      )}
    </View>
  );
};

export const MigrationBatchView: React.FC<MigrationBatchViewProps> = p => {
  const b = p.batch;
  const step = b.step || 1;
  const editable = canUpload(b.status);
  const blocking = b.issues.blocking;
  const warnings = b.issues.warning;
  const rows = b.counts?.rows ?? {};
  const signedOff = !!b.signedOffAt;
  const imported = b.status === 'committed' || b.status === 'closed';

  return (
    <View>
      {/* Where things stand */}
      <SectionCard title={sourceLabel(b.sourceSystem)} subtitle={`Cutover ${day(b.cutoverDate)}`} icon="layers" style={styles.card}
        right={<Badge label={MIGRATION_STATUS_LABEL[b.status]} color={migrationStatusColor(b.status)} />}>
        <Text style={styles.label}>
          Step {step} of 7 · {WIZARD_STEP_LABEL[step] ?? ''}
        </Text>
        <View style={styles.readiness}>
          <View style={styles.readinessBar}>
            <ProgressBar pct={b.readiness} color={b.readiness === 100 ? colors.success : colors.primary} />
          </View>
          <Text style={styles.readinessPct} testID="readiness">{b.readiness}%</Text>
        </View>
        {!imported && (
          <Text style={styles.hint}>
            Ready to import at 100%: every row decided, every match confirmed and every check passed.
          </Text>
        )}
        {b.lastError ? <Text style={styles.error}>{b.lastError}</Text> : null}
      </SectionCard>

      {/* What Peachtree must provide */}
      {editable && b.sourceSystem === 'peachtree' && (
        <SectionCard title="From Peachtree / Sage 50" icon="clipboard" style={styles.card}>
          <Text style={styles.text}>
            {"FinMatrix reads your books from the backup and proves every figure against Peachtree's own reports. The import waits until both agree to the paisa."}
          </Text>
          {[
            { done: (b.files ?? []).some(f => f.kind === 'ptb'), title: 'The Peachtree backup (.ptb)', how: 'In Peachtree: File → Back Up. Add the file it saves.' },
            ...PEACHTREE_REPORTS.map(r => ({
              done: (b.files ?? []).some(f => (f.detected ?? []).some(d => d.target === `peachtree:${r.kind}`)),
              title: `${r.title}${r.stockOnly ? ' (if you keep stock)' : ''}`,
              how: `${r.where} → ${r.title}, as of ${openingDateOf(b)}, then Excel.`,
            })),
          ].map(i => (
            <View key={i.title} style={styles.fileRow} accessibilityLabel={`${i.title}: ${i.done ? 'received' : 'not yet'}`}>
              <Feather name={i.done ? 'check-circle' : 'circle'} size={14} color={i.done ? colors.success : colors.textTertiary} />
              <View style={styles.flex}>
                <Text style={styles.strong}>{i.title}</Text>
                <Text style={styles.hint}>{i.how}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Files */}
      {editable && (
        <SectionCard title="Files" icon="paperclip" style={styles.card}>
          {(b.files ?? []).length === 0 ? (
            <Text style={styles.text}>
              Upload the starter workbook, your system's exports (Excel, CSV, text, QuickBooks IIF, Tally XML, ZIPs of
              them) or a Peachtree / Sage 50 backup (.ptb) — any file up to 2 GB.
            </Text>
          ) : (
            (b.files ?? []).map(f => (
              <View key={f.id} style={styles.fileRow}>
                <Feather name={f.kind === 'ptb' ? 'archive' : 'file'} size={14} color={colors.primary} />
                <View style={styles.flex}>
                  <Text style={styles.strong} numberOfLines={1}>{f.originalName}</Text>
                  <Text style={styles.hint}>
                    {(f.detected ?? []).map(d => `${d.sheet} → ${detectedLabel(d.target)}`).join(' · ') || 'Read'}
                  </Text>
                </View>
              </View>
            ))
          )}
          <BackupStatus {...p} />
          <View style={styles.inlineButton}>
            <CustomButton
              title="Add files"
              variant="secondary"
              size="sm"
              isLoading={p.busy === 'upload'}
              disabled={!!p.busy || (!!p.sending && !p.sending.paused)}
              onPress={p.onAddFiles}
            />
          </View>
        </SectionCard>
      )}

      {/* Matching and fixing are done on the web */}
      {needsWeb(b) && (
        <SectionCard title="Continue on the web" icon="monitor" style={styles.card}>
          <Text style={styles.text}>
            {b.status === 'validated'
              ? 'A check did not tie out. Open the migration on a computer to see which rows differ and fix them.'
              : 'Matching columns and fixing rows is easier on a bigger screen. Open this migration on a computer, then come back here to sign off and import.'}
          </Text>
          <View style={styles.inlineButton}>
            <CustomButton title="Open on the web" variant="secondary" size="sm" onPress={p.onOpenWeb} />
          </View>
        </SectionCard>
      )}

      {/* Issues, read-only */}
      {blocking + warnings > 0 && (
        <SectionCard title="Needs your attention" subtitle={`${blocking} blocking · ${warnings} warnings`} icon="alert-triangle" style={styles.card}>
          {p.issueGroups.map(g => (
            <View key={`${g.code}-${g.severity}`} style={styles.issueRow}>
              <Feather name={g.severity === 'blocking' ? 'x-circle' : 'alert-circle'} size={14} color={g.severity === 'blocking' ? colors.danger : colors.warning} />
              <Text style={styles.issueText}>{migrationErrorMessage(g.code, g.code)}</Text>
              <Text style={styles.issueCount}>{g.count}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {/* Row counts */}
      {Object.keys(rows).length > 0 && (
        <SectionCard title={imported ? 'What came across' : 'What will come across'} icon="list" style={styles.card}>
          {Object.entries(rows).map(([entity, c]) => (
            <View key={entity} style={styles.countRow}>
              <Text style={styles.countName}>{ENTITY_LABEL[entity] ?? entity}</Text>
              <Text style={styles.countValue}>
                {c.source} rows{c.rejected ? ` · ${c.rejected} skipped` : ''}{c.pending ? ` · ${c.pending} to decide` : ''}
              </Text>
            </View>
          ))}
        </SectionCard>
      )}

      {/* The eleven checks (SOURCE_READBACK first) */}
      {(b.checks?.length || canRunChecks(b)) && b.status !== 'committed' && b.status !== 'closed' && b.status !== 'rolled_back' ? (
        <SectionCard title="Reconciliation checks" subtitle="Every check must match to the rupee" icon="check-square" style={styles.card}>
          {(b.checks ?? []).map(c => (
            <View key={c.code} style={styles.checkRow} testID={`check-${c.code}`}>
              <Feather name={c.passed ? 'check-circle' : 'x-circle'} size={14} color={c.passed ? colors.success : colors.danger} />
              <View style={styles.flex}>
                <Text style={styles.strong}>{c.label}</Text>
                {!c.passed && (
                  <Text style={styles.error}>
                    Expected {c.expected}, found {c.actual} (difference {c.difference})
                  </Text>
                )}
              </View>
            </View>
          ))}
          {canRunChecks(b) && b.status !== 'ready' && (
            <View style={styles.inlineButton}>
              <CustomButton title={b.checks?.length ? 'Run the checks again' : 'Run the checks'} size="sm" isLoading={p.busy === 'checks'} disabled={!!p.busy} onPress={p.onRunChecks} />
            </View>
          )}
        </SectionCard>
      ) : null}

      {/* Ready: certificate, spot checks, sign off, import */}
      {b.status === 'ready' && (
        <SectionCard title="Review and sign off" icon="award" style={styles.card}>
          {p.previewLoading ? (
            <LoadingBlock label="Running a practice import…" />
          ) : !p.preview ? (
            <CustomButton title="Prepare the certificate" size="sm" onPress={p.onPrepare} disabled={!!p.busy} />
          ) : (
            <>
              <Text style={styles.text}>
                {p.preview.allPassed
                  ? 'A practice import posted everything and all eleven checks matched, every figure read the same two ways. Nothing has been saved yet.'
                  : 'The practice import found a difference. Nothing can be imported until every check matches.'}
              </Text>
              <View style={styles.inlineButton}>
                <CustomButton title="View the certificate" variant="text" size="sm" isLoading={p.busy === 'certificate'} onPress={p.onCertificate} />
              </View>
              {p.preview.spotChecks.length > 0 && (
                <>
                  <Text style={styles.label}>Compare these with your old books, then tick each one</Text>
                  {p.preview.spotChecks.map((s, i) => (
                    <View key={`${s.kind}-${s.name}`} style={styles.spot}>
                      <Tick on={p.ticked.has(i)} label={`${s.name} (${s.kind})`} onPress={() => p.onToggleSpot(i)} testID={`spot-${i}`} />
                      <Text style={styles.hint}>
                        {s.documents} open {s.kind === 'customer' ? 'invoices' : 'bills'} · {money(s.finmatrixBalance)}
                        {s.matches ? '' : ` · your file says ${money(s.sourceBalance)}`}
                      </Text>
                      {s.asTyped && s.asTyped.length > 0 ? (
                        <Text style={styles.hint}>As typed: {s.asTyped.join(' · ')}</Text>
                      ) : null}
                    </View>
                  ))}
                </>
              )}
              {signedOff ? (
                <NoticeBanner icon="check" message={`Signed off by ${b.signedOffBy?.name ?? 'you'} on ${day(b.signedOffAt)}.`} />
              ) : (
                <>
                  <Tick on={p.confirmed} label="I have read the certificate and the figures match my records." onPress={p.onToggleConfirmed} testID="confirm" />
                  <CustomButton
                    title="Sign off"
                    fullWidth
                    isLoading={p.busy === 'signOff'}
                    disabled={!p.preview.allPassed || !canSignOff(b, p.preview.spotChecks, p.ticked, p.confirmed) || !!p.busy}
                    onPress={p.onSignOff}
                  />
                </>
              )}
              <View style={styles.gap} />
              <CustomButton
                title="Import"
                fullWidth
                isLoading={p.busy === 'import'}
                disabled={!canImport(b) || !!p.busy}
                onPress={p.onImport}
              />
              <Text style={styles.hint}>
                Posts your opening balances dated {day(openingDateOf(b))}, the close of business before your cutover day, then closes your books through that day.
              </Text>
            </>
          )}
        </SectionCard>
      )}

      {/* After import */}
      {(b.status === 'committed' || b.status === 'closed') && (
        <SectionCard title="Imported" subtitle={day(b.committedAt)} icon="check-circle" style={styles.card}>
          <Text style={styles.text}>
            Your opening balances, open invoices, open bills and stock are in FinMatrix, and every check matched.
          </Text>
          <View style={styles.inlineButton}>
            <CustomButton title="Download certificate" variant="secondary" size="sm" isLoading={p.busy === 'certificate'} disabled={!!p.busy} onPress={p.onCertificate} />
          </View>
          {b.status === 'committed' ? (
            <View style={styles.buttonRow}>
              <View style={styles.flex}>
                <CustomButton title="Undo migration" variant="destructive" size="sm" fullWidth isLoading={p.busy === 'undo'} disabled={!!p.busy} onPress={p.onUndo} />
              </View>
              <View style={styles.flex}>
                <CustomButton title="Close migration" variant="secondary" size="sm" fullWidth isLoading={p.busy === 'close'} disabled={!!p.busy} onPress={p.onClose} />
              </View>
            </View>
          ) : (
            <Text style={styles.hint}>Closed {day(b.closedAt)} — this migration can no longer be undone.</Text>
          )}
        </SectionCard>
      )}

      {b.status === 'rolled_back' && (
        <SectionCard title="Undone" subtitle={day(b.rolledBackAt)} icon="rotate-ccw" style={styles.card}>
          <Text style={styles.text}>
            Everything this migration posted was reversed and the records it created were removed. You can start a new
            migration from the list.
          </Text>
        </SectionCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  flex: { flex: 1 },
  gap: { height: spacing.sm },
  text: { ...typography.bodySm, color: colors.textSecondary },
  strong: { ...typography.labelMd, color: colors.textPrimary },
  label: { ...typography.labelMd, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xxs },
  inlineButton: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  upload: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background, gap: spacing.xxs },
  uploadButtons: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  buttonRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  readiness: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  readinessBar: { flex: 1 },
  readinessPct: { ...typography.h5, color: colors.textPrimary },
  fileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.xs },
  issueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxs },
  issueText: { ...typography.bodySm, color: colors.textPrimary, flex: 1 },
  issueCount: { ...typography.labelMd, color: colors.textSecondary },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs },
  countName: { ...typography.bodySm, color: colors.textPrimary },
  countValue: { ...typography.caption, color: colors.textSecondary },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, paddingVertical: spacing.xxs },
  spot: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  tick: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xxs },
  tickText: { ...typography.bodySm, color: colors.textPrimary, flex: 1 },
});

export default MigrationBatchView;
