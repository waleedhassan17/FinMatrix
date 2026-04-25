// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/estimates
// When backend (NestJS) is ready, replace dummy logic with
// real axios/fetch calls. Only the function bodies change;
// the exported signatures stay the same.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import { estimates as seedEstimates } from '../dummy-data/estimates';
import type {
  EstimateApiEntity,
  EstimateApiPagination,
  EstimateQueryParams,
} from '../models/estimateModel';
import type { Estimate } from '../types';

// ─── In-memory store (session persistence) ───────────
let estimateStore: EstimateApiEntity[] = seedEstimates.map(e => ({
  ...e,
  lines: e.lines.map(l => ({ ...l })),
}));

// ─── Standard API response envelope ──────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/estimates
 */
export const getEstimatesAPI = async (
  params: EstimateQueryParams = {},
): Promise<any> => {
  let filtered = estimateStore.map(e => ({ ...e, lines: e.lines.map(l => ({ ...l })) }));

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      e =>
        e.estimateNumber.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(e => e.status === params.status);
  }
  if (params.customerId) {
    filtered = filtered.filter(e => e.customerId === params.customerId);
  }
  if (params.fromDate) {
    filtered = filtered.filter(e => e.issueDate >= params.fromDate!);
  }
  if (params.toDate) {
    filtered = filtered.filter(e => e.issueDate <= params.toDate!);
  }

  const page = params.page || 1;
  const limit = params.limit || 200;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const pagination: EstimateApiPagination = {
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };

  const response: ApiEnvelope<{
    estimates: EstimateApiEntity[];
    pagination: EstimateApiPagination;
  }> = {
    success: true,
    data: { estimates: paged, pagination },
  };

  return simulateApiCall(response, 800);
};

/**
 * GET /api/v1/estimates/:id
 */
export const getEstimateByIdAPI = async (id: string): Promise<any> => {
  const estimate = estimateStore.find(e => e.id === id);
  if (!estimate) throw new Error('Estimate not found');
  return simulateApiCall(
    {
      success: true,
      data: { estimate: { ...estimate, lines: estimate.lines.map(l => ({ ...l })) } },
    },
    400,
  );
};

/**
 * POST /api/v1/estimates
 */
export const createEstimateAPI = async (
  data: Omit<Estimate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newEstimate: EstimateApiEntity = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `est_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  estimateStore.push(newEstimate);
  return simulateApiCall(
    { success: true, data: { estimate: { ...newEstimate, lines: newEstimate.lines.map(l => ({ ...l })) } } },
    600,
  );
};

/**
 * PUT /api/v1/estimates/:id
 */
export const updateEstimateAPI = async (
  id: string,
  data: Partial<Estimate>,
): Promise<any> => {
  const idx = estimateStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Estimate not found');
  estimateStore[idx] = {
    ...estimateStore[idx],
    ...data,
    lines: (data.lines ?? estimateStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  } as EstimateApiEntity;
  return simulateApiCall(
    {
      success: true,
      data: {
        estimate: {
          ...estimateStore[idx],
          lines: estimateStore[idx].lines.map(l => ({ ...l })),
        },
      },
    },
    600,
  );
};

/**
 * DELETE /api/v1/estimates/:id
 */
export const deleteEstimateAPI = async (id: string): Promise<any> => {
  const idx = estimateStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Estimate not found');
  estimateStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

/**
 * POST /api/v1/estimates/:id/send
 *
 * Records that an estimate was sent to the customer (via
 * WhatsApp / email / generic share). The real backend would
 * additionally enqueue a notification / audit log entry.
 */
export const sendEstimateAPI = async (
  id: string,
  meta: { channel: 'whatsapp' | 'email' | 'share'; toPhone?: string },
): Promise<any> => {
  const idx = estimateStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Estimate not found');

  // If the estimate is still a draft, transition to "sent" automatically
  const nextStatus = estimateStore[idx].status === 'draft'
    ? 'sent'
    : estimateStore[idx].status;

  estimateStore[idx] = {
    ...estimateStore[idx],
    status: nextStatus,
    sentAt: new Date().toISOString(),
    sentChannel: meta.channel,
    sentToPhone: meta.toPhone,
    updatedAt: new Date().toISOString(),
  };

  return simulateApiCall(
    {
      success: true,
      data: {
        estimate: {
          ...estimateStore[idx],
          lines: estimateStore[idx].lines.map(l => ({ ...l })),
        },
      },
    },
    400,
  );
};

// Keep reference to silence unused import warning in some configs
void API_BASE_URL;
