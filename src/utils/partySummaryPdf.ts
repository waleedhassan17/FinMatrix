// ═══════════════════════════════════════════════════════
// FinMatrix — Outstanding-invoices / payables summary (PDF + share)
// ═══════════════════════════════════════════════════════
// Renders a PartySummary into the same document the website produces — the
// letterhead, who it is for, every unpaid invoice or bill and how late, the
// credits that come off, the figure to ask for, and the aging — and hands it
// to the platform:
//
//   share     → native share sheet with the PDF attached (WhatsApp, Gmail,
//               Drive…) — the one route that sends the file itself
//   save      → a copy where the user chooses (Android folder picker, iOS
//               "Save to Files" through the share sheet)
//   WhatsApp  → the party's own chat, the summary already written; wa.me
//               cannot carry an attachment, which is what "share" is for
//
// The app's web build has no printToFileAsync, and expo-print's printAsync
// there prints the CURRENT page, not this HTML — so on web the document opens
// in its own window with the print dialog, where "Save as PDF" is the download.

import { Linking, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import {
  SUMMARY_COPY,
  normalizeWhatsappPhone,
  summaryFilename,
  summaryMessage,
  type PartySummary,
} from '../models/partySummaryModel';
import { DEFAULT_COMPANY, type CompanyInfo } from './invoicePdf';
import { buildPartySummaryHtml } from './partySummaryHtml';

export interface SummaryActionResult {
  done: boolean;
  /** Why not, in words for the user. A cancelled picker is not an error. */
  reason?: string;
}

// ─── Platform hand-offs ───────────────────────────────

/** Native: render and keep it in the app's cache under a readable name. */
async function renderToCache(s: PartySummary, company: CompanyInfo): Promise<{ uri: string; filename: string }> {
  const { uri: tmp } = await Print.printToFileAsync({ html: buildPartySummaryHtml(s, company), base64: false });
  const filename = summaryFilename(s);
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  try {
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.moveAsync({ from: tmp, to: dest });
    return { uri: dest, filename };
  } catch {
    // Still a valid PDF under its temporary name.
    return { uri: tmp, filename };
  }
}

/** Web: the document in its own window, with the print dialog — "Save as PDF" there. */
function printOnWeb(s: PartySummary, company: CompanyInfo): SummaryActionResult {
  const w = window.open('', '_blank');
  if (!w) return { done: false, reason: 'Allow pop-ups for this site to print or save the summary.' };
  w.document.open();
  w.document.write(buildPartySummaryHtml(s, company));
  w.document.close();
  w.focus();
  // Let the new document lay out before the dialog snapshots it.
  setTimeout(() => w.print(), 300);
  return { done: true };
}

/** The share sheet with the PDF attached — WhatsApp, Gmail, Drive… */
export async function sharePartySummaryPdf(
  s: PartySummary,
  company: CompanyInfo = DEFAULT_COMPANY,
): Promise<SummaryActionResult> {
  if (Platform.OS === 'web') return printOnWeb(s, company);
  if (!(await Sharing.isAvailableAsync())) {
    return { done: false, reason: 'Sharing is not available on this device.' };
  }
  const { uri } = await renderToCache(s, company);
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Share ${SUMMARY_COPY[s.partyType].title.toLowerCase()} — ${s.party.name}`,
  });
  return { done: true };
}

/** A copy saved where the user chooses. */
export async function savePartySummaryPdf(
  s: PartySummary,
  company: CompanyInfo = DEFAULT_COMPANY,
): Promise<SummaryActionResult> {
  if (Platform.OS === 'web') return printOnWeb(s, company);
  const filename = summaryFilename(s);
  if (Platform.OS === 'android') {
    // Storage Access Framework: the user picks a folder (Downloads, say) and
    // the PDF is written there — a real, lasting download.
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) return { done: false };
    const { base64 } = await Print.printToFileAsync({ html: buildPartySummaryHtml(s, company), base64: true });
    if (!base64) return { done: false, reason: 'The PDF could not be created. Please try again.' };
    // The name goes WITHOUT its extension: the provider adds one for the MIME
    // type, and some would otherwise write "….pdf.pdf".
    const dest = await FileSystem.StorageAccessFramework.createFileAsync(
      perm.directoryUri,
      filename.replace(/\.pdf$/i, ''),
      'application/pdf',
    );
    await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
    return { done: true };
  }
  // iOS has no folder picker; "Save to Files" on the share sheet is the download.
  if (!(await Sharing.isAvailableAsync())) {
    return { done: false, reason: 'Saving is not available on this device.' };
  }
  const { uri } = await renderToCache(s, company);
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Save ${filename}` });
  return { done: true };
}

/**
 * The party's WhatsApp chat, the summary already written.
 *
 * wa.me cannot carry a file — no link can — so this sends the text, which
 * lists what is owed on its own; "Share PDF" is the route that attaches it.
 */
export async function openPartySummaryInWhatsApp(
  s: PartySummary,
  company: CompanyInfo = DEFAULT_COMPANY,
): Promise<SummaryActionResult> {
  const phone = normalizeWhatsappPhone(s.party.phone);
  if (!phone) {
    return { done: false, reason: `${s.party.name} has no mobile number on file. Add one to their profile, or use Share PDF.` };
  }
  const text = encodeURIComponent(summaryMessage(s, company.name));
  const url = `https://wa.me/${phone}?text=${text}`;
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return { done: true };
  }
  try {
    await Linking.openURL(url);
    return { done: true };
  } catch {
    // Older Android builds where https is not claimed by WhatsApp.
    try {
      await Linking.openURL(`whatsapp://send?phone=${phone}&text=${text}`);
      return { done: true };
    } catch {
      return { done: false, reason: 'WhatsApp could not be opened on this device.' };
    }
  }
}
