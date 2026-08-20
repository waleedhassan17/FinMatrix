import { mapDelivery } from '../deliverySerializer';

/**
 * Regression cover for the pre-paid delivery bug.
 *
 * The backend always returned `prepaid` on a delivery (myDeliveries hands back
 * whole entities), but mapDelivery never mapped it. DeliveryRecord therefore
 * had no such field, the rider's bill screen could not tell a pre-paid job
 * from a cash one, and it asked every customer to pay — including ones who had
 * already paid. These assertions exist so the field cannot be dropped again.
 */
describe('mapDelivery — payment fields', () => {
  const base = { id: 'd1', referenceNo: 'DEL-1', customerId: 'c1' };

  it('carries prepaid through from the API payload', () => {
    expect(mapDelivery({ ...base, prepaid: true }).prepaid).toBe(true);
  });

  it('treats a cash delivery as not pre-paid', () => {
    expect(mapDelivery({ ...base, prepaid: false }).prepaid).toBe(false);
  });

  it('defaults to not pre-paid when the field is absent', () => {
    // Must be false, never undefined: the bill screen branches on it directly,
    // and an undefined would read as "cash" only by accident.
    expect(mapDelivery(base).prepaid).toBe(false);
  });

  it('accepts the snake_case spelling too', () => {
    expect(mapDelivery({ ...base, pre_paid: true }).prepaid).toBe(true);
  });

  it('passes paidStatus through faithfully', () => {
    expect(mapDelivery({ ...base, paidStatus: 'paid' }).paidStatus).toBe('paid');
    expect(mapDelivery({ ...base, paidStatus: 'unpaid' }).paidStatus).toBe('unpaid');
  });

  it('leaves paidStatus undefined when unset or unrecognised', () => {
    expect(mapDelivery(base).paidStatus).toBeUndefined();
    expect(mapDelivery({ ...base, paidStatus: null }).paidStatus).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately off-contract
    expect(mapDelivery({ ...base, paidStatus: 'weird' as any }).paidStatus).toBeUndefined();
  });
});
