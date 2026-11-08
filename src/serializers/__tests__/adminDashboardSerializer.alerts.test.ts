import { dashboardAlertsSerializer } from '../adminDashboardSerializer';
import type { AdminDashboardData } from '../../models/adminDashboardModel';

const withAlerts = (alerts: unknown[]) => ({ alerts } as unknown as AdminDashboardData);

describe('dashboardAlertsSerializer', () => {
  it('carries count and amount from a current server', () => {
    expect(
      dashboardAlertsSerializer(
        withAlerts([{ id: 'overdue', severity: 'red', message: '3 invoices are past due.', count: 3, amount: 9000 }]),
      ),
    ).toEqual([{ id: 'overdue', severity: 'red', message: '3 invoices are past due.', count: 3, amount: 9000 }]);
  });

  it('reads the count from the front of the sentence when an older server omits it', () => {
    const [overdue, delivery] = dashboardAlertsSerializer(
      withAlerts([
        { id: 'overdue', severity: 'red', message: '1 overdue invoice(s) require attention.' },
        { id: 'pending_delivery', severity: 'blue', message: '5 delivery order(s) awaiting assignment.' },
      ]),
    );
    expect(overdue.count).toBe(1);
    expect(delivery.count).toBe(5);
  });

  it('leaves count unset for a sentence that does not lead with a number', () => {
    const [bills] = dashboardAlertsSerializer(
      withAlerts([{ id: 'pending_bills', severity: 'amber', message: 'You have pending bills totalling Rs 4,000.' }]),
    );
    expect(bills).toEqual({
      id: 'pending_bills',
      severity: 'amber',
      message: 'You have pending bills totalling Rs 4,000.',
    });
  });

  it('prefers the explicit count over the sentence, and accepts numeric strings', () => {
    const [a] = dashboardAlertsSerializer(
      withAlerts([{ id: 'overdue', severity: 'red', message: '5 of something', count: '2', amount: 'n/a' }]),
    );
    expect(a.count).toBe(2);
    expect(a.amount).toBeUndefined();
  });

  it('returns no alerts when the field is missing', () => {
    expect(dashboardAlertsSerializer({} as AdminDashboardData)).toEqual([]);
  });
});
