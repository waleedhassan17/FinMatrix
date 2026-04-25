// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/sales-orders
// When backend (NestJS) is ready, replace dummy logic with
// real axios/fetch calls. Only the function bodies change;
// the exported signatures stay the same.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import { salesOrders as seedSalesOrders } from '../dummy-data/salesOrders';
import type {
  SalesOrderApiEntity,
  SalesOrderApiPagination,
  SalesOrderQueryParams,
} from '../models/salesOrderModel';
import type { SalesOrder } from '../types';

// ─── In-memory store (session persistence) ───────────
let soStore: SalesOrderApiEntity[] = seedSalesOrders.map(s => ({
  ...s,
  lines: s.lines.map(l => ({ ...l })),
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
 * GET /api/v1/sales-orders
 */
export const getSalesOrdersAPI = async (
  params: SalesOrderQueryParams = {},
): Promise<any> => {
  let filtered = soStore.map(s => ({ ...s, lines: s.lines.map(l => ({ ...l })) }));

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      s =>
        s.soNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(s => s.status === params.status);
  }
  if (params.customerId) {
    filtered = filtered.filter(s => s.customerId === params.customerId);
  }
  if (params.fromDate) {
    filtered = filtered.filter(s => s.orderDate >= params.fromDate!);
  }
  if (params.toDate) {
    filtered = filtered.filter(s => s.orderDate <= params.toDate!);
  }

  const page = params.page || 1;
  const limit = params.limit || 200;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const pagination: SalesOrderApiPagination = {
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };

  const response: ApiEnvelope<{
    salesOrders: SalesOrderApiEntity[];
    pagination: SalesOrderApiPagination;
  }> = {
    success: true,
    data: { salesOrders: paged, pagination },
  };

  return simulateApiCall(response, 800);
};

/**
 * GET /api/v1/sales-orders/:id
 */
export const getSalesOrderByIdAPI = async (id: string): Promise<any> => {
  const so = soStore.find(s => s.id === id);
  if (!so) throw new Error('Sales order not found');
  return simulateApiCall(
    {
      success: true,
      data: { salesOrder: { ...so, lines: so.lines.map(l => ({ ...l })) } },
    },
    400,
  );
};

/**
 * POST /api/v1/sales-orders
 */
export const createSalesOrderAPI = async (
  data: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newSO: SalesOrderApiEntity = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `so_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  soStore.push(newSO);
  return simulateApiCall(
    { success: true, data: { salesOrder: { ...newSO, lines: newSO.lines.map(l => ({ ...l })) } } },
    600,
  );
};

/**
 * PUT /api/v1/sales-orders/:id
 */
export const updateSalesOrderAPI = async (
  id: string,
  data: Partial<SalesOrder>,
): Promise<any> => {
  const idx = soStore.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Sales order not found');
  soStore[idx] = {
    ...soStore[idx],
    ...data,
    lines: (data.lines ?? soStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  } as SalesOrderApiEntity;
  return simulateApiCall(
    {
      success: true,
      data: {
        salesOrder: {
          ...soStore[idx],
          lines: soStore[idx].lines.map(l => ({ ...l })),
        },
      },
    },
    600,
  );
};

/**
 * DELETE /api/v1/sales-orders/:id
 */
export const deleteSalesOrderAPI = async (id: string): Promise<any> => {
  const idx = soStore.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Sales order not found');
  soStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

/**
 * POST /api/v1/sales-orders/:id/send
 *
 * Records that a sales order was sent to the customer (via
 * WhatsApp / email / generic share). The real backend would
 * additionally enqueue a notification / audit log entry.
 */
export const sendSalesOrderAPI = async (
  id: string,
  meta: { channel: 'whatsapp' | 'email' | 'share'; toPhone?: string },
): Promise<any> => {
  const idx = soStore.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('Sales order not found');

  soStore[idx] = {
    ...soStore[idx],
    sentAt: new Date().toISOString(),
    sentChannel: meta.channel,
    sentToPhone: meta.toPhone,
    updatedAt: new Date().toISOString(),
  };

  return simulateApiCall(
    {
      success: true,
      data: {
        salesOrder: {
          ...soStore[idx],
          lines: soStore[idx].lines.map(l => ({ ...l })),
        },
      },
    },
    400,
  );
};

// Keep reference to silence unused import warning in some configs
void API_BASE_URL;
