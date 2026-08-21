import React, { useMemo, useState } from 'react';
import {
  Modal,
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  StatusBar,
} from 'react-native';
import { Alert } from '../../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HEADER_NAVY } from '../../../../components/reports/ReportUI';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows } from '../../../../theme';
import { THEME } from '../../../../utils/theme';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import {
  selectDeliveries,
  selectDeliveryPersonnel,
  reassignDelivery,
  cancelDelivery,
  deleteDelivery,
  fetchDeliveries,
} from '../AssignDeliveries/deliverySlice';
import {
  selectDetailUIState,
  toggleReassignPanel,
  setReassignPersonnelId,
  toggleCancelConfirm,
  resetDetailUIState,
} from './adminDeliveryDetailSlice';
import CustomButton from '../../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../../Custom-Components/CustomDropdown';
import { updateDeliveryAPI } from '../../../../networks/delivery/deliveryNetwork';

type Props = NativeStackScreenProps<MoreStackParamList, 'AdminDeliveryDetail'>;

// ── Constants ────────────────────────────────────────────────────────────────
// Every status the backend can return needs an entry here, or the header badge
// renders "undefined <status>". picked_up, arrived and cancelled were all
// reachable and all missing.
const STATUS_COLORS: Record<string, string> = {
  unassigned: '#64748B',
  pending: '#FF8B00',
  picked_up: '#0065FF',
  in_transit: '#2563EB',
  arrived: '#6554C0',
  delivered: '#059669',
  failed: '#DE350B',
  returned: '#EA580C',
  cancelled: '#94A3B8',
};

const STATUS_ICONS: Record<string, string> = {
  unassigned: '⚪',
  pending: '🟡',
  picked_up: '🔷',
  in_transit: '🔵',
  arrived: '🟣',
  delivered: '🟢',
  failed: '🔴',
  returned: '🟠',
  cancelled: '⚫',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#0F766E',
};

