import type {
  SalesOrder, SalesOrderLine, SalesOrderStatus, DiscountType,
  SalesOrderActions, SalesOrderInvoiceRef, SalesOrderNextInvoice, SalesOrderTotals,
} from '../models/salesOrderModel';

const toNum = (v: any): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const mapSalesOrderLine = (raw: any): SalesOrderLine => ({
  id: raw.id,
  // '' rather than null so it drops straight into CustomDropdown's `value`.
  itemId: raw.itemId ?? '',
  description: raw.description ?? '',
  quantity: toNum(raw.quantity),
  quantityFulfilled: toNum(raw.quantityFulfilled),
  quantityInvoiced: toNum(raw.quantityInvoiced),
  toInvoice: toNum(raw.toInvoice),
  toShip: toNum(raw.toShip),
  unitPrice: toNum(raw.unitPrice),
  taxRate: toNum(raw.taxRate),
  lineTotal: toNum(raw.lineTotal),
  onHand: raw.stock ? toNum(raw.stock.onHand) : null,
  backorderQty: toNum(raw.backorderQty),
});

const mapInvoiceRef = (raw: any): SalesOrderInvoiceRef => ({
  id: raw?.id ?? '',
  invoiceNumber: raw?.invoiceNumber ?? '',
  invoiceDate: raw?.invoiceDate ?? '',
  total: toNum(raw?.total),
  balance: toNum(raw?.balance),
  status: raw?.status ?? '',
});

const mapNextInvoice = (raw: any): SalesOrderNextInvoice | null =>
  raw && typeof raw === 'object'
    ? {
        mode: raw.mode === 'ship_and_invoice' ? 'ship_and_invoice' : 'shipped',
        isFinal: raw.isFinal === true,
        lines: Array.isArray(raw.lines)
          ? raw.lines.map((l: any) => ({
              salesOrderLineId: l?.salesOrderLineId ?? '',
              description: l?.description ?? '',
              quantity: toNum(l?.quantity),
            }))
          : [],
        total: toNum(raw.total),
      }
    : null;

const mapTotals = (raw: any): SalesOrderTotals | null =>
  raw && typeof raw === 'object'
    ? {
        ordered: toNum(raw.ordered),
        shipped: toNum(raw.shipped),
        invoiced: toNum(raw.invoiced),
        toInvoice: toNum(raw.toInvoice),
        toShip: toNum(raw.toShip),
        billedNotShipped: toNum(raw.billedNotShipped),
      }
    : null;

const mapActions = (raw: any): SalesOrderActions | null =>
  raw && typeof raw === 'object'
    ? {
        ship: raw.ship === true,
        invoice: raw.invoice === true,
        close: raw.close === true,
        reopen: raw.reopen === true,
        cancel: raw.cancel === true,
        delete: raw.delete === true,
        edit: raw.edit === true,
        editLines: raw.editLines === true,
      }
    : null;

export const mapSalesOrder = (raw: any): SalesOrder => ({
  id: raw.id ?? '',
  orderNumber: raw.orderNumber ?? '',
  customerId: raw.customerId ?? '',
  customerName: raw.customerName ?? raw.customer?.name ?? '',
  orderDate: raw.orderDate ?? '',
  expectedDate: raw.expectedDate ?? null,
  status: (raw.status ?? 'open') as SalesOrderStatus,
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapSalesOrderLine) : [],
  subtotal: toNum(raw.subtotal),
  discountType: (raw.discountType ?? 'none') as DiscountType,
  discountValue: toNum(raw.discountValue),
  discountAmount: toNum(raw.discountAmount),
  taxAmount: toNum(raw.taxAmount),
  total: toNum(raw.total),
  notes: raw.notes ?? '',
  invoiceId: raw.invoiceId ?? null,
  invoices: Array.isArray(raw.invoices) ? raw.invoices.map(mapInvoiceRef) : [],
  nextInvoice: mapNextInvoice(raw.nextInvoice),
  totals: mapTotals(raw.totals),
  actions: mapActions(raw.actions),
  deliveryId: raw.deliveryId ?? null,
  deliveryReference: raw.deliveryReference ?? null,
});

export interface SerializedSalesOrderList { salesOrders: SalesOrder[]; }

export function salesOrderListSerializer(payload: any): SerializedSalesOrderList {
  const d = payload?.data ?? payload;
  const arr: any[] = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
  return { salesOrders: arr.map(mapSalesOrder) };
}

export function salesOrderSingleSerializer(payload: any): SalesOrder | null {
  const raw = payload?.data?.salesOrder ?? payload?.data ?? payload;
  if (!raw || Array.isArray(raw) || !raw.id) return null;
  return mapSalesOrder(raw);
}
