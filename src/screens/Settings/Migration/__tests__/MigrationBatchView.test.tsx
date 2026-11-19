// One migration on a phone, per status: what the owner sees and which
// buttons are live. Sign-off waits for every spot check and the confirmation;
// Import waits for sign-off; Undo and Close appear only after the import.
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('../../../../Custom-Components/CustomButton', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => (
      <RN.TouchableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress} disabled={disabled}>
        <RN.Text>{title}</RN.Text>
      </RN.TouchableOpacity>
    ),
  };
});
jest.mock('../../../../components/reports/ReportUI', () => {
  const RN = jest.requireActual('react-native');
  return {
    SectionCard: ({ title, subtitle, right, children }: any) => (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        {subtitle ? <RN.Text>{subtitle}</RN.Text> : null}
        {right}
        {children}
      </RN.View>
    ),
    Badge: ({ label }: any) => <RN.Text>{label}</RN.Text>,
    LoadingBlock: ({ label }: any) => <RN.Text>{label}</RN.Text>,
    NoticeBanner: ({ message }: any) => <RN.Text>{message}</RN.Text>,
    ProgressBar: (): null => null,
  };
});

import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { MigrationBatchView, type MigrationBatchViewProps } from '../MigrationBatchView';
import type { CertificatePreview, MigrationBatch, MigrationCheck, MigrationUploadView } from '../../../../models/migrationModel';

const check = (code: string, passed = true): MigrationCheck => ({
  code,
  label: code.replace(/_/g, ' ').toLowerCase(),
  expected: '100.00',
  actual: passed ? '100.00' : '90.00',
  difference: passed ? '0.00' : '10.00',
  passed,
  details: [],
});
const NINE = ['ROWS_ACCOUNTED', 'SOURCE_TB_BALANCED', 'ACCOUNT_BY_ACCOUNT', 'CLEARING_ZERO', 'AR_MATCHES', 'AP_MATCHES', 'INVENTORY_MATCHES', 'BALANCE_SHEET_BALANCES', 'ROUND_TRIP'];

const batch = (over: Partial<MigrationBatch> = {}): MigrationBatch => ({
  id: 'b1',
  sourceSystem: 'finmatrix_template',
  cutoverDate: '2026-07-01',
  status: 'mapped',
  step: 3,
  readiness: 60,
  counts: {
    rows: { customers: { source: 3, imported: 0, merged: 0, rejected: 0, pending: 0 } },
    issues: { blocking: 0, warning: 0, resolved: 0 },
    mappings: { total: 10, confident: 10 },
  },
  checks: null,
  issues: { blocking: 0, warning: 0 },
  lastError: null,
  signedOffAt: null,
  signedOffBy: null,
  committedAt: null,
  closedAt: null,
  rolledBackAt: null,
  certificateAvailable: false,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  files: [],
  ...over,
});

const preview: CertificatePreview = {
  allPassed: true,
  checks: NINE.map(c => check(c)),
  spotChecks: [
    { kind: 'customer', name: 'Ali Traders', documents: 2, asTyped: ['۵۰۰', 'Rs 500'], sourceBalance: '1000.00', finmatrixBalance: '1000.00', matches: true },
    { kind: 'vendor', name: 'Karachi Foods', documents: 1, sourceBalance: '500.00', finmatrixBalance: '500.00', matches: true },
  ],
  rejectedTotal: 0,
  rowCounts: [],
};

const handlers = () => ({
  onToggleSpot: jest.fn(),
  onToggleConfirmed: jest.fn(),
  onAddFiles: jest.fn(),
  onRunChecks: jest.fn(),
  onOpenWeb: jest.fn(),
  onPrepare: jest.fn(),
  onSignOff: jest.fn(),
  onImport: jest.fn(),
  onUndo: jest.fn(),
  onClose: jest.fn(),
  onCertificate: jest.fn(),
});

const render = (over: Partial<MigrationBatchViewProps> = {}) => {
  const h = handlers();
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <MigrationBatchView
        batch={batch()}
        issueGroups={[]}
        preview={null}
        previewLoading={false}
        ticked={new Set()}
        confirmed={false}
        busy={null}
        {...h}
        {...over}
      />,
    );
  });
  const texts = () => tree.root.findAllByType(Text).map(t => [].concat(t.props.children).join(''));
  const has = (s: string | RegExp) => texts().some(t => (typeof s === 'string' ? t.includes(s) : s.test(t)));
  const button = (title: string) => tree.root.findAll(n => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === title)[0];
  return { tree, h, has, button };
};

