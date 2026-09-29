import React, { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import CreditLimitModal from '../components/shared/CreditLimitModal';
import { creditAssessmentFrom, type CreditAssessment } from '../models/creditModel';

/**
 * Handles a CREDIT_LIMIT_EXCEEDED refusal on any sale or dispatch.
 *
 *   const credit = useCreditLimitPrompt();
 *   catch (e) { if (credit.prompt(e, reason => retry(reason))) return; … }
 *   return <>…{credit.modal}</>;
 *
 * `prompt` returns false for any other error, so the caller shows it as usual.
 * The owner's override retries the same action with their reason; "Record
 * advance" opens Receive Payment for the customer.
 */
export const useCreditLimitPrompt = () => {
  const navigation = useNavigation<any>();
  const [state, setState] = useState<{ assessment: CreditAssessment; retry: (reason: string) => void } | null>(null);

  const prompt = useCallback((error: unknown, retry: (reason: string) => void): boolean => {
    const assessment = creditAssessmentFrom(error);
    if (!assessment) return false;
    setState({ assessment, retry });
    return true;
  }, []);

  const modal = (
    <CreditLimitModal
      assessment={state?.assessment ?? null}
      onClose={() => setState(null)}
      onOverride={reason => {
        const retry = state?.retry;
        setState(null);
        retry?.(reason);
      }}
      onRecordAdvance={a => {
        setState(null);
        // Receive Payment is a shared record screen, registered in every tab
        // stack (navigations-maps/sharedRecords) — including the ones the
        // delivery screens sit in — so this is always a push, and back returns
        // to the screen that raised the prompt.
        navigation.navigate('ReceivePayment', { customerId: a.customerId });
      }}
    />
  );

  return { prompt, modal };
};
