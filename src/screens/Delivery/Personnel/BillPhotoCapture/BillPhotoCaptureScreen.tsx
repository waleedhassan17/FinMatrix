import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DPDeliveriesStackParamList } from '../../../../navigators/stacks/DPDeliveriesStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectDeliveries, selectDeliveryPersonnel } from '../../Admin/AssignDeliveries/deliverySlice';
import { selectInventoryApprovalRequests } from '../../Admin/InventoryApproval/inventoryApprovalSlice';
import { selectUser } from '../../../Auth/authSlice';
import {
  resetBillPhotoState,
  setBillPhoto,
  clearBillPhoto,
  setSignedBy,
  setNote,
  setPaidStatus,
  setReturnedQty,
  submitBillPhoto,
  selectBillPhotoUri,
  selectBillPhotoSource,
  selectBillPhotoSignedBy,
  selectBillPhotoNote,
  selectBillPhotoPaidStatus,
  selectBillPhotoReturnedQtys,
  selectBillPhotoIsSubmitting,
} from './dpBillPhotoCaptureSlice';
import { THEME } from '../../../../utils/theme';
import { DP_BRAND } from '../../../../utils/deliveryTheme';

type Props = NativeStackScreenProps<DPDeliveriesStackParamList, 'BillPhotoCapture'>;

const BillPhotoCaptureScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId } = route.params;
  const dispatch = useAppDispatch();

  const deliveries = useAppSelector(selectDeliveries);
  const personnel = useAppSelector(selectDeliveryPersonnel);
  const approvalRequests = useAppSelector(selectInventoryApprovalRequests);
  const user = useAppSelector(selectUser);
  const photoUri = useAppSelector(selectBillPhotoUri);
  const photoSource = useAppSelector(selectBillPhotoSource);
  const signedBy = useAppSelector(selectBillPhotoSignedBy);
  const note = useAppSelector(selectBillPhotoNote);
  const paidStatus = useAppSelector(selectBillPhotoPaidStatus);
  const returnedQtys = useAppSelector(selectBillPhotoReturnedQtys);
  const isSubmitting = useAppSelector(selectBillPhotoIsSubmitting);

  const delivery = useMemo(
    () => deliveries.find(d => d.id === deliveryId),
    [deliveries, deliveryId],
  );
  const dp = useMemo(
    () => personnel.find(p => p.userId === delivery?.assignedTo),
    [personnel, delivery],
  );

  const alreadySubmitted = useMemo(
    () => approvalRequests.some(r => r.deliveryId === deliveryId),
    [approvalRequests, deliveryId],
  );

  // Per-line delivered/returned split. The rider enters what came BACK; what
  // was delivered is the remainder. Every line used to be hard-coded to
  // "fully delivered, nothing returned", so a customer taking 8 of 10 could
  // not be recorded at all and the admin queue's Returned column was always 0.
  const lines = useMemo(() => {
    return (delivery?.items ?? []).map(item => {
      const dispatched = item.quantity ?? item.orderedQty ?? 0;
      const raw = returnedQtys[item.itemId] ?? '';
      const parsed = raw.trim() === '' ? 0 : Number(raw);
      const valid = Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0 && parsed <= dispatched;
      const returned = valid ? parsed : 0;
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        dispatched,
        raw,
        valid,
        returnedQty: returned,
        deliveredQty: dispatched - returned,
      };
    });
  }, [delivery?.items, returnedQtys]);

  const invalidLine = lines.find(l => !l.valid);
  const totalReturned = lines.reduce((sum, l) => sum + l.returnedQty, 0);
  const totalDispatched = lines.reduce((sum, l) => sum + l.dispatched, 0);
  // Nothing accepted at all. The admin should REJECT this rather than approve
  // it — rejection is the path that posts the full reversal and marks the
  // delivery 'returned'. Approving a zero-delivery request invoices nothing
  // but still resolves the delivery as 'delivered', which reads wrong.
  const isFullReturn = totalDispatched > 0 && totalReturned === totalDispatched;

  useEffect(() => {
    dispatch(resetBillPhotoState());
    if (delivery?.customerName) dispatch(setSignedBy(delivery.customerName));
  }, [dispatch, delivery?.customerName]);

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={DP_BRAND.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={20} color={DP_BRAND.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bill Photo</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Feather name="inbox" size={28} color={THEME.colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Delivery Not Found</Text>
          <Text style={styles.emptySubtitle}>This delivery may have been removed.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ensurePermissions = async (kind: 'camera' | 'gallery'): Promise<boolean> => {
    if (kind === 'camera') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert(
          'Camera permission required',
          'Please enable camera access in Settings to capture the signed bill.',
        );
        return false;
      }
      return true;
    }
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      Alert.alert(
        'Photo library permission required',
        'Please enable photo library access to choose an image.',
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    if (!(await ensurePermissions('camera'))) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      dispatch(setBillPhoto({ uri: result.assets[0].uri, source: 'camera' }));
    }
  };

  const handlePickFromGallery = async () => {
    if (!(await ensurePermissions('gallery'))) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      dispatch(setBillPhoto({ uri: result.assets[0].uri, source: 'gallery' }));
    }
  };

  const handleSubmit = async () => {
    if (alreadySubmitted) {
      Alert.alert(
        'Already submitted',
        'A bill photo for this delivery has already been sent for admin review.',
      );
      return;
    }
    if (!photoUri) {
      Alert.alert('Photo required', 'Capture or pick a photo of the signed bill.');
      return;
    }
    if (!signedBy.trim()) {
      Alert.alert('Customer name required', 'Enter the name printed on the signed bill.');
      return;
    }
    if (!paidStatus) {
      Alert.alert(
        'Payment status required',
        'Select whether the customer PAID (cash collected) or NOT PAID (on credit) before submitting.',
      );
      return;
    }
    if (!delivery.assignedTo) {
      Alert.alert('Unassigned delivery', 'This delivery has no assigned personnel.');
      return;
    }
    if (invalidLine) {
      Alert.alert(
        'Check returned quantity',
        `${invalidLine.itemName}: enter a whole number between 0 and ${invalidLine.dispatched}.`,
      );
      return;
    }

    const personnelName = dp?.displayName ?? user?.displayName ?? 'Delivery Personnel';
    const routeLabel = `${delivery.zone} · ${new Date(delivery.scheduledDate).toLocaleDateString()}`;

    try {
      const action = await dispatch(
        submitBillPhoto({
          deliveryId: delivery.id,
          deliveryReference: delivery.referenceNo,
          personnelId: delivery.assignedTo,
          personnelName,
          routeLabel,
          photoUri,
          source: photoSource ?? 'camera',
          signedBy: signedBy.trim(),
          paidStatus,
          note: note.trim() || undefined,
          // deliveredQty is the field with ledger effect: on approval the
          // backend derives returned as (dispatched - delivered), invoices
          // only the delivered part and restocks the rest. returnedQty is
          // sent alongside so the admin queue shows the rider's own numbers,
          // and the server rejects the pair if they exceed what was dispatched.
          changes: lines.map(line => ({
            itemId: line.itemId,
            itemName: line.itemName,
            beforeQty: line.dispatched,
            deliveredQty: line.deliveredQty,
            returnedQty: line.returnedQty,
          })),
        }),
      );

      if (submitBillPhoto.rejected.match(action)) {
        Alert.alert('Upload failed', action.error?.message ?? 'Could not submit the bill photo.');
        return;
      }

      setShowSuccess(true);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not submit the bill photo.');
    }
  };

  const itemsCount = delivery.items?.length ?? 0;
  const [showSuccess, setShowSuccess] = useState(false);

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={DP_BRAND.primary} />
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Bill Photo</Text>
            <Text style={styles.headerSubtitle}>{delivery.referenceNo}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={successStyles.wrapper}>
          <View style={successStyles.card}>
            <View style={successStyles.iconCircle}>
              <Feather name="check-circle" size={48} color={THEME.colors.success} />
            </View>
            <Text style={successStyles.title}>Sent for Admin Review</Text>
            <Text style={successStyles.subtitle}>
              Your bill photo for {delivery.referenceNo} has been submitted successfully.
              The admin will review and approve the inventory changes.
            </Text>
            <View style={successStyles.infoRow}>
              <Feather name="package" size={16} color={THEME.colors.textSecondary} />
              <Text style={successStyles.infoText}>
                {itemsCount} item{itemsCount === 1 ? '' : 's'} sent for review
                {totalReturned > 0 ? ` · ${totalReturned} unit${totalReturned === 1 ? '' : 's'} returned` : ''}
              </Text>
            </View>
            <View style={successStyles.infoRow}>
              <Feather name="clock" size={16} color={THEME.colors.warning} />
              <Text style={successStyles.infoText}>
                Pending admin approval — actual inventory will update once confirmed
              </Text>
            </View>
            <TouchableOpacity
              style={successStyles.continueBtn}
              onPress={() => navigation.navigate('CustomerConfirm', { deliveryId: delivery.id })}
              activeOpacity={0.9}
            >
              <Feather name="arrow-right" size={18} color={THEME.colors.textInverse} />
              <Text style={successStyles.continueBtnText}>Continue to Customer Confirmation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={successStyles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={successStyles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DP_BRAND.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={DP_BRAND.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bill Photo</Text>
          <Text style={styles.headerSubtitle}>{delivery.referenceNo}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.customerCard}>
            <View style={styles.customerIconWrap}>
              <Feather name="file-text" size={20} color={THEME.colors.warning} />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerLabel}>SIGNED BILL FROM</Text>
              <Text style={styles.customerName}>{delivery.customerName}</Text>
              <Text style={styles.customerSub}>{itemsCount} item{itemsCount === 1 ? '' : 's'} · {delivery.zone}</Text>
            </View>
          </View>

          <View style={styles.instructionCard}>
            <Feather name="info" size={16} color={THEME.colors.info} />
            <Text style={styles.instructionText}>
              Ask the customer to sign the printed bill. Capture a clear photo of the
              full signed bill — the admin will review it before stock is updated.
            </Text>
          </View>

          {photoUri ? (
            <View style={styles.previewCard}>
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => dispatch(clearBillPhoto())}
                  disabled={isSubmitting}
                >
                  <Feather name="trash-2" size={16} color={THEME.colors.danger} />
                  <Text style={[styles.secondaryActionText, { color: THEME.colors.danger }]}>
                    Remove
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleTakePhoto}
                  disabled={isSubmitting}
                >
                  <Feather name="refresh-ccw" size={16} color={DP_BRAND.primary} />
                  <Text style={[styles.secondaryActionText, { color: DP_BRAND.primary }]}>
                    Retake
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.captureCard}>
              <View style={styles.cameraIconWrap}>
                <Feather name="camera" size={32} color={DP_BRAND.primary} />
              </View>
              <Text style={styles.captureTitle}>Capture signed bill</Text>
              <Text style={styles.captureHint}>
                Use the camera for the freshest proof, or pick from your gallery.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.9}
              >
                <Feather name="camera" size={18} color={THEME.colors.textInverse} />
                <Text style={styles.primaryBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handlePickFromGallery}
                activeOpacity={0.9}
              >
                <Feather name="image" size={18} color={DP_BRAND.primary} />
                <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Customer name on bill</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Muhammad Arif"
              placeholderTextColor={THEME.colors.textTertiary}
              value={signedBy}
              onChangeText={t => dispatch(setSignedBy(t))}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Payment collected?</Text>
            <View style={paidStyles.row}>
              <TouchableOpacity
                style={[paidStyles.option, paidStatus === 'paid' && paidStyles.optionPaid]}
                onPress={() => dispatch(setPaidStatus('paid'))}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Feather
                  name="check-circle"
                  size={18}
                  color={paidStatus === 'paid' ? THEME.colors.textInverse : THEME.colors.success}
                />
                <Text
                  style={[
                    paidStyles.optionText,
                    { color: paidStatus === 'paid' ? THEME.colors.textInverse : THEME.colors.success },
                  ]}
                >
                  PAID
                </Text>
                <Text
                  style={[
                    paidStyles.optionHint,
                    paidStatus === 'paid' && { color: THEME.colors.textInverse },
                  ]}
                >
                  Cash collected
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[paidStyles.option, paidStatus === 'unpaid' && paidStyles.optionUnpaid]}
                onPress={() => dispatch(setPaidStatus('unpaid'))}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Feather
                  name="clock"
                  size={18}
                  color={paidStatus === 'unpaid' ? THEME.colors.textInverse : THEME.colors.warning}
                />
                <Text
                  style={[
                    paidStyles.optionText,
                    { color: paidStatus === 'unpaid' ? THEME.colors.textInverse : THEME.colors.warning },
                  ]}
                >
                  NOT PAID
                </Text>
                <Text
                  style={[
                    paidStyles.optionHint,
                    paidStatus === 'unpaid' && { color: THEME.colors.textInverse },
                  ]}
                >
                  On credit
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={paidStyles.note}>
              This choice posts nothing to the books. Accounting happens only when the
              admin approves: PAID records the cash, NOT PAID leaves an open invoice.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Delivered quantities</Text>
            <Text style={styles.fieldHint}>
              Enter how many units the customer sent back. Leave blank if they took
              everything.
            </Text>
            {lines.map(line => (
              <View key={line.itemId} style={styles.qtyRow}>
                <View style={styles.qtyInfo}>
                  <Text style={styles.qtyName} numberOfLines={1}>{line.itemName}</Text>
                  <Text style={styles.qtySub}>
                    {line.dispatched} dispatched · delivering {line.deliveredQty}
                  </Text>
                </View>
                <TextInput
                  style={[styles.qtyInput, !line.valid && styles.qtyInputError]}
                  value={line.raw}
                  onChangeText={t =>
                    dispatch(setReturnedQty({ itemId: line.itemId, qty: t.replace(/[^0-9]/g, '') }))
                  }
                  placeholder="0"
                  placeholderTextColor={THEME.colors.textTertiary}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                  maxLength={6}
                />
              </View>
            ))}
            {invalidLine && (
              <Text style={styles.qtyError}>
                {invalidLine.itemName}: enter 0–{invalidLine.dispatched}.
              </Text>
            )}
            {isFullReturn && (
              <View style={styles.warnBanner}>
                <Feather name="alert-circle" size={16} color={THEME.colors.warning} />
                <Text style={styles.warnBannerText}>
                  Nothing was accepted. The admin should reject this so the whole
                  delivery is returned to stock.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Note for admin (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Anything the admin should know — damage, disputes, access problems."
              placeholderTextColor={THEME.colors.textTertiary}
              value={note}
              onChangeText={t => dispatch(setNote(t))}
              multiline
              editable={!isSubmitting}
            />
          </View>

          {alreadySubmitted && (
            <View style={styles.warnBanner}>
              <Feather name="alert-circle" size={16} color={THEME.colors.warning} />
              <Text style={styles.warnBannerText}>
                A bill photo for this delivery is already pending admin review.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!photoUri || !paidStatus || isSubmitting || alreadySubmitted || !!invalidLine) &&
                styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!photoUri || !paidStatus || isSubmitting || alreadySubmitted || !!invalidLine}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator color={THEME.colors.textInverse} />
            ) : (
              <>
                <Feather name="send" size={18} color={THEME.colors.textInverse} />
                <Text style={styles.submitBtnText}>Send to Admin for Review</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footnote}>
            Inventory will be updated once the admin approves this request.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DP_BRAND.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: DP_BRAND.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DP_BRAND.headerOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { ...THEME.typography.h3, fontWeight: '700', color: DP_BRAND.white },
  headerSubtitle: { ...THEME.typography.caption, color: DP_BRAND.headerTextSecondary, marginTop: 2 },
  headerSpacer: { width: 40 },

  content: { flex: 1, backgroundColor: THEME.colors.background },
  contentInner: { padding: 20, paddingBottom: 40 },

  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 16,
    marginBottom: 12,
    ...THEME.shadows.sm,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  customerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.warningLight ?? '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  customerInfo: { flex: 1 },
  customerLabel: {
    ...THEME.typography.overline,
    color: THEME.colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  customerName: { ...THEME.typography.h3, fontWeight: '700', color: THEME.colors.textPrimary },
  customerSub: { ...THEME.typography.caption, color: THEME.colors.textSecondary, marginTop: 2 },

  instructionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.infoLight,
    borderRadius: THEME.radius.lg,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  instructionText: {
    flex: 1,
    ...THEME.typography.bodySm,
    color: THEME.colors.info,
    lineHeight: 19,
  },

  captureCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: THEME.colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  captureTitle: { ...THEME.typography.h4, color: THEME.colors.textPrimary, marginBottom: 4 },
  captureHint: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DP_BRAND.primary,
    borderRadius: THEME.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    marginBottom: 10,
    ...THEME.shadows.md,
  },
  primaryBtnText: { ...THEME.typography.h4, fontWeight: '700', color: THEME.colors.textInverse },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: DP_BRAND.primary,
    borderRadius: THEME.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
  },
  secondaryBtnText: { ...THEME.typography.h4, fontWeight: '600', color: DP_BRAND.primary },

  previewCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginBottom: 16,
    ...THEME.shadows.sm,
  },
  preview: { width: '100%', aspectRatio: 3 / 4, backgroundColor: THEME.colors.neutral100 },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    backgroundColor: THEME.colors.neutral50,
  },
  secondaryAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondaryActionText: { ...THEME.typography.bodyMd, fontWeight: '600' },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    ...THEME.typography.labelSm,
    color: THEME.colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: THEME.colors.textPrimary,
    ...THEME.typography.bodyMd,
  },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },

  fieldHint: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textTertiary,
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  qtyInfo: { flex: 1 },
  qtyName: {
    ...THEME.typography.bodyMd,
    color: THEME.colors.textPrimary,
  },
  qtySub: {
    ...THEME.typography.bodySm,
    color: THEME.colors.textTertiary,
    marginTop: 2,
  },
  qtyInput: {
    width: 72,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
    color: THEME.colors.textPrimary,
    ...THEME.typography.bodyMd,
  },
  qtyInputError: { borderColor: THEME.colors.danger },
  qtyError: {
    ...THEME.typography.bodySm,
    color: THEME.colors.danger,
    marginBottom: 6,
  },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.warningLight ?? '#FFF4E5',
    borderRadius: THEME.radius.lg,
    padding: 12,
    marginBottom: 12,
  },
  warnBannerText: {
    flex: 1,
    ...THEME.typography.bodySm,
    color: THEME.colors.warning,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.success,
    borderRadius: THEME.radius.lg,
    paddingVertical: 16,
    marginTop: 4,
    ...THEME.shadows.md,
  },
  submitBtnDisabled: { backgroundColor: THEME.colors.neutral300, shadowOpacity: 0, elevation: 0 },
  submitBtnText: { ...THEME.typography.h4, fontWeight: '700', color: THEME.colors.textInverse },
  footnote: {
    ...THEME.typography.caption,
    color: THEME.colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: THEME.colors.background,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { ...THEME.typography.h2, color: THEME.colors.textPrimary, marginBottom: 8 },
  emptySubtitle: {
    ...THEME.typography.bodyMd,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: DP_BRAND.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: THEME.radius.lg,
    ...THEME.shadows.sm,
  },
  emptyButtonText: { ...THEME.typography.labelLg, color: THEME.colors.textInverse },
});

const paidStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  optionPaid: {
    backgroundColor: THEME.colors.success,
    borderColor: THEME.colors.success,
  },
  optionUnpaid: {
    backgroundColor: THEME.colors.warning,
    borderColor: THEME.colors.warning,
  },
  optionText: {
    ...THEME.typography.labelLg,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  optionHint: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
  },
  note: {
    ...THEME.typography.caption,
    color: THEME.colors.textTertiary,
    marginTop: 8,
    lineHeight: 16,
  },
});

const successStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.xl,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    ...THEME.shadows.md,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.successLight ?? '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    ...THEME.typography.h2,
    fontWeight: '700',
    color: THEME.colors.success,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...THEME.typography.bodyMd,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.neutral50,
    borderRadius: THEME.radius.lg,
    padding: 12,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  infoText: {
    flex: 1,
    ...THEME.typography.bodySm,
    color: THEME.colors.textSecondary,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DP_BRAND.primary,
    borderRadius: THEME.radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    marginTop: 16,
    ...THEME.shadows.md,
  },
  continueBtnText: {
    ...THEME.typography.h4,
    fontWeight: '700',
    color: THEME.colors.textInverse,
  },
  backBtn: {
    paddingVertical: 12,
    marginTop: 8,
  },
  backBtnText: {
    ...THEME.typography.bodyMd,
    fontWeight: '600',
    color: THEME.colors.textTertiary,
  },
});

export default BillPhotoCaptureScreen;
