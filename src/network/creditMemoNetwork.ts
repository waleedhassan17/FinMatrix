// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { creditMemos as seedCreditMemos } from '../dummy-data/creditMemos';
import type { CreditMemo } from '../types';

let cmStore: CreditMemo[] = [...seedCreditMemos.map(c => ({ ...c, lines: c.lines.map(l => ({ ...l })) }))];

export const getCreditMemosAPI = async (): Promise<CreditMemo[]> =>
  simulateApiCall(cmStore.map(c => ({ ...c, lines: c.lines.map(l => ({ ...l })) })), 800);

export const getCreditMemoByIdAPI = async (id: string): Promise<CreditMemo> => {
  const cm = cmStore.find(c => c.id === id);
  if (!cm) throw new Error('Credit memo not found');
  return simulateApiCall({ ...cm, lines: cm.lines.map(l => ({ ...l })) }, 400);
};

export const createCreditMemoAPI = async (
  data: Omit<CreditMemo, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CreditMemo> => {
  const newCM: CreditMemo = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `cm_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cmStore.push(newCM);
  return simulateApiCall(newCM, 600);
};

export const updateCreditMemoAPI = async (
  id: string,
  data: Partial<CreditMemo>,
): Promise<CreditMemo> => {
  const idx = cmStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Credit memo not found');
  cmStore[idx] = {
    ...cmStore[idx],
    ...data,
    lines: (data.lines ?? cmStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...cmStore[idx], lines: cmStore[idx].lines.map(l => ({ ...l })) }, 600);
};

export const deleteCreditMemoAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = cmStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Credit memo not found');
  cmStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};
