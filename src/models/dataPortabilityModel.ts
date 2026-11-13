// ═══════════════════════════════════════════════════════
// FinMatrix — Company backup (data portability) model
// A backup is a server job: queued → running → ready | failed;
// a ready file expires after 24 hours.
// ═══════════════════════════════════════════════════════

export type ExportStatus = 'queued' | 'running' | 'ready' | 'failed' | 'expired';

export interface CompanyExport {
  id: string;
  status: ExportStatus;
  includeXlsx: boolean;
  fileName: string;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  sizeBytes: number | null;
  error: string | null;
  downloadUrl: string | null;
}

export const EXPORT_STATUS_LABEL: Record<ExportStatus, string> = {
  queued: 'Waiting to start',
  running: 'Building…',
  ready: 'Ready',
  failed: 'Failed',
  expired: 'Expired',
};

export const isExportInFlight = (e: Pick<CompanyExport, 'status'>) => e.status === 'queued' || e.status === 'running';
export const anyExportInFlight = (list: Array<Pick<CompanyExport, 'status'>>) => list.some(isExportInFlight);

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
