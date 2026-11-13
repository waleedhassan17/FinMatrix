// ═══════════════════════════════════════════════════════
// FinMatrix — Migration Center API (owner only)
// The same endpoints the web wizard uses; mobile covers start,
// upload, status, sign-off, import, undo and close.
// ═══════════════════════════════════════════════════════
import { api, appendFileToForm, postMultipart, toApiError } from '../network/apiHelpers';
import { downloadAndShareFile } from '../network/authedDownload';
import type { CertificatePreview, IssueGroup, MigrationBatch, MigrationIssue } from '../../models/migrationModel';

const unwrap = (d: any) => (d && typeof d === 'object' && 'data' in d ? d.data : d);
const call = async <T>(fn: () => Promise<{ data: any }>): Promise<T> => {
  try {
    return unwrap((await fn()).data) as T;
  } catch (e) {
    throw toApiError(e);
  }
};

export const listMigrationsAPI = async (): Promise<MigrationBatch[]> => {
  const d = await call<MigrationBatch[] | null>(() => api.get('/migrations'));
  return Array.isArray(d) ? d : [];
};
export const getMigrationAPI = (id: string) => call<MigrationBatch>(() => api.get(`/migrations/${id}`));
export const createMigrationAPI = (body: { sourceSystem: string; cutoverDate: string }) => call<MigrationBatch>(() => api.post('/migrations', body));

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

export async function uploadMigrationFilesAPI(id: string, files: PickedFile[]): Promise<MigrationBatch> {
  const form = new FormData();
  for (const f of files) await appendFileToForm(form, 'files', f.uri, { name: f.name, type: f.mimeType || 'application/octet-stream' });
  // postMultipart already throws an ApiError carrying the server's code.
  return unwrap(await postMultipart(`/migrations/${id}/files`, form)) as MigrationBatch;
}

export const listMigrationIssuesAPI = async (id: string): Promise<{ groups: IssueGroup[]; items: MigrationIssue[]; total: number }> =>
  call(() => api.get(`/migrations/${id}/issues`, { params: { limit: 100 } }));
/** Validate, dry-run, commit and undo run the whole import on the server. */
const LONG_RUNNING = { timeout: 300_000 };

export const validateMigrationAPI = (id: string) => call<MigrationBatch>(() => api.post(`/migrations/${id}/validate`, undefined, LONG_RUNNING));
export const dryRunMigrationAPI = (id: string) => call<{ batch: MigrationBatch; certificate: CertificatePreview }>(() => api.post(`/migrations/${id}/dry-run`, undefined, LONG_RUNNING));
export const signOffMigrationAPI = (id: string) => call<MigrationBatch>(() => api.post(`/migrations/${id}/sign-off`, { confirmed: true, spotCheckDone: true }));
export const commitMigrationAPI = (id: string) => call<{ batch: MigrationBatch }>(() => api.post(`/migrations/${id}/commit`, undefined, LONG_RUNNING));
export const rollbackMigrationAPI = (id: string) => call<{ batch: MigrationBatch }>(() => api.post(`/migrations/${id}/rollback`, undefined, LONG_RUNNING));
export const closeMigrationAPI = (id: string) => call<MigrationBatch>(() => api.post(`/migrations/${id}/close`));
export const downloadMigrationCertificateAPI = (id: string) =>
  downloadAndShareFile(`/migrations/${id}/certificate`, `migration-certificate-${id.slice(0, 8)}.pdf`, 'application/pdf');
export const downloadMigrationTemplateAPI = () =>
  downloadAndShareFile('/migrations/template', 'finmatrix-starter-workbook.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
