import { notificationTarget, timeAgo } from '../notificationDisplay';

const on = { showDelivery: true };

describe('notificationTarget', () => {
  it('opens the approval queue for approval notices', () => {
    expect(notificationTarget({ type: 'inventory_approvals', data: { requestId: 'r1' } }, on)).toEqual({
      screen: 'InventoryApproval',
    });
    expect(notificationTarget({ type: 'approval_results', data: {} }, on)).toEqual({ screen: 'InventoryApproval' });
  });

  it('opens the delivery itself when the id is there, else the monitor', () => {
    expect(notificationTarget({ type: 'delivery_assigned', data: { deliveryId: 'd9' } }, on)).toEqual({
      screen: 'AdminDeliveryDetail',
      params: { deliveryId: 'd9' },
    });
    expect(notificationTarget({ type: 'delivery_assigned', data: { deliveryId: '  ' } }, on)).toEqual({
      screen: 'DeliveryMonitor',
    });
  });

  it('opens the rider list when riders were paused', () => {
    expect(notificationTarget({ type: 'personnel_plan_locked', data: {} }, on)).toEqual({
      screen: 'DeliveryPersonnelList',
    });
  });

  it('leaves subscription notices and unknown types as plain rows', () => {
    expect(notificationTarget({ type: 'subscription_expiring', data: { route: 'billing' } }, on)).toBeNull();
    expect(notificationTarget({ type: 'whatsapp_allowance', data: {} }, on)).toBeNull();
  });

  it('ignores the server route name, which may belong to another stack', () => {
    expect(notificationTarget({ type: 'something_new', data: { route: 'DPHistory' } }, on)).toBeNull();
  });

  it('offers no delivery screen to a company that cannot see deliveries', () => {
    expect(
      notificationTarget({ type: 'delivery_assigned', data: { deliveryId: 'd9' } }, { showDelivery: false }),
    ).toBeNull();
  });
});

describe('timeAgo', () => {
  const now = new Date(2026, 10, 9, 14, 0, 0); // Mon Nov 9 2026, 14:00 local
  const at = (d: Date) => d.toISOString();

  it('reads seconds as just now, and minutes and hours as short ages', () => {
    expect(timeAgo(at(new Date(2026, 10, 9, 13, 59, 30)), now)).toBe('Just now');
    expect(timeAgo(at(new Date(2026, 10, 9, 13, 48)), now)).toBe('12m ago');
    expect(timeAgo(at(new Date(2026, 10, 9, 11, 0)), now)).toBe('3h ago');
  });

  it('says Yesterday for anything since the start of yesterday', () => {
    expect(timeAgo(at(new Date(2026, 10, 8, 23, 0)), now)).toBe('Yesterday');
    expect(timeAgo(at(new Date(2026, 10, 8, 0, 5)), now)).toBe('Yesterday');
  });

  it('falls back to a date, with the year only when it differs', () => {
    expect(timeAgo(at(new Date(2026, 10, 2, 9, 0)), now)).toBe('Nov 2');
    expect(timeAgo(at(new Date(2025, 11, 30, 9, 0)), now)).toBe('Dec 30, 2025');
  });

  it('gives an empty string, not "Invalid Date", for a bad timestamp', () => {
    expect(timeAgo('', now)).toBe('');
    expect(timeAgo('not a date', now)).toBe('');
  });
});
