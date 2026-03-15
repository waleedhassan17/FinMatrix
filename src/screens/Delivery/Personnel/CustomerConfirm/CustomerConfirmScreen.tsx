import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, borderRadius } from '../../../../theme';
import type { DPDeliveriesStackParamList } from '../../../../navigators/stacks/DPDeliveriesStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  confirmCustomerReceipt,
  reportDeliveryIssue,
  selectDeliveries,
} from '../../Admin/AssignDeliveries/deliverySlice';
import {
  selectIssueModalVisible,
  selectIssueText,
  setIssueModalVisible,
  setIssueText,
  resetCustomerConfirmState,
} from './dpCustomerConfirmSlice';
import AppLogo from '../../../../Custom-Components/AppLogo';

type Props = NativeStackScreenProps<DPDeliveriesStackParamList, 'CustomerConfirm'>;

const COMPANY_NAME = 'FinMatrix';

const CustomerConfirmScreen: React.FC<Props> = ({ route, navigation }) => {
  const { deliveryId } = route.params;
  const dispatch = useAppDispatch();
  const deliveries = useAppSelector(selectDeliveries);
  const issueModalVisible = useAppSelector(selectIssueModalVisible);
  const issueText = useAppSelector(selectIssueText);

  const delivery = useMemo(() => deliveries.find(d => d.id === deliveryId), [deliveries, deliveryId]);

  const checkScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 120,
    }).start();
  }, [checkScale]);

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><Text style={styles.message}>Delivery not found.</Text></View>
      </SafeAreaView>
    );
  }

  const handleConfirm = () => {
    dispatch(confirmCustomerReceipt({ deliveryId, verifiedBy: delivery.customerName }));
    dispatch(resetCustomerConfirmState());
    navigation.replace('DeliveryComplete', { deliveryId });
  };

  const handleIssue = () => {
    if (!issueText.trim()) {
      Alert.alert('Issue required', 'Please describe the issue.');
      return;
    }
    dispatch(reportDeliveryIssue({ deliveryId, note: issueText.trim() }));
    dispatch(setIssueModalVisible(false));
    Alert.alert('Issue Submitted', 'Issue has been saved. Delivery remains at arrived state.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}><AppLogo size="md" /></View>

        <Animated.View style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}>
          <Text style={styles.checkText}>✓</Text>
        </Animated.View>

        <Text style={styles.title}>Delivery Confirmed!</Text>
        <Text style={styles.message}>
          {delivery.customerName}, please review your delivery from {COMPANY_NAME}.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Details</Text>
          <Text style={styles.row}><Text style={styles.label}>Reference: </Text>{delivery.referenceNo}</Text>
          <Text style={styles.row}><Text style={styles.label}>Address: </Text>{delivery.address ?? delivery.zone}</Text>
          <Text style={styles.row}><Text style={styles.label}>Items: </Text>{delivery.items.length}</Text>
          <Text style={styles.row}><Text style={styles.label}>Status: </Text>{delivery.status.replace('_', ' ')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Signature Preview</Text>
          <View style={styles.signaturePreview}>
            {delivery.signatureBase64 ? (
              <Text style={styles.previewText}>Captured ({delivery.signatureBase64.slice(0, 24)}...)</Text>
            ) : (
              <Text style={styles.previewText}>No signature found</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>I Confirm I Have Received All Items</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => dispatch(setIssueModalVisible(true))}>
          <Text style={styles.issueLink}>Report an Issue</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={issueModalVisible} transparent animationType="slide" onRequestClose={() => dispatch(setIssueModalVisible(false))}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Issue</Text>
            <TextInput
              style={styles.textInput}
              value={issueText}
              onChangeText={text => dispatch(setIssueText(text))}
              placeholder="Describe the issue"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => dispatch(setIssueModalVisible(false))}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleIssue}>
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, alignItems: 'center', paddingBottom: spacing.xl },
  logoWrap: { marginBottom: spacing.md },
  checkCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkText: { color: colors.white, fontSize: 44, fontWeight: '800' },
  title: { ...typography.h2, color: '#166534', marginBottom: spacing.xs, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.sm },
  row: { ...typography.small, color: colors.textPrimary, marginBottom: spacing.xs },
  label: { fontWeight: '700' },
  signaturePreview: {
    height: 68,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: { ...typography.caption, color: colors.textSecondary },
  confirmBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#16A34A',
    alignItems: 'center',
  },
  confirmBtnText: { ...typography.body, color: colors.white, fontWeight: '800', textAlign: 'center' },
  issueLink: {
    ...typography.small,
    color: '#B91C1C',
    marginTop: spacing.md,
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { ...typography.h4, color: colors.textPrimary },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    textAlignVertical: 'top',
    color: colors.textPrimary,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalCancelText: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  modalSubmit: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  modalSubmitText: { ...typography.small, color: colors.white, fontWeight: '700' },
});

export default CustomerConfirmScreen;