describe('MigrationBatchView', () => {
  it('sends unfinished matching to the web', () => {
    const { has, button, h } = render({
      batch: batch({ counts: { rows: {}, issues: { blocking: 0, warning: 0, resolved: 0 }, mappings: { total: 10, confident: 6 } } }),
    });
    expect(has('Continue on the web')).toBe(true);
    act(() => button('Open on the web').props.onPress());
    expect(h.onOpenWeb).toHaveBeenCalled();
  });

  it('lists open issues in plain words, read-only', () => {
    const { has, button } = render({
      batch: batch({ issues: { blocking: 2, warning: 1 } }),
      issueGroups: [
        { code: 'UNKNOWN_CUSTOMER', severity: 'blocking', count: 2 },
        { code: 'AMBIGUOUS_DATE_FORMAT', severity: 'warning', count: 1 },
      ],
    });
    expect(has('2 blocking · 1 warnings')).toBe(true);
    expect(has(/names a customer we cannot find/)).toBe(true);
    expect(has('Continue on the web')).toBe(true);
    // With a blocking issue open the checks cannot run yet.
    expect(button('Run the checks')).toBeUndefined();
  });

  it('runs the checks once everything is matched', () => {
    const { button, h, has } = render();
    expect(has('Continue on the web')).toBe(false);
    act(() => button('Run the checks').props.onPress());
    expect(h.onRunChecks).toHaveBeenCalled();
  });

  it('shows a failed check with its difference', () => {
    const { has, button } = render({
      batch: batch({ status: 'validated', step: 5, checks: NINE.map((c, i) => check(c, i !== 4)) }),
    });
    expect(has('Expected 100.00, found 90.00 (difference 10.00)')).toBe(true);
    expect(has(/A check did not tie out/)).toBe(true);
    expect(button('Run the checks again')).toBeDefined();
  });

  it('keeps Sign off disabled until every spot check is ticked and the certificate confirmed', () => {
    const ready = batch({ status: 'ready', step: 6, readiness: 100, checks: NINE.map(c => check(c)) });
    const none = render({ batch: ready, preview });
    expect(none.button('Sign off').props.disabled).toBe(true);
    expect(none.button('Import').props.disabled).toBe(true);

    const oneTicked = render({ batch: ready, preview, ticked: new Set([0]), confirmed: true });
    expect(oneTicked.button('Sign off').props.disabled).toBe(true);

    const allTickedNotConfirmed = render({ batch: ready, preview, ticked: new Set([0, 1]) });
    expect(allTickedNotConfirmed.button('Sign off').props.disabled).toBe(true);

    const all = render({ batch: ready, preview, ticked: new Set([0, 1]), confirmed: true });
    expect(all.button('Sign off').props.disabled).toBe(false);
    act(() => all.button('Sign off').props.onPress());
    expect(all.h.onSignOff).toHaveBeenCalled();
  });

  it('ticks a spot check through its handler', () => {
    const { tree, h } = render({ batch: batch({ status: 'ready', readiness: 100 }), preview });
    const box = tree.root.findAll(n => n.props.accessibilityRole === 'checkbox' && n.props.testID === 'spot-1')[0];
    act(() => box.props.onPress());
    expect(h.onToggleSpot).toHaveBeenCalledWith(1);
  });

  it('shows each spot check\'s amounts exactly as typed', () => {
    const { has } = render({ batch: batch({ status: 'ready', readiness: 100 }), preview });
    expect(has('As typed: ۵۰۰ · Rs 500')).toBe(true);
    expect(has(/all eleven checks matched/)).toBe(true);
  });

  it('enables Import once signed off', () => {
    const { button, has, h } = render({
      batch: batch({ status: 'ready', readiness: 100, signedOffAt: '2026-11-02T10:00:00Z', signedOffBy: { id: 'u1', name: 'Owner' } }),
      preview,
    });
    expect(has(/Signed off by Owner/)).toBe(true);
    expect(button('Sign off')).toBeUndefined();
    expect(button('Import').props.disabled).toBe(false);
    act(() => button('Import').props.onPress());
    expect(h.onImport).toHaveBeenCalled();
  });

  it('never enables Sign off when the practice import found a difference', () => {
    const { button } = render({
      batch: batch({ status: 'ready', readiness: 100 }),
      preview: { ...preview, allPassed: false },
      ticked: new Set([0, 1]),
      confirmed: true,
    });
    expect(button('Sign off').props.disabled).toBe(true);
  });

  it('runs the practice import while ready', () => {
    const { has } = render({ batch: batch({ status: 'ready', readiness: 100 }), previewLoading: true });
    expect(has('Running a practice import…')).toBe(true);
  });

  it('offers the certificate, Undo and Close after the import', () => {
    const { button, h, has } = render({ batch: batch({ status: 'committed', step: 7, readiness: 100, committedAt: '2026-11-02T10:00:00Z' }) });
    expect(button('Add files')).toBeUndefined();
    expect(has('What came across')).toBe(true);
    expect(has(/Ready to import at 100%/)).toBe(false);
    act(() => button('Undo migration').props.onPress());
    act(() => button('Close migration').props.onPress());
    act(() => button('Download certificate').props.onPress());
    expect(h.onUndo).toHaveBeenCalled();
    expect(h.onClose).toHaveBeenCalled();
    expect(h.onCertificate).toHaveBeenCalled();
  });

  it('cannot be undone once closed', () => {
    const { button, has } = render({ batch: batch({ status: 'closed', step: 7, committedAt: '2026-11-02T10:00:00Z', closedAt: '2026-11-03T10:00:00Z' }) });
    expect(button('Undo migration')).toBeUndefined();
    expect(has(/can no longer be undone/)).toBe(true);
    expect(button('Download certificate')).toBeDefined();
  });

  it('says what an undo did', () => {
    const { has, button } = render({ batch: batch({ status: 'rolled_back', step: 7, rolledBackAt: '2026-11-03T10:00:00Z' }) });
    expect(has('Undone')).toBe(true);
    expect(button('Import')).toBeUndefined();
  });

  it('shows a backup on its way, with Pause, and Resume once paused', () => {
    const onPauseUpload = jest.fn();
    const onResumeUpload = jest.fn();
    const sending = { name: 'FAROOQ.ptb', sent: 100 * 1024 * 1024, total: 253.6 * 1024 * 1024, paused: false, error: null as string | null };
    const live = render({ batch: batch({ status: 'uploaded', sourceSystem: 'peachtree' }), sending, onPauseUpload, onResumeUpload });
    expect(live.has(/100\.0 MB of 253\.6 MB · 39%/)).toBe(true);
    expect(live.has(/Keep FinMatrix open/)).toBe(true);
    act(() => live.button('Pause').props.onPress());
    expect(onPauseUpload).toHaveBeenCalled();
    // Add files waits while it is being sent.
    expect(live.button('Add files').props.disabled).toBe(true);
    const paused = render({ batch: batch({ status: 'uploaded' }), sending: { ...sending, paused: true, error: 'Network error.' }, onResumeUpload });
    expect(paused.has(/Network error\. Tap Resume/)).toBe(true);
    act(() => paused.button('Resume').props.onPress());
    expect(onResumeUpload).toHaveBeenCalled();
  });

  it('shows the server reading the backup, and why one could not be read', () => {
    const upload: Omit<MigrationUploadView, 'status' | 'progress'> = { id: 'u1', name: 'FAROOQ.ptb', size: 253618655, fileId: null, updatedAt: '', errorCode: null, error: null };
    const reading = render({ batch: batch({ status: 'uploaded', uploads: [{ ...upload, status: 'reading', progress: { stage: 'reading', detail: 'JrnlRow', done: 1, total: 2 } }] }) });
    expect(reading.has(/Reading your Peachtree backup — FAROOQ\.ptb/)).toBe(true);
    expect(reading.has(/Reading Peachtree's books — JrnlRow, 50%/)).toBe(true);
    const failed = render({ batch: batch({ status: 'uploaded', uploads: [{ ...upload, status: 'failed', progress: null, errorCode: 'MIGRATION_PTB_TABLE_MISSING', error: 'JRNLROW.DAT is missing.' }] }) });
    expect(failed.has('FAROOQ.ptb could not be read')).toBe(true);
    expect(failed.has('JRNLROW.DAT is missing.')).toBe(true);
  });

  it('offers to discard an upload that did not finish', () => {
    const onDiscardUpload = jest.fn();
    const r = render({
      batch: batch({ status: 'uploaded', uploads: [{ id: 'u9', name: 'FAROOQ.ptb', size: 253618655, status: 'receiving', progress: null, errorCode: null, error: null, fileId: null, updatedAt: '' }] }),
      onDiscardUpload,
    });
    expect(r.has(/did not finish uploading/)).toBe(true);
    act(() => r.button('Discard it').props.onPress());
    expect(onDiscardUpload).toHaveBeenCalledWith('u9');
  });

  it('lists what Peachtree must provide, and what each report is', () => {
    const r = render({
      batch: batch({
        status: 'uploaded',
        sourceSystem: 'peachtree',
        cutoverDate: '2026-10-06',
        files: [
          { id: 'f1', originalName: 'FAROOQ.ptb', sizeBytes: 253618655, kind: 'ptb', detected: [] },
          { id: 'f2', originalName: 'TB.xlsx', sizeBytes: 9000, kind: 'xlsx', detected: [{ sheet: 'TB', target: 'peachtree:trial_balance', confidence: 1, rows: 90 }] },
        ],
      }),
    });
    expect(r.has('From Peachtree / Sage 50')).toBe(true);
    expect(r.has(/as of 2026-10-05, then Excel/)).toBe(true);
    expect(r.has('TB → Peachtree / Sage 50 Trial balance')).toBe(true);
    const marks = r.tree.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && /: (received|not yet)$/.test(n.props.accessibilityLabel) && n.props.style !== undefined);
    const labels = [...new Set(marks.map(m => m.props.accessibilityLabel))];
    expect(labels.filter(l => l.endsWith('received'))).toHaveLength(2);
    expect(labels.filter(l => l.endsWith('not yet'))).toHaveLength(3);
  });
});
