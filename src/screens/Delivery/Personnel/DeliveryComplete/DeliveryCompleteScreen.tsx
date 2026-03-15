import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../../../theme';
import type { DPDeliveriesStackParamList } from '../../../../navigators/stacks/DPDeliveriesStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  selectDeliveries,
  submitShadowInventoryUpdateForDelivery,
} from '../../Admin/AssignDeliveries/deliverySlice';
import {
  selectInventoryRequestSubmitted,
  resetDeliveryCompleteState,
  setInventoryRequestSubmitted,
} from './dpDeliveryCompleteSlice';

type Props = NativeStackScreenProps<DPDeliveriesStackParamList, 'DeliveryComplete'>;

const DeliveryCompleteScreen: React.FC<Props> = ({ route, navigation }) => {
  const { deliveryId } = route.params;
  const dispatch = useAppDispatch();
  const deliveries = useAppSelector(selectDeliveries);
  const inventoryRequestSubmitted = useAppSelector(selectInventoryRequestSubmitted);

  const delivery = useMemo(() => deliveries.find(d => d.id === deliveryId), [deliveries, deliveryId]);
  const bounce = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0.9, duration: 500, useNativeDriver: true }),
      ]),
    ).start();
  }, [bounce]);

  useEffect(() => {
    dispatch(resetDeliveryCompleteState());
  }, [dispatch, deliveryId]);

  useEffect(() => {
    if (!delivery || inventoryRequestSubmitted) return;
    if (!delivery.assignedTo) return;
    dispatch(submitShadowInventoryUpdateForDelivery({ deliveryId, personnelId: delivery.assignedTo }));
    dispatch(setInventoryRequestSubmitted(true));
  }, [delivery, inventoryRequestSubmitted, dispatch, deliveryId]);

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><Text style={styles.message}>Delivery not found.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: bounce }] }]}>
          <Text style={styles.check}>✓</Text>
        </Animated.View>

        <Text style={styles.title}>Delivery Completed</Text>
        <Text style={styles.message}>Great work. The customer confirmation was recorded successfully.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryLine}><Text style={styles.bold}>Delivery: </Text>{delivery.referenceNo}</Text>
          <Text style={styles.summaryLine}><Text style={styles.bold}>Customer: </Text>{delivery.customerName}</Text>
          <Text style={styles.summaryLine}><Text style={styles.bold}>Delivered At: </Text>{delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleString() : 'Now'}</Text>
          <Text style={styles.summaryLine}><Text style={styles.bold}>Inventory Update: </Text>{inventoryRequestSubmitted ? 'Submitted' : 'Pending'}</Text>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('DPDeliveries')}
        >
          <Text style={styles.backBtnText}>Back to Deliveries</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  checkCircle: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  check: { color: colors.white, fontSize: 50, fontWeight: '800' },
  title: { ...typography.h2, color: '#166534', marginBottom: spacing.xs, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  summaryCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  summaryLine: { ...typography.small, color: colors.textPrimary, marginBottom: 4 },
  bold: { fontWeight: '700' },
  backBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  backBtnText: { ...typography.body, color: colors.white, fontWeight: '700' },
});

export default DeliveryCompleteScreen;
