// ═══════════════════════════════════════════════════════
// FinMatrix — A financial statement, shared as a PDF
// ═══════════════════════════════════════════════════════
// Renders a ReportDoc and hands it to the share sheet — WhatsApp, Gmail,
// Drive — under a readable filename. The same platform hand-off the
// outstanding-invoices summary uses (partySummaryPdf): on web, where there is
// no printToFileAsync, the document opens in its own window with the print
// dialog, and "Save as PDF" there is the download.

import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { DEFAULT_COMPANY, type CompanyInfo } from './invoicePdf';
import { buildReportHtml, isLandscape, reportFilename, type ReportDoc } from './reportHtml';

export interface ReportPdfResult {
  done: boolean;
  /** Why not, in words for the user. */
  reason?: string;
}

// A4 in points: what expo-print sizes the page by on iOS (Android takes the
// CSS @page size the HTML already carries).
const A4 = { width: 595, height: 842 };

function printOnWeb(html: string): ReportPdfResult {
  const w = window.open('', '_blank');
  if (!w) return { done: false, reason: 'Allow pop-ups for this site to print or save the statement.' };
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  // Let the new document lay out before the dialog snapshots it.
  setTimeout(() => w.print(), 300);
  return { done: true };
}

export async function shareReportPdf(
  doc: ReportDoc,
  company: CompanyInfo = DEFAULT_COMPANY,
): Promise<ReportPdfResult> {
  const html = buildReportHtml(doc, company);
  if (Platform.OS === 'web') return printOnWeb(html);
  if (!(await Sharing.isAvailableAsync())) {
    return { done: false, reason: 'Sharing is not available on this device.' };
  }
  const landscape = isLandscape(doc);
  const { uri: tmp } = await Print.printToFileAsync({
    html,
    base64: false,
    width: landscape ? A4.height : A4.width,
    height: landscape ? A4.width : A4.height,
  });
  const filename = reportFilename(doc);
  let uri = tmp;
  try {
    const dest = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.moveAsync({ from: tmp, to: dest });
    uri = dest;
  } catch {
    // Still a valid PDF under its temporary name.
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Share ${doc.title} — ${doc.periodLabel}`,
  });
  return { done: true };
}
