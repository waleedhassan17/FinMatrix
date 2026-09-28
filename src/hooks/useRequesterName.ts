import { useEffect, useState } from 'react';

import { getAllUsersAPI } from '../networks/settings/settingsNetwork';

/**
 * Turn an approval's `requestedBy` user id into a name, as the web does.
 *
 * The request row carries only the id, and a review screen reading "Raised by
 * 72943b2b-…" is no help to the owner deciding it. The team list is
 * owner-only, which is fine: only the owner reviews. Falls back to a neutral
 * phrase — never the raw id — when the list cannot be read.
 */
export const useRequesterName = (userId: string | null | undefined): string => {
  const [names, setNames] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getAllUsersAPI()
      .then(raw => {
        if (cancelled) return;
        const body = raw?.data ?? raw;
        const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
        setNames(
          new Map(
            list
              .filter(u => u?.id)
              .map(u => [String(u.id), String(u.name || u.username || u.email || '')] as [string, string]),
          ),
        );
      })
      .catch(() => !cancelled && setNames(new Map()));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return '';
  return names?.get(userId) || 'a staff member';
};
