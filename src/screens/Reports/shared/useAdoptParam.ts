// A period or date handed to a report by another one — the balance sheet's
// "Net Income (current fiscal year)", a cockpit card — is adopted into the
// report's slice as if the user had chosen it, so the screen's focus refresh
// leaves it alone.
//
// Until the store holds it, the report's fetch must wait: the screen's first
// fetch would otherwise ask for the period the slice held before, and with no
// request id to tell them apart, whichever response landed last would stay on
// screen — possibly the wrong one.

import { useCallback, useEffect, useRef } from 'react';

/**
 * @param incomingKey the handed-in value as a string (null when none)
 * @param currentKey the slice's value as the same kind of string
 * @param adopt dispatches the value into the slice
 * @returns `ready(key)` — call it first in the fetch effect with the slice's
 *   current key; false means "skip this fetch, the adopted value is coming".
 */
export const useAdoptParam = (
  incomingKey: string | null,
  currentKey: string,
  adopt: () => void,
): ((key: string) => boolean) => {
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (!incomingKey) return;
    // Already showing it: nothing to wait for, and a guard left set here
    // would hold back the next real change.
    if (incomingKey !== currentKey) pending.current = incomingKey;
    adopt();
    // Only when a new value is handed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingKey]);

  return useCallback((key: string) => {
    if (pending.current && pending.current !== key) return false;
    pending.current = null;
    return true;
  }, []);
};

export const rangeKey = (r: { startDate: string; endDate: string } | undefined | null): string | null =>
  r ? `${r.startDate}|${r.endDate}` : null;
