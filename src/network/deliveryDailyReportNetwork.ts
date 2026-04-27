import { simulateApiCall } from './apiHelpers';
import { deliveryRecords } from '../dummy-data/deliveries';
import { dummyDeliveryPersonnel } from '../dummy-data/deliveryPersonnel';
import { round2 } from '../models/reportModel';
import {
  type DeliveryAgencyCount,
  type DeliveryDailyReport,
  type DeliveryDailyReportResponse,
  type DeliveryPersonnelStat,
} from '../models/deliveryDailyReportModel';
import { envelope } from './_reportHelpers';

export const getDeliveryDailyReportAPI = (
  date: string,
): Promise<DeliveryDailyReportResponse> => {
  const dayDeliveries = deliveryRecords.filter(d => d.scheduledDate === date);
  const total = dayDeliveries.length;
  const completed = dayDeliveries.filter(d => d.status === 'delivered').length;
  const failed = dayDeliveries.filter(d => d.status === 'failed' || d.status === 'returned').length;
  const onTimePercent = total > 0 ? round2((completed / total) * 100) : 0;

  const personnelLookup = new Map(dummyDeliveryPersonnel.map(p => [p.userId, p]));
  const statsMap = new Map<string, DeliveryPersonnelStat>();

  dayDeliveries.forEach(delivery => {
    if (!delivery.assignedTo) return;
    const person = personnelLookup.get(delivery.assignedTo);
    if (!person) return;
    if (!statsMap.has(delivery.assignedTo)) {
      statsMap.set(delivery.assignedTo, {
        personId: delivery.assignedTo,
        name: person.displayName,
        total: 0,
        delivered: 0,
        failed: 0,
        onTimeRate: person.onTimeRate,
      });
    }
    const stat = statsMap.get(delivery.assignedTo)!;
    stat.total += 1;
    if (delivery.status === 'delivered') stat.delivered += 1;
    if (delivery.status === 'failed' || delivery.status === 'returned') stat.failed += 1;
  });

  const agencyMap = new Map<string, DeliveryAgencyCount>();
  dayDeliveries.forEach(delivery => {
    const seenAgencies = new Set<string>();
    delivery.items.forEach(item => {
      if (seenAgencies.has(item.agencyId)) return;
      seenAgencies.add(item.agencyId);
      if (!agencyMap.has(item.agencyId)) {
        agencyMap.set(item.agencyId, {
          agencyId: item.agencyId,
          agencyName: item.agencyName,
          count: 0,
        });
      }
      agencyMap.get(item.agencyId)!.count += 1;
    });
  });

  return simulateApiCall(
    envelope<DeliveryDailyReport>({
      date,
      total,
      completed,
      failed,
      onTimePercent,
      personnelStats: Array.from(statsMap.values()),
      agencyDistribution: Array.from(agencyMap.values()),
    }),
    300,
  );
};