// ── Component ────────────────────────────────────────────────────────────────
const AdminDeliveryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId } = route.params;
  const dispatch = useAppDispatch();

  const deliveries = useAppSelector(selectDeliveries);
  const allPersonnel = useAppSelector(selectDeliveryPersonnel);
  const uiState = useAppSelector(selectDetailUIState);

  const delivery = deliveries.find(d => d.id === deliveryId);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const assignedPerson = allPersonnel.find(p => p.userId === delivery?.assignedTo);

  const personnelOptions = useMemo(
    () =>
      allPersonnel
        .filter(p => p.status === 'active' && p.userId !== delivery?.assignedTo)
        .map(p => ({
          label: `${p.displayName} (Load: ${p.currentLoad}/${p.maxLoad})`,
          value: p.userId,
        })),
    [allPersonnel, delivery?.assignedTo],
  );

  // ── Info Row helper ──────────────────────────────────────────────────────
  const renderInfoRow = (label: string, value: string) => (
    <View style={styles.infoRow} key={label}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  // ── Not-found guard ──────────────────────────────────────────────────────
  if (!delivery) {
    return (
      <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
        <View style={styles.body}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Delivery Detail</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.center}>
            <Text style={styles.placeholderNote}>Delivery not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[delivery.status] ?? '#64748B';

  // The server's status machine treats these as terminal and rejects any
  // transition out of them. The assign endpoint has no such guard, though —
  // it would happily swap the rider on a completed delivery — so the gate
  // has to be here.
  const isTerminal = ['delivered', 'failed', 'returned', 'cancelled'].includes(delivery.status);
  // Never dispatched → the record can simply be discarded. Anything further
  // along has stock in Goods in Transit and must be cancelled instead, so the
  // action bar offers one verb or the other, never both.
  const isDiscardable = delivery.status === 'unassigned';

  // ── Handlers ────────────────────────────────────────────────────────────
  // Both handlers await the API and only report success once the server has
  // confirmed. They used to dispatch a local-only reducer and alert
  // "successfully" unconditionally, so the success message was never evidence
  // of anything having been saved.
  const handleReassign = async () => {
    if (isSubmitting) return;
    if (!uiState.reassignPersonnelId) {
      Alert.alert('Select Personnel', 'Please select a delivery person to reassign to.');
      return;
    }
    setIsSubmitting(true);
    try {
      await dispatch(
        reassignDelivery({ deliveryId: delivery.id, personnelId: uiState.reassignPersonnelId }),
      ).unwrap();
      await dispatch(fetchDeliveries());
      dispatch(resetDetailUIState());
      Alert.alert('Reassigned', 'Delivery has been reassigned.');
    } catch (err: any) {
      Alert.alert('Reassign failed', err?.message || 'Unable to reassign this delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirmed = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await dispatch(
        cancelDelivery({ deliveryId: delivery.id, reason: 'Cancelled by admin' }),
      ).unwrap();
      await dispatch(fetchDeliveries());
      dispatch(resetDetailUIState());
      Alert.alert('Cancelled', 'Delivery has been cancelled.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Cancel failed', err?.message || 'Unable to cancel this delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Discard a delivery that was created and never dispatched.
   *
   * Only offered while the delivery is still unassigned — nothing has been
   * posted for it, so removing the record leaves inventory and the ledger
   * exactly as they were. Once it has been dispatched the button becomes
   * Cancel instead, which restocks and reverses Goods in Transit. The server
   * enforces the same rule, so if it refuses (DELIVERY_COMMITTED) its message
   * is shown rather than a generic failure.
   */
  const handleDeleteConfirmed = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await dispatch(deleteDelivery(delivery.id)).unwrap();
      dispatch(resetDetailUIState());
      Alert.alert('Delivery deleted', 'The delivery has been removed. Nothing was posted to your books.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Delete failed', err?.message || 'Unable to delete this delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContact = () => {
    const phone = delivery.customerPhone ?? '';
    if (!phone) {
      Alert.alert('No Phone', `No phone number on file for ${delivery.customerName}.`);
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Contact', `Call ${delivery.customerName} at ${phone}`),
    );
  };

  // Manual destination fallback: when automatic geocoding failed at
  // creation, the dispatcher supplies the address and (optionally) exact
  // coordinates from Google Maps here.
  const openLocationModal = () => {
    setManualAddress(delivery.address ?? '');
    setManualLat(delivery.destLat != null ? String(delivery.destLat) : '');
    setManualLng(delivery.destLng != null ? String(delivery.destLng) : '');
    setLocationModalVisible(true);
  };

  const handleSaveLocation = async () => {
    if (isSavingLocation) return;
    const lat = manualLat.trim() ? parseFloat(manualLat) : undefined;
    const lng = manualLng.trim() ? parseFloat(manualLng) : undefined;
    const hasCoords = lat != null || lng != null;
    if (hasCoords) {
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert('Invalid coordinates', 'Enter BOTH latitude and longitude as numbers, or leave both empty.');
        return;
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        Alert.alert('Invalid coordinates', 'Latitude must be -90…90 and longitude -180…180.');
        return;
      }
    }
    if (!manualAddress.trim() && !hasCoords) {
      Alert.alert('Nothing to save', 'Enter a delivery address and/or coordinates.');
      return;
    }
    setIsSavingLocation(true);
    try {
      await updateDeliveryAPI(delivery.id, {
        destAddress: manualAddress.trim() || undefined,
        ...(hasCoords ? { destLat: lat, destLng: lng } : {}),
      });
      await dispatch(fetchDeliveries());
      setLocationModalVisible(false);
    } catch (e: any) {
      Alert.alert('Could not save location', e?.message || 'Please try again.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const hasPin = delivery.destLat != null && delivery.destLng != null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={styles.body}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{delivery.referenceNo}</Text>
        </View>
        <View style={[styles.headerStatusBadge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <Text style={[styles.headerStatusText, { color: '#FFFFFF' }]}>
            {STATUS_ICONS[delivery.status]} {delivery.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Delivery Location (map pin) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Location</Text>
          {hasPin ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Map pin</Text>
              <Text style={styles.infoValue}>
                {Number(delivery.destLat).toFixed(5)}, {Number(delivery.destLng).toFixed(5)}
              </Text>
            </View>
          ) : (
            <View style={styles.noPinBanner}>
              <Feather name="map-pin" size={16} color="#B45309" />
              <Text style={styles.noPinText}>
                The address could not be located on the map automatically. Riders will
                navigate by the address text until a pin is set.
              </Text>
            </View>
          )}
          <CustomButton
            title={hasPin ? 'Edit Location' : 'Set Location Manually'}
            variant="secondary"
            size="sm"
            onPress={openLocationModal}
          />
        </View>

        {/* ── Customer Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          {renderInfoRow('Name', delivery.customerName)}
          {renderInfoRow('Address', delivery.address ?? delivery.zone)}
          {delivery.customerPhone && renderInfoRow('Phone', delivery.customerPhone)}
          {renderInfoRow('Zone', delivery.zone)}
          {renderInfoRow('Scheduled', delivery.scheduledDate)}
          {delivery.notes && renderInfoRow('Notes', delivery.notes)}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verification</Text>
            <View
              style={[
                styles.verifyBadge,
                {
                  backgroundColor: delivery.customerVerified
                    ? '#059669' + '22'
                    : '#64748B' + '22',
                },
              ]}
            >
              <Text
                style={[
                  styles.verifyText,
                  { color: delivery.customerVerified ? '#059669' : '#64748B' },
                ]}
              >
                {delivery.customerVerified ? '✓ Verified' : '— Unverified'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Priority badge ── */}
        <View style={styles.priorityRow}>
          <Text style={styles.infoLabel}>Priority</Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: PRIORITY_COLORS[delivery.priority] + '22' },
            ]}
          >
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[delivery.priority] }]}>
              {delivery.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Items List ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({delivery.items.length})</Text>
          {delivery.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={styles.itemIndex}>
                <Text style={styles.itemIndexText}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemAgency}>{item.agencyName}</Text>
              </View>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* ── Delivery Person ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Person</Text>
          {assignedPerson ? (
            <>
              <View style={styles.personCard}>
                <View style={styles.personAvatar}>
                  <Text style={styles.personAvatarText}>
                    {assignedPerson.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{assignedPerson.displayName}</Text>
                  <Text style={styles.personMeta}>
                    {assignedPerson.vehicleType} • {assignedPerson.vehicleNumber}
                  </Text>
                  <Text style={styles.personMeta}>
                    Load: {assignedPerson.currentLoad}/{assignedPerson.maxLoad} • Rating:{' '}
                    {assignedPerson.rating}★
                  </Text>
                </View>
                <View
                  style={[
                    styles.personStatusBadge,
                    {
                      backgroundColor:
                        assignedPerson.status === 'active' ? '#059669' + '20' : '#FF8B00' + '20',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: assignedPerson.status === 'active' ? '#059669' : '#FF8B00',
                    }}
                  >
                    {assignedPerson.status}
                  </Text>
                </View>
              </View>
              {delivery.assignedAt && (
                <Text style={styles.assignedAt}>
                  Assigned {new Date(delivery.assignedAt).toLocaleString()}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.placeholderNote}>No personnel assigned</Text>
          )}
        </View>

        {/* ── Status History Timeline ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status History</Text>
          {delivery.statusHistory && delivery.statusHistory.length > 0 ? (
            delivery.statusHistory.map((entry, idx) => {
              const isLast = idx === (delivery.statusHistory?.length ?? 0) - 1;
              const entryColor = STATUS_COLORS[entry.status] ?? '#64748B';
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: entryColor }]} />
                    {!isLast && <View style={styles.timelineConnector} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineStatus, { color: entryColor }]}>
                      {STATUS_ICONS[entry.status]}{' '}
                      {entry.status
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                    <Text style={styles.timelineTime}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                    {entry.note !== undefined && (
                      <Text style={styles.timelineNote}>{entry.note}</Text>
                    )}
                    {entry.updatedBy !== undefined && (
                      <Text style={styles.timelineBy}>By: {entry.updatedBy}</Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.placeholderNote}>No status history available</Text>
          )}
        </View>

        {/* ── Signature Preview ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature</Text>
          {delivery.signature ? (
            <View style={styles.signatureBox}>
              <Text style={styles.signatureIcon}>✍️</Text>
              <Text style={styles.signatureLabel}>Signature on file</Text>
              <Text style={styles.signatureSub}>{delivery.signature}</Text>
            </View>
          ) : (
            <View style={[styles.signatureBox, styles.signatureEmpty]}>
              <Text style={styles.signatureIcon}>✍️</Text>
              <Text style={[styles.signatureLabel, { color: colors.textLight }]}>
                No signature captured
              </Text>
            </View>
          )}
        </View>

        {/* ── Delivery Photos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Photos</Text>
          {delivery.photos && delivery.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {delivery.photos.map((_, idx) => (
                <View key={idx} style={styles.photoThumb}>
                  <Text style={styles.photoThumbIcon}>📷</Text>
                  <Text style={styles.photoThumbLabel}>Photo {idx + 1}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.photoEmpty}>
              <Text style={styles.photoThumbIcon}>📷</Text>
              <Text style={styles.placeholderNote}>No photos available</Text>
            </View>
          )}
        </View>

        {/* ── Reassign Panel ── */}
        {uiState.showReassignPanel && (
          <View style={styles.actionPanel}>
            <Text style={styles.actionPanelTitle}>Re-assign Delivery</Text>
            {personnelOptions.length > 0 ? (
              <>
                <CustomDropdown
                  label="Select Personnel"
                  options={personnelOptions}
                  value={uiState.reassignPersonnelId}
                  onChange={val => dispatch(setReassignPersonnelId(val))}
                />
                <View style={styles.panelButtons}>
                  <CustomButton
                    title={isSubmitting ? 'Reassigning…' : 'Confirm Reassign'}
                    onPress={handleReassign}
                    variant="primary"
                    fullWidth
                    disabled={isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => dispatch(toggleReassignPanel())}
                  >
                    <Text style={styles.linkBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.placeholderNote}>No other active personnel available</Text>
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => dispatch(toggleReassignPanel())}
                >
                  <Text style={styles.linkBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Cancel Confirm ── */}
        {uiState.showCancelConfirm && (
          <View style={[styles.actionPanel, styles.dangerPanel]}>
            <Text style={[styles.actionPanelTitle, { color: '#DE350B' }]}>
              {isDiscardable ? 'Delete Delivery?' : 'Cancel Delivery?'}
            </Text>
            <Text style={styles.dangerNote}>
              {isDiscardable
                ? 'This delivery was never dispatched, so nothing has been posted for it. Deleting removes the record — your inventory and reports are unaffected.'
                : 'This cancels the delivery and returns any dispatched stock. It cannot be undone from this screen.'}
            </Text>
            <View style={styles.panelButtons}>
              <CustomButton
                title={
                  isSubmitting
                    ? isDiscardable ? 'Deleting…' : 'Cancelling…'
                    : isDiscardable ? 'Yes, Delete Delivery' : 'Yes, Cancel Delivery'
                }
                onPress={isDiscardable ? handleDeleteConfirmed : handleCancelConfirmed}
                variant="danger"
                fullWidth
                disabled={isSubmitting}
              />
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => dispatch(toggleCancelConfirm())}
              >
                <Text style={styles.linkBtnText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Fixed Bottom Action Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: colors.secondary }, isTerminal && styles.bottomBtnDisabled]}
          onPress={() => dispatch(toggleReassignPanel())}
          disabled={isTerminal}
        >
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <Text style={styles.bottomBtnText}>Re-assign</Text>
        </TouchableOpacity>
        {/* One verb, always the right one: an undispatched delivery is
            deleted outright; a dispatched one is cancelled so its stock and
            Goods in Transit are properly reversed. */}
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: '#DE350B' }, isTerminal && styles.bottomBtnDisabled]}
          onPress={() => dispatch(toggleCancelConfirm())}
          disabled={isTerminal}
        >
          <Feather name={isDiscardable ? 'trash-2' : 'x'} size={16} color="#FFFFFF" />
          <Text style={styles.bottomBtnText}>{isDiscardable ? 'Delete' : 'Cancel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomBtn, { backgroundColor: colors.success }]}
          onPress={handleContact}
        >
          <Feather name="phone" size={16} color="#FFFFFF" />
          <Text style={styles.bottomBtnText}>Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Manual delivery-location modal (geocode-failure fallback) */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delivery Location</Text>
            <Text style={styles.modalHint}>
              Enter the delivery address. To place an exact map pin, paste the
              coordinates from Google Maps (long-press the spot → copy).
            </Text>
            <Text style={styles.modalFieldLabel}>Address</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 64 }]}
              value={manualAddress}
              onChangeText={setManualAddress}
              placeholder="Street, area, city"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFieldLabel}>Latitude</Text>
                <TextInput
                  style={styles.modalInput}
                  value={manualLat}
                  onChangeText={setManualLat}
                  placeholder="31.5204"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFieldLabel}>Longitude</Text>
                <TextInput
                  style={styles.modalInput}
                  value={manualLng}
                  onChangeText={setManualLng}
                  placeholder="74.3587"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <CustomButton
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setLocationModalVisible(false)}
              />
              <CustomButton
                title={isSavingLocation ? 'Saving…' : 'Save Location'}
                variant="primary"
                size="md"
                onPress={handleSaveLocation}
                disabled={isSavingLocation}
              />
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  noPinBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  noPinText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#92400E',
    fontFamily: THEME.typography.fontFamily,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 440,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: THEME.typography.fontFamily,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  safeTop: { backgroundColor: HEADER_NAVY[0] },
  body: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: HEADER_NAVY[0],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { padding: spacing.xs },
  back: { ...THEME.typography.displaySm, color: colors.primary },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { ...THEME.typography.h3, color: '#FFFFFF' },
  headerStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  headerStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  content: { padding: spacing.md, paddingBottom: spacing.xl },

  // Section
  section: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionTitle: {
    ...THEME.typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  infoLabel: { ...THEME.typography.bodyMd, color: colors.textSecondary, flex: 1 },
  infoValue: { ...THEME.typography.bodyMd, color: colors.textPrimary, flex: 2, textAlign: 'right' },

  // Priority row (outside any section card)
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  priorityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  priorityText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Verify badge
  verifyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  verifyText: { fontSize: 12, fontWeight: '600' },

  // Items
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  itemIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  itemIndexText: { fontSize: 11, fontWeight: '700', color: colors.secondary },
  itemName: { ...THEME.typography.bodyMd, fontWeight: '600', color: colors.textPrimary },
  itemAgency: { ...THEME.typography.caption, color: colors.textSecondary },
  itemQty: { ...THEME.typography.bodyLg, fontWeight: '700', color: colors.primary },

  // Person card
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: { ...THEME.typography.h3, color: colors.primary },
  personName: { ...THEME.typography.bodyLg, fontWeight: '600', color: colors.textPrimary },
  personMeta: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  personStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  assignedAt: { ...THEME.typography.caption, color: colors.textLight, marginTop: spacing.xs },

  // Timeline
  timelineItem: { flexDirection: 'row', marginBottom: spacing.sm },
  timelineLine: { alignItems: 'center', width: 24, marginRight: spacing.sm },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 2,
    minHeight: 24,
  },
  timelineContent: { flex: 1, paddingBottom: spacing.sm },
  timelineStatus: { ...THEME.typography.bodyMd, fontWeight: '600' },
  timelineTime: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  timelineNote: { ...THEME.typography.caption, color: colors.textPrimary, marginTop: 2 },
  timelineBy: { ...THEME.typography.caption, color: colors.textLight, marginTop: 1 },

  // Signature
  signatureBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary + '10',
  },
  signatureEmpty: { backgroundColor: colors.border + '40' },
  signatureIcon: { fontSize: 28, marginBottom: spacing.xs },
  signatureLabel: { ...THEME.typography.bodyMd, fontWeight: '600', color: colors.textPrimary },
  signatureSub: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 4 },

  // Photos
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  photoThumbIcon: { fontSize: 24 },
  photoThumbLabel: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  photoEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },

  // Placeholder note
  placeholderNote: { ...THEME.typography.bodyMd, color: colors.textLight },

  // Action panels (inline)
  actionPanel: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerPanel: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionPanelTitle: { ...THEME.typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  dangerNote: { ...THEME.typography.bodyMd, color: '#991B1B', marginBottom: spacing.md },
  panelButtons: { marginTop: spacing.sm, gap: spacing.sm },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  linkBtnText: { ...THEME.typography.bodyMd, color: colors.secondary },

  // Bottom action bar
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  bottomBtn: {
    gap: 4,
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBtnDisabled: {
    opacity: 0.4,
  },
  bottomBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AdminDeliveryDetailScreen;
