import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius } from '../../../../theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectDeliveries, updateDeliveryStatus } from '../../Admin/AssignDeliveries/deliverySlice';
import type { DPDeliveriesStackParamList } from '../../../../navigators/stacks/DPDeliveriesStack';
import CustomButton from '../../../../Custom-Components/CustomButton';

type Props = NativeStackScreenProps<DPDeliveriesStackParamList, 'DPDeliveryDetail'>;

const STATUS_COLORS: Record<string, string> = {
  pending: '#2563EB',
  picked_up: '#8B5CF6',
  in_transit: '#D97706',
  arrived: '#0EA5E9',
  delivered: '#059669',
  failed: '#DC2626',
  returned: '#7C3AED',
  unassigned: '#6B7280',
};

const EXECUTION_STEPS: Array<{ key: string; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'delivered', label: 'Delivered' },
];

const DPDeliveryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { deliveryId } = route.params;
  const dispatch = useAppDispatch();
  const deliveries = useAppSelector(selectDeliveries);

  const delivery = useMemo(
    () => deliveries.find(item => item.id === deliveryId),
    [deliveries, deliveryId],
  );

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Delivery Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Delivery not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const openMap = () => {
    const target = delivery.address ?? delivery.zone;
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(target)}`;
    Linking.openURL(mapUrl).catch(() => Alert.alert('Map', target));
  };

  const callCustomer = () => {
    if (!delivery.customerPhone) {
      Alert.alert('No phone', 'No customer phone found for this delivery.');
      return;
    }
    Linking.openURL(`tel:${delivery.customerPhone}`).catch(() => Alert.alert('Phone', delivery.customerPhone));
  };

  const actionConfig = (() => {
    if (delivery.status === 'pending') {
      return {
        title: 'Pick Up Items',
        handler: () => dispatch(updateDeliveryStatus({
          deliveryId: delivery.id,
          status: 'picked_up',
          note: `Items picked up at ${new Date().toISOString()}`,
        })),
      };
    }

    if (delivery.status === 'picked_up') {
      return {
        title: 'Start Delivery',
        handler: () => dispatch(updateDeliveryStatus({
          deliveryId: delivery.id,
          status: 'in_transit',
          note: `Delivery started at ${new Date().toISOString()}`,
        })),
      };
    }

    if (delivery.status === 'in_transit') {
      return {
        title: 'Arrived at Location',
        handler: () => dispatch(updateDeliveryStatus({
          deliveryId: delivery.id,
          status: 'arrived',
          note: `Arrived at location at ${new Date().toISOString()}`,
        })),
      };
    }

    if (delivery.status === 'arrived') {
      return {
        title: 'Capture Signature',
        handler: () => navigation.navigate('SignatureCapture', { deliveryId: delivery.id }),
      };
    }

    return null;
  })();

  const currentStepIndex = Math.max(
    EXECUTION_STEPS.findIndex(step => step.key === delivery.status),
    0,
  );

  const handleStart = () => {
    dispatch(updateDeliveryStatus({ deliveryId: delivery.id, status: 'in_transit', note: 'Started by delivery personnel' }));
    Alert.alert('Started', 'Delivery moved to in transit.');
  };

  const handleComplete = () => {
    dispatch(updateDeliveryStatus({ deliveryId: delivery.id, status: 'delivered', note: 'Delivered successfully' }));
    Alert.alert('Completed', 'Delivery marked as delivered.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{delivery.referenceNo}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.valueMain}>{delivery.customerName}</Text>
          <TouchableOpacity onPress={openMap}><Text style={[styles.valueSub, styles.link]}>{delivery.address ?? delivery.zone} (Open Map)</Text></TouchableOpacity>
          {delivery.customerPhone && <TouchableOpacity onPress={callCustomer}><Text style={[styles.valueSub, styles.link]}>{delivery.customerPhone} (Call)</Text></TouchableOpacity>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery</Text>
          <View style={styles.row}><Text style={styles.label}>Priority</Text><Text style={styles.value}>{delivery.priority.toUpperCase()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={[styles.value, { color: STATUS_COLORS[delivery.status] }]}>{delivery.status.replace('_', ' ')}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Scheduled</Text><Text style={styles.value}>{delivery.scheduledDate}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Items</Text><Text style={styles.value}>{delivery.items.length}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items Table</Text>
          <View style={[styles.itemRow, styles.itemHead]}>
            <Text style={[styles.itemName, styles.tableHead]}>Item</Text>
            <Text style={[styles.itemQty, styles.tableHead]}>Qty</Text>
          </View>
          {delivery.items.map(item => (
            <View key={item.itemId} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.itemName}</Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.valueSub}>{delivery.notes ?? 'No notes added.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status Progress</Text>
          <View style={styles.progressTrack}>
            {EXECUTION_STEPS.map((step, index) => {
              const active = index <= currentStepIndex;
              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={[styles.progressDot, active && styles.progressDotActive]} />
                  <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{step.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {actionConfig && <CustomButton title={actionConfig.title} onPress={actionConfig.handler} fullWidth />}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: { ...typography.small, color: colors.primary, fontWeight: '700' },
  title: { ...typography.h4, color: colors.textPrimary },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  valueMain: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  valueSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  link: { color: colors.secondary, textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.caption, color: colors.textPrimary, textTransform: 'capitalize' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  itemHead: {
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    paddingTop: 0,
  },
  tableHead: { fontWeight: '700', color: colors.textPrimary },
  itemName: { ...typography.small, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  itemQty: { ...typography.small, color: colors.textSecondary, fontWeight: '700' },
  progressTrack: {
    gap: spacing.sm,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
  },
  progressDotActive: {
    backgroundColor: '#16A34A',
  },
  progressLabel: { ...typography.caption, color: '#94A3B8' },
  progressLabelActive: { color: '#166534', fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...typography.body, color: colors.textSecondary },
});

export default DPDeliveryDetailScreen;
