// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { estimates as seedEstimates } from '../dummy-data/estimates';
import type { Estimate } from '../types';

let estimateStore: Estimate[] = [...seedEstimates.map(e => ({ ...e, lines: e.lines.map(l => ({ ...l })) }))];

export const getEstimatesAPI = async (): Promise<Estimate[]> =>
  simulateApiCall(estimateStore.map(e => ({ ...e, lines: e.lines.map(l => ({ ...l })) })), 800);

export const getEstimateByIdAPI = async (id: string): Promise<Estimate> => {
  const estimate = estimateStore.find(e => e.id === id);
  if (!estimate) throw new Error('Estimate not found');
  return simulateApiCall({ ...estimate, lines: estimate.lines.map(l => ({ ...l })) }, 400);
};

export const createEstimateAPI = async (
  data: Omit<Estimate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Estimate> => {
  const newEstimate: Estimate = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `est_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  estimateStore.push(newEstimate);
  return simulateApiCall(newEstimate, 600);
};

export const updateEstimateAPI = async (
  id: string,
  data: Partial<Estimate>,
): Promise<Estimate> => {
  const idx = estimateStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Estimate not found');
  estimateStore[idx] = {
    ...estimateStore[idx],
    ...data,
    lines: (data.lines ?? estimateStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...estimateStore[idx], lines: estimateStore[idx].lines.map(l => ({ ...l })) }, 600);
};

export const deleteEstimateAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = estimateStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Estimate not found');
  estimateStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};
