import {
  notificationListSerializer,
  notificationSerializer,
  unreadCountSerializer,
} from '../notificationSerializer';

const row = {
  id: 'n1',
  type: 'delivery_assigned',
  title: 'Delivery assigned',
  message: 'DO-104 is yours.',
  isRead: false,
  createdAt: '2026-11-09T08:00:00.000Z',
  data: { deliveryId: 'd1' },
};

describe('notificationListSerializer', () => {
  it('reads the paged envelope the server sends', () => {
    const list = notificationListSerializer({ success: true, data: [row], pagination: { page: 1, total: 1 } });
    expect(list).toEqual([
      {
        id: 'n1',
        type: 'delivery_assigned',
        title: 'Delivery assigned',
        body: 'DO-104 is yours.',
        isRead: false,
        createdAt: '2026-11-09T08:00:00.000Z',
        data: { deliveryId: 'd1' },
      },
    ]);
  });

  it('also reads a doubly wrapped list and a bare array', () => {
    expect(notificationListSerializer({ data: { data: [row] } })).toHaveLength(1);
    expect(notificationListSerializer([row])).toHaveLength(1);
  });

  it('degrades to an empty list rather than throwing', () => {
    expect(notificationListSerializer(null)).toEqual([]);
    expect(notificationListSerializer({ success: true, data: { count: 3 } })).toEqual([]);
  });

  it('drops rows with no id and defaults missing fields', () => {
    const list = notificationListSerializer({ data: [{ title: 'no id' }, { id: 'n2', isRead: 'yes', data: 'x' }] });
    expect(list).toEqual([
      { id: 'n2', type: 'system', title: '', body: '', isRead: false, createdAt: '', data: {} },
    ]);
  });
});

describe('notificationSerializer', () => {
  it('returns null for something that is not a row', () => {
    expect(notificationSerializer('n1')).toBeNull();
  });
});

describe('unreadCountSerializer', () => {
  it('reads the enveloped count', () => {
    expect(unreadCountSerializer({ success: true, data: { count: 4 } })).toBe(4);
  });

  it('reads a bare count and a numeric string', () => {
    expect(unreadCountSerializer({ count: 2 })).toBe(2);
    expect(unreadCountSerializer({ data: { count: '7' } })).toBe(7);
  });

  it('treats anything unreadable or negative as zero', () => {
    expect(unreadCountSerializer(undefined)).toBe(0);
    expect(unreadCountSerializer({ data: { count: -1 } })).toBe(0);
    expect(unreadCountSerializer({ data: { count: 'many' } })).toBe(0);
  });
});
