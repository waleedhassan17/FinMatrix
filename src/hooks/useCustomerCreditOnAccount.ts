import { useEffect, useState } from 'react';

import { getARPartySummaryAPI } from '../networks/reports/arAgingNetwork';
import { partySummarySerializer } from '../serializers/partySummarySerializer';

/**
 * The credit a customer already has with us — advances and open credit memos
 * together — from the customer summary, the same figure the web's invoice page
 * offers as "Use credit". An advance held for a delivery still on the road is
 * not in it: the server would refuse to spend it.
 *
 * Keyed by customer, so a stale figure for the previous customer is never
 * shown while the next one loads. `refreshKey` re-reads it when it changes —
 * pass something that moves when the credit might have been spent, such as
 * the invoice's amount paid.
 */
export const useCustomerCreditOnAccount = (
  customerId: string | undefined,
  enabled = true,
  refreshKey: unknown = null,
) => {
  const [loaded, setLoaded] = useState<{ customerId: string; total: number } | null>(null);

  useEffect(() => {
    if (!customerId || !enabled) return;
    let cancelled = false;
    getARPartySummaryAPI(customerId)
      .then(raw => {
        if (cancelled) return;
        const total = partySummarySerializer(raw)?.credits.total ?? 0;
        setLoaded({ customerId, total: Math.round(total * 100) / 100 });
      })
      // A failed lookup hides the offer; it never blocks recording a payment.
      .catch(() => !cancelled && setLoaded({ customerId, total: 0 }));
    return () => {
      cancelled = true;
    };
  }, [customerId, enabled, refreshKey]);

  return enabled && loaded && loaded.customerId === customerId ? loaded.total : 0;
};
