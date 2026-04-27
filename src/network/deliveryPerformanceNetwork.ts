import { simulateApiCall } from './apiHelpers';
import { deliveryRecords } from '../dummy-data/deliveries';
import { dummyDeliveryPersonnel } from '../dummy-data/deliveryPersonnel';
import type { ReportDateRange } from '../models/reportModel';
import {
  type DeliveryPerformanceReport,
  type DeliveryPerformanceReportResponse,
  type DeliveryPerformanceRow,
  type DeliveryTrendPoint,
} from '../models/deliveryPerformanceModel';
import { envelope } from './_reportHelpers';

export const getDeliveryPerformanceAPI = (
  range: ReportDateRange,
): Promise<DeliveryPerformanceReportResponse> => {
  const { startDate, endDate } = range;
  const rangeDeliveries = deliveryRecords.filter(
    d => d.assignedTo && d.scheduledDate >= startDate && d.scheduledDate <= endDate,
  );

  const personnelLookup = new Map(dummyDeliveryPersonnel.map(p => [p.userId, p]));
  const rowMap = new Map<string, DeliveryPerformanceRow>();

  rangeDeliveries.forEach(d => {
    const person = personnelLookup.get(d.assignedTo!);
    if (!person) return;
    if (!rowMap.has(d.assignedTo!)) {
      rowMap.set(d.assignedTo!, {
        personId: d.assignedTo!,
        name: person.displayName,
        total: 0,
        delivered: 0,
        failed: 0,
        onTimeRate: person.onTimeRate,
      });
    }
    const row = rowMap.get(d.assignedTo!)!;
    row.total += 1;
    if (d.status === 'delivered') row.delivered += 1;
    if (d.status === 'failed' || d.status === 'returned') row.failed += 1;
  });

  const trendMap = new Map<string, DeliveryTrendPoint>();
  rangeDeliveries.forEach(d => {
    const label = d.scheduledDate.slice(5).replace('-', '/');
    if (!trendMap.has(d.scheduledDate)) {
      trendMap.set(d.scheduledDate, { label, delivered: 0, failed: 0 });
    }
    const pt = trendMap.get(d.scheduledDate)!;
    if (d.status === 'delivered') pt.delivered += 1;
    if (d.status === 'failed' || d.status === 'returned') pt.failed += 1;
  });

  return simulateApiCall(
    envelope<DeliveryPerformanceReport>({
      rows: Array.from(rowMap.values()),
      dailyTrend: Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, pt]) => pt),
    }),
    300,
  );
};
