import type { AgingPartyDocuments } from '../../../models/arAgingModel';
import { agingPartyDocumentsSerializer } from '../../../serializers/arAgingSerializer';

/** The most the server returns in one page. */
const PAGE = 200;

/**
 * Every open document behind one aging row, page by page.
 *
 * The drill-down asked for one page of 50 and said "Showing 50 of N" — the
 * rest of a busy customer's invoices could not be seen from the report.
 */
export async function allPartyDocuments(
  fetchPage: (query: Record<string, string>) => Promise<unknown>,
  query: Record<string, string>,
): Promise<AgingPartyDocuments> {
  const first = agingPartyDocumentsSerializer(
    await fetchPage({ ...query, limit: String(PAGE), page: '1' }),
  );
  let documents = first.documents;
  for (let page = 2; documents.length < first.total && page <= 100; page++) {
    const next = agingPartyDocumentsSerializer(
      await fetchPage({ ...query, limit: String(PAGE), page: String(page) }),
    );
    if (next.documents.length === 0) break;
    const seen = new Set(documents.map(d => d.documentId));
    documents = [...documents, ...next.documents.filter(d => !seen.has(d.documentId))];
  }
  return { ...first, documents };
}
