// The rules the mobile Migration Center reads: when to send the owner to the
// web, when the checks can run, when sign-off and import are enabled.
import {
  canImport,
  canRunChecks,
  canSignOff,
  canUpload,
  needsWeb,
  webBatchUrl,
  type MigrationBatch,
  type SpotCheck,
} from '../migrationModel';
import { anyExportInFlight, formatBytes } from '../dataPortabilityModel';

const batch = (over: Partial<MigrationBatch> = {}): MigrationBatch => ({
  id: 'b1',
  sourceSystem: 'finmatrix_template',
  cutoverDate: '2026-07-01',
  status: 'mapped',
  step: 3,
  readiness: 60,
  counts: { rows: {}, issues: { blocking: 0, warning: 0, resolved: 0 }, mappings: { total: 10, confident: 10 } },
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
  ...over,
});

const spots: SpotCheck[] = [
  { kind: 'customer', name: 'Ali Traders', documents: 2, sourceBalance: '1000.00', finmatrixBalance: '1000.00', matches: true },
  { kind: 'vendor', name: 'Karachi Foods', documents: 1, sourceBalance: '500.00', finmatrixBalance: '500.00', matches: true },
];

describe('needsWeb', () => {
  it('points to the web while a sheet still needs matching', () => {
    expect(needsWeb(batch({ status: 'uploaded' }))).toBe(true);
    expect(needsWeb(batch({ counts: { rows: {}, issues: { blocking: 0, warning: 0, resolved: 0 }, mappings: { total: 10, confident: 7 } } }))).toBe(true);
  });
  it('points to the web while a blocking issue is open or a check failed', () => {
    expect(needsWeb(batch({ issues: { blocking: 2, warning: 0 } }))).toBe(true);
    expect(needsWeb(batch({ status: 'validated' }))).toBe(true);
  });
  it('stays on the phone once everything is matched, and from ready on', () => {
    expect(needsWeb(batch())).toBe(false);
    for (const status of ['draft', 'ready', 'committed', 'closed', 'rolled_back'] as const) {
      expect(needsWeb(batch({ status }))).toBe(false);
    }
  });
});

describe('actions by status', () => {
  it('accepts files until the import', () => {
    expect(['draft', 'uploaded', 'mapped', 'validated'].every(s => canUpload(s as any))).toBe(true);
    expect(['ready', 'committed', 'closed', 'rolled_back'].some(s => canUpload(s as any))).toBe(false);
  });
  it('runs the checks only with no blocking issue', () => {
    expect(canRunChecks(batch())).toBe(true);
    expect(canRunChecks(batch({ issues: { blocking: 1, warning: 0 } }))).toBe(false);
    expect(canRunChecks(batch({ status: 'uploaded' }))).toBe(false);
  });
  it('signs off only when ready, confirmed and every spot check is ticked', () => {
    const ready = batch({ status: 'ready', readiness: 100 });
    expect(canSignOff(ready, spots, new Set([0, 1]), true)).toBe(true);
    expect(canSignOff(ready, spots, new Set([0]), true)).toBe(false);
    expect(canSignOff(ready, spots, new Set([0, 1]), false)).toBe(false);
    expect(canSignOff(batch({ status: 'validated' }), spots, new Set([0, 1]), true)).toBe(false);
  });
  it('imports only a ready, 100%, signed-off batch', () => {
    expect(canImport(batch({ status: 'ready', readiness: 100, signedOffAt: '2026-11-02T00:00:00Z' }))).toBe(true);
    expect(canImport(batch({ status: 'ready', readiness: 100 }))).toBe(false);
    expect(canImport(batch({ status: 'ready', readiness: 99, signedOffAt: '2026-11-02T00:00:00Z' }))).toBe(false);
  });
  it('links a batch to its web wizard', () => {
    expect(webBatchUrl('https://app.example.test/', 'abc')).toBe('https://app.example.test/settings/migration/abc');
  });
});

describe('backup model', () => {
  it('polls only while a backup is being built', () => {
    expect(anyExportInFlight([{ status: 'ready' }, { status: 'running' }])).toBe(true);
    expect(anyExportInFlight([{ status: 'ready' }, { status: 'failed' }, { status: 'expired' }])).toBe(false);
  });
  it('formats sizes', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });
});
