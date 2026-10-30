// The header's share button on a statement: render, hand to the share sheet,
// and say so if it could not. One busy flag, so a second tap while the PDF
// renders does not open a second sheet.

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useCompanyInfo } from '../../../utils/companyInfo';
import { shareReportPdf } from '../../../utils/reportPdf';
import type { ReportDoc } from '../../../utils/reportHtml';

export const useShareReportPdf = (): { busy: boolean; share: (doc: ReportDoc | null) => Promise<void> } => {
  const company = useCompanyInfo();
  const [busy, setBusy] = useState(false);
  const share = useCallback(
    async (doc: ReportDoc | null) => {
      if (!doc || busy) return;
      setBusy(true);
      try {
        const r = await shareReportPdf(doc, company);
        if (!r.done && r.reason) Alert.alert('Could not share', r.reason);
      } catch (e: any) {
        Alert.alert('Could not share', e?.message ?? 'The PDF could not be created.');
      } finally {
        setBusy(false);
      }
    },
    [busy, company],
  );
  return { busy, share };
};
