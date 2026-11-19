// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Model + UI types
// ═══════════════════════════════════════════════════════

/**
 * open       nothing shipped or invoiced yet
 * partial    some shipped or invoiced, more to come
 * fulfilled  everything shipped, not all of it invoiced yet
 * invoiced   everything invoiced (an order invoiced in full before partial
 *            invoicing existed may still have goods to deliver)
 * closed     short-closed: the rest will not ship (can be reopened)
 * cancelled  withdrawn before anything shipped or was invoiced
 */
export type SalesOrderStatus = 'open' | 'partial' | 'fulfilled' | 'invoiced' | 'closed' | 'cancelled';
export type DiscountType = 'percent' | 'amount' | 'none';

export interface SalesOrderLine {
  id?: string;
  /** Linked inventory item, '' for a free-text/service line. Carried to the
   *  invoice this becomes, where it drives COGS. */
  itemId: string;
  description: string;
  quantity: number;
  quantityFulfilled: number;
  /** Billed on the order's live invoices. */
  quantityInvoiced: number;
  /** Shipped, not invoiced yet — what the next invoice bills. */
  toInvoice: number;
  /** Not delivered yet (0 once the order is closed or cancelled). */
  toShip: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
  /** Live stock for an item line (detail responses only). */
  onHand?: number | null;
  /** Ordered but not yet shippable from stock. */
  backorderQty?: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  expectedDate: string | null;
  status: SalesOrderStatus;
  lines: SalesOrderLine[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  notes: string;
  /** The latest live invoice raised from it; `invoices` lists them all. */
  invoiceId: string | null;
  /** Every invoice raised from this order, oldest first (detail only). */
  invoices: SalesOrderInvoiceRef[];
  /** What invoicing now would bill; null when there is nothing to bill (detail only). */
  nextInvoice: SalesOrderNextInvoice | null;
  totals: SalesOrderTotals | null;
  /** What may be done now, decided by the server (detail only). */
  actions: SalesOrderActions | null;
  /** Set when a delivery created this order: it ships and invoices it itself. */
  deliveryId: string | null;
  deliveryReference: string | null;
}

export interface SalesOrderInvoiceRef {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  balance: number;
  status: string;
}

export interface SalesOrderNextInvoice {
  /** `ship_and_invoice`: nothing shipped yet, so it ships and bills the whole
   *  order in one step. `shipped`: it bills what shipped and is not invoiced. */
  mode: 'ship_and_invoice' | 'shipped';
  /** After it, every line is billed in full. */
  isFinal: boolean;
  lines: { salesOrderLineId: string; description: string; quantity: number }[];
  total: number;
}

export interface SalesOrderTotals {
  ordered: number;
  shipped: number;
  invoiced: number;
  toInvoice: number;
  toShip: number;
  /** Billed ahead of delivery (orders invoiced in full before partial invoicing). */
  billedNotShipped: number;
}

export interface SalesOrderActions {
  ship: boolean;
  invoice: boolean;
  close: boolean;
  reopen: boolean;
  cancel: boolean;
  delete: boolean;
  edit: boolean;
  editLines: boolean;
}

const working = (s: SalesOrderStatus) => s === 'open' || s === 'partial' || s === 'fulfilled';

/**
 * What may be done with the order now: the server's answer when the detail
 * carries one, else (a list row, an older server) the status alone.
 */
export const salesOrderActions = (o: SalesOrder): SalesOrderActions => {
  if (o.actions) return o.actions;
  const w = working(o.status);
  return {
    ship: w && o.lines.some(l => l.quantityFulfilled < l.quantity),
    invoice: w,
    close: o.status === 'partial',
    reopen: o.status === 'closed',
    cancel: o.status === 'open',
    delete: o.status === 'open',
    edit: w,
    editLines: o.status === 'open',
  };
};

/** Units still to deliver on the line. */
export const remainingToShip = (l: SalesOrderLine): number => Math.max(l.quantity - l.quantityFulfilled, 0);

/** Units billed but not delivered yet — orders invoiced in full the old way. */
export const billedNotShipped = (o: SalesOrder): number =>
  o.totals?.billedNotShipped ??
  o.lines.reduce((sum, l) => sum + Math.max(l.quantityInvoiced - l.quantityFulfilled, 0), 0);

/** Shipped but not invoiced yet. */
export const shippedNotInvoiced = (o: SalesOrder): number =>
  o.totals?.toInvoice ?? o.lines.reduce((sum, l) => sum + Math.max(l.quantityFulfilled - l.quantityInvoiced, 0), 0);

/**
 * The shipment being recorded, as the API takes it: a CUMULATIVE total per
 * line (already shipped + shipping now), only for lines that ship something.
 * Returns the lines that would ship more than is left, so the screen can say
 * so before the server refuses the whole call.
 */
export const shipmentPayload = (
  lines: SalesOrderLine[],
  shipping: Record<string, string>,
): { lines: { lineId: string; quantityFulfilled: string }[]; over: string[] } => {
  const out: { lineId: string; quantityFulfilled: string }[] = [];
  const over: string[] = [];
  for (const l of lines) {
    if (!l.id) continue;
    const now = parseFloat(shipping[l.id] ?? '') || 0;
    if (now <= 0) continue;
    if (now > remainingToShip(l) + 1e-9) over.push(l.id);
    out.push({ lineId: l.id, quantityFulfilled: String(l.quantityFulfilled + now) });
  }
  return { lines: out, over };
};

/** Default for each line: ship everything that is left (services included). */
export const defaultShipping = (lines: SalesOrderLine[]): Record<string, string> =>
  Object.fromEntries(lines.filter(l => l.id).map(l => [l.id!, String(remainingToShip(l))]));

export interface SalesOrderBarPlan {
  primary: 'invoice' | 'ship' | null;
  /** The other of ship/invoice when both apply, else Edit when allowed. */
  secondary: 'invoice' | 'ship' | 'edit' | null;
}

/**
 * Which step the action bar leads with. Goods shipped and not billed are
 * invoiced first; otherwise the next shipment; an untouched order ships first
 * (its "ship and invoice everything" shortcut lives under More).
 */
export const salesOrderBarPlan = (o: SalesOrder): SalesOrderBarPlan => {
  const a = salesOrderActions(o);
  const unbilled = shippedNotInvoiced(o) > 0;
  let primary: SalesOrderBarPlan['primary'] = null;
  if (a.invoice && unbilled) primary = 'invoice';
  else if (a.ship) primary = 'ship';
  else if (a.invoice) primary = 'invoice';
  let secondary: SalesOrderBarPlan['secondary'] = null;
  if (primary === 'invoice' && a.ship) secondary = 'ship';
  else if (a.edit) secondary = 'edit';
  return { primary, secondary };
};
