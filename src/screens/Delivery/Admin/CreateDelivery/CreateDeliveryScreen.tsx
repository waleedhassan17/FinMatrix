import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { customers } from '../../../../models/customerModel';
import { warehouseAgencies } from '../../../../models/agencyModel';
import CustomDropdown from '../../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../../Custom-Components/CustomButton';
import CustomInput from '../../../../Custom-Components/CustomInput';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  setCustomerId,
  setPriority,
  setNotes,
  addDraftItem,
  removeDraftItem,
  resetCreateDeliveryDraft,
  selectCreateDeliveryDraft,
} from './createDeliverySlice';
import { createDelivery } from '../AssignDeliveries/deliverySlice';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const zoneByCity = (city: string): string => {
  const c = city.toLowerCase();
  if (c.includes('lahore') || c.includes('gujranwala')) return 'Zone A';
  if (c.includes('karachi') || c.includes('rawalpindi')) return 'Zone B';
  if (c.includes('islamabad') || c.includes('faisalabad')) return 'Zone C';
  return 'Zone D';
};

const CreateDeliveryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const draft = useAppSelector(selectCreateDeliveryDraft);

  const [agencyId, setAgencyId] = useState(warehouseAgencies[0]?.id ?? '');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');

  const agencyOptions = useMemo(
    () => warehouseAgencies.map(a => ({ label: a.name, value: a.id })),
    [],
  );

  const customerOptions = useMemo(
    () => customers.slice(0, 20).map(c => ({ label: `${c.name} • ${c.shippingAddress.city}`, value: c.id })),
    [],
  );

  const itemOptions = useMemo(() => {
    const agency = warehouseAgencies.find(a => a.id === agencyId);
    return (agency?.inventory ?? []).map(item => ({ label: item.name, value: item.id }));
  }, [agencyId]);

  const addItemToDraft = () => {
    const agency = warehouseAgencies.find(a => a.id === agencyId);
    const item = agency?.inventory.find(i => i.id === itemId);
    const numericQty = Number(qty);

    if (!agency || !item || Number.isNaN(numericQty) || numericQty <= 0) {
      Alert.alert('Invalid item', 'Choose an agency item and valid quantity.');
      return;
    }

    dispatch(
      addDraftItem({
        agencyId: agency.id,
        agencyName: agency.name,
        itemId: item.id,
        itemName: item.name,
        quantity: numericQty,
        orderedQty: numericQty,
        unitPrice: 0,
      }),
    );

    setItemId('');
    setQty('1');
  };

  const handleCreate = () => {
    const customer = customers.find(c => c.id === draft.customerId);
    if (!customer) {
      Alert.alert('Customer required', 'Select a customer first.');
      return;
    }

    if (!draft.items.length) {
      Alert.alert('Items required', 'Add at least one delivery item.');
      return;
    }

    dispatch(
      createDelivery({
        customerId: customer.id,
        customerName: customer.name,
        zone: zoneByCity(customer.shippingAddress.city),
        scheduledDate: new Date().toISOString().slice(0, 10),
        priority: draft.priority,
        notes: draft.notes,
        items: draft.items,
      }),
    );

    dispatch(resetCreateDeliveryDraft());
    Alert.alert('Created', 'Delivery created successfully.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Delivery</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <CustomDropdown
          label="Customer"
          options={customerOptions}
          value={draft.customerId}
          onChange={value => dispatch(setCustomerId(value))}
          placeholder="Select customer"
          searchable
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Items with Quantity</Text>
          <CustomDropdown
            label="Agency"
            options={agencyOptions}
            value={agencyId}
            onChange={setAgencyId}
            placeholder="Select agency"
          />
          <CustomDropdown
            label="Item"
            options={itemOptions}
            value={itemId}
            onChange={setItemId}
            placeholder="Select item"
            searchable
          />
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="numeric"
            style={styles.qtyInput}
            placeholder="Quantity"
            placeholderTextColor={colors.textLight}
          />
          <CustomButton title="Add Item" onPress={addItemToDraft} variant="secondary" fullWidth />

          {draft.items.map((item, index) => (
            <View key={`${item.itemId}-${index}`} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemMeta}>{item.agencyName} • Qty: {item.quantity}</Text>
              </View>
              <TouchableOpacity onPress={() => dispatch(removeDraftItem(index))}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <CustomDropdown
          label="Priority"
          options={[
            { label: 'High', value: 'high' },
            { label: 'Medium', value: 'medium' },
            { label: 'Low', value: 'low' },
          ]}
          value={draft.priority}
          onChange={value => dispatch(setPriority(value as 'high' | 'medium' | 'low'))}
        />

        <CustomInput
          label="Notes"
          value={draft.notes}
          onChangeText={text => dispatch(setNotes(text))}
          placeholder="Special instructions"
          multiline
        />

        <CustomButton title="Create Delivery" onPress={handleCreate} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  back: {
    fontSize: 28,
    color: colors.textPrimary,
    marginTop: -2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  qtyInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    fontFamily: THEME.typography.fontFamily,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  remove: {
    color: colors.danger,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
});

export default CreateDeliveryScreen;
