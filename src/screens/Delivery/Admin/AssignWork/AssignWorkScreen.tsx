import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HEADER_NAVY } from '../../../../components/reports/ReportUI';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUnassignedDeliveries, selectDeliveryPersonnel, assignSelectedDeliveries, autoAssignDeliveries } from '../AssignDeliveries/deliverySlice';
import { selectAssignWorkState, toggleDelivery, setPersonnel, resetAssignWork } from './assignWorkSlice';
import CustomButton from '../../../../Custom-Components/CustomButton';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#0F766E',
};

type Props = NativeStackScreenProps<MoreStackParamList, 'AssignWork'>;

const AssignWorkScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const deliveries = useAppSelector(selectUnassignedDeliveries);
  const personnel = useAppSelector(selectDeliveryPersonnel).filter(p => p.status === 'active');
  const assignState = useAppSelector(selectAssignWorkState);

  const selectedDeliveries = useMemo(
    () => deliveries.filter(d => assignState.selectedDeliveryIds.includes(d.id)),
    [deliveries, assignState.selectedDeliveryIds],
  );

  const selectedPerson = personnel.find(p => p.userId === assignState.selectedPersonnelId);

  const handleAssign = () => {
    if (!assignState.selectedDeliveryIds.length || !assignState.selectedPersonnelId) {
      Alert.alert('Missing selection', 'Select deliveries and one personnel before assigning.');
      return;
    }

    dispatch(assignSelectedDeliveries({
      deliveryIds: assignState.selectedDeliveryIds,
      personnelId: assignState.selectedPersonnelId,
    }));
    dispatch({
      type: 'delivery/assignDelivery',
      payload: {
        deliveryIds: assignState.selectedDeliveryIds,
        personnelId: assignState.selectedPersonnelId,
      },
    });
    dispatch(resetAssignWork());
    Alert.alert('Assigned', 'Selected deliveries moved to pending and notifications dispatched.');
  };

  const handleAutoAssign = () => {
    dispatch(autoAssignDeliveries({ deliveryIds: assignState.selectedDeliveryIds.length ? assignState.selectedDeliveryIds : undefined }));
    dispatch(resetAssignWork());
    Alert.alert('Auto-assigned', 'Sorted by priority and allocated to lowest-load matching-zone personnel.');
  };

  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={styles.body}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Assign Work</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Panel 1: Select Deliveries</Text>
          {deliveries.map(d => {
            const selected = assignState.selectedDeliveryIds.includes(d.id);
            return (
              <TouchableOpacity key={d.id} style={styles.row} onPress={() => dispatch(toggleDelivery(d.id))}>
                <View style={[styles.check, selected && styles.checkSelected]}>
                  {selected && <Text style={styles.checkTick}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.referenceNo} • {d.zone}</Text>
                  <Text style={styles.rowSub}>{d.customerName}</Text>
                </View>
                <Text style={[styles.priority, { color: PRIORITY_COLORS[d.priority] }]}>{d.priority.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Panel 2: Select Personnel</Text>
          {personnel.map(p => {
            const selected = assignState.selectedPersonnelId === p.userId;
            return (
              <TouchableOpacity key={p.userId} style={styles.row} onPress={() => dispatch(setPersonnel(p.userId))}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.displayName}</Text>
                  <Text style={styles.rowSub}>{p.currentLoad}/{p.maxLoad} load • {p.zones.join(', ')}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Panel 3: Review & Assign</Text>
          <Text style={styles.summary}>Deliveries selected: {selectedDeliveries.length}</Text>
          <Text style={styles.summary}>Personnel selected: {selectedPerson ? selectedPerson.displayName : 'None'}</Text>
          <View style={{ marginTop: spacing.md }}>
            <CustomButton title="Assign Selected" onPress={handleAssign} fullWidth />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <CustomButton title="Auto-Assign" onPress={handleAutoAssign} variant="secondary" fullWidth />
          </View>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeTop: { backgroundColor: HEADER_NAVY[0] },
  body: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: HEADER_NAVY[0],
  },
  back: {
    fontSize: 28,
    color: colors.textPrimary,
    marginTop: -2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  panel: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  check: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkTick: {
    color: colors.white,
    fontWeight: '700',
  },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  rowSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  priority: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  summary: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default AssignWorkScreen;
