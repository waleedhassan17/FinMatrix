import { simulateApiCall } from './apiHelpers';
import {
  AUDIT_ENTRIES,
  SEARCH_INDEX,
  type AuditEntry,
  type AuditModule,
  type AuditAction,
  type SearchResult,
} from '../dummy-data/auditAndSearch';

/* ─── Audit Trail ─── */
export interface AuditFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  module?: AuditModule;
  action?: AuditAction;
}

export const fetchAuditTrail = (filters: AuditFilters): Promise<AuditEntry[]> => {
  let results = [...AUDIT_ENTRIES];
  if (filters.dateFrom) {
    results = results.filter(e => e.timestamp >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    results = results.filter(e => e.timestamp <= filters.dateTo!);
  }
  if (filters.userId) {
    results = results.filter(e => e.userId === filters.userId);
  }
  if (filters.module) {
    results = results.filter(e => e.module === filters.module);
  }
  if (filters.action) {
    results = results.filter(e => e.action === filters.action);
  }
  return simulateApiCall(results, 500);
};

/* ─── Global Search ─── */
export const searchAll = (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return simulateApiCall([], 100);
  const q = query.toLowerCase();
  const results = SEARCH_INDEX.filter(
    s => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q),
  );
  return simulateApiCall(results, 300);
};
