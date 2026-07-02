// ═══════════════════════════════════════════════════════
// FinMatrix — Super-Admin Payment Submission Review (phase2.md)
// Verify manual bank-transfer payments across signup / renewal / upgrade.
// Each row is labelled NEW / RENEWAL / UPGRADE with plan, amount, screenshot,
// and Approve / Reject(reason) actions. Approval activates the plan+account.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { HEADER_NAVY } from '../../../components/reports/ReportUI';
import {
  listPaymentSubmissionsAPI,
  approvePaymentSubmissionAPI,
  rejectPaymentSubmissionAPI,
  getSubmissionScreenshotSource,
  type PaymentSubmissionView,
  type SubmissionStatus,
} from '../../../network/billingNetwork';

const KIND_COLORS: Record<string, string> = {
  NEW: '#0052CC',
  RENEWAL: '#00875A',
  UPGRADE: '#6554C0',
};

type FilterKey = SubmissionStatus | 'all';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'submitted', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

const PaymentSubmissionsScreen: React.FC = () => {
  const [filter, setFilter] = useState<FilterKey>('submitted');
  const [rows, setRows] = useState<PaymentSubmissionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [viewShot, setViewShot] = useState<{ uri: string; headers: Record<string, string> } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmissionView | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await listPaymentSubmissionsAPI(filter === 'all' ? undefined : filter);
      setRows(data);
    } catch (e: any) {
      Alert.alert('Could not load submissions', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const openScreenshot = async (id: string) => {
    try {
      setViewShot(await getSubmissionScreenshotSource(id, 'admin'));
    } catch {
      Alert.alert('Screenshot unavailable');
    }
  };

  const approve = (sub: PaymentSubmissionView) => {
    Alert.alert(
      'Approve payment',
      `Activate the ${sub.planLabel} plan for ${sub.companyName ?? 'this company'}? ` +
        `This restores full access and records ${sub.amountLabel} in platform revenue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setBusyId(sub.id);
            try {
              await approvePaymentSubmissionAPI(sub.id);
              await load();
            } catch (e: any) {
              Alert.alert('Approve failed', e?.message ?? 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for rejection.');
      return;
    }
    setBusyId(rejectTarget.id);
    try {
      await rejectPaymentSubmissionAPI(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      await load();
    } catch (e: any) {
      Alert.alert('Reject failed', e?.message ?? 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={[S.safe, { backgroundColor: HEADER_NAVY[0] }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={S.body}>
        <LinearGradient colors={HEADER_NAVY} style={S.header}>
          <Text style={S.headerTitle}>Payment Verification</Text>
          <Text style={S.headerSub}>Review manual bank-transfer submissions</Text>
        </LinearGradient>

        <View style={S.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[S.filterChip, active && S.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[S.filterText, active && S.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={S.center}>
            <ActivityIndicator size="large" color="#0052CC" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={S.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
              />
            }
          >
            {rows.length === 0 ? (
              <View style={S.empty}>
                <Feather name="inbox" size={40} color="#B3BAC5" />
                <Text style={S.emptyText}>No {filter === 'all' ? '' : filter} submissions</Text>
              </View>
            ) : (
              rows.map((sub) => (
                <View key={sub.id} style={S.card}>
                  <View style={S.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.company} numberOfLines={1}>
                        {sub.companyName ?? 'Company'}
                      </Text>
                      <Text style={S.companyEmail} numberOfLines={1}>
                        {sub.companyEmail ?? ''}
                      </Text>
                    </View>
                    <View style={[S.kindBadge, { backgroundColor: (KIND_COLORS[sub.kind] ?? '#42526E') + '18' }]}>
                      <Text style={[S.kindText, { color: KIND_COLORS[sub.kind] ?? '#42526E' }]}>
                        {sub.kind}
                      </Text>
                    </View>
                  </View>

                  <View style={S.metaRow}>
                    <Meta label="Plan" value={sub.planLabel} />
                    <Meta label="Amount" value={sub.amountLabel} />
                    <Meta label="Status" value={sub.status} />
                  </View>
                  <Text style={S.date}>{new Date(sub.createdAt).toLocaleString()}</Text>

                  {sub.hasScreenshot && (
                    <TouchableOpacity style={S.viewShot} onPress={() => openScreenshot(sub.id)}>
                      <Feather name="image" size={15} color="#0052CC" />
                      <Text style={S.viewShotText}>View transfer screenshot</Text>
                    </TouchableOpacity>
                  )}

                  {sub.status === 'rejected' && sub.rejectionReason && (
                    <Text style={S.rejReason}>Rejected: {sub.rejectionReason}</Text>
                  )}

                  {sub.status === 'submitted' && (
                    <View style={S.actions}>
                      <TouchableOpacity
                        style={[S.btn, S.rejectBtn]}
                        disabled={busyId === sub.id}
                        onPress={() => {
                          setRejectReason('');
                          setRejectTarget(sub);
                        }}
                      >
                        <Text style={S.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[S.btn, S.approveBtn]}
                        disabled={busyId === sub.id}
                        onPress={() => approve(sub)}
                      >
                        {busyId === sub.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={S.approveBtnText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        )}
      </View>

      {/* Screenshot viewer */}
      <Modal visible={!!viewShot} transparent animationType="fade" onRequestClose={() => setViewShot(null)}>
        <View style={S.shotBackdrop}>
          <TouchableOpacity style={S.shotClose} onPress={() => setViewShot(null)}>
            <Feather name="x" size={26} color="#FFF" />
          </TouchableOpacity>
          {viewShot && (
            <Image source={{ uri: viewShot.uri, headers: viewShot.headers }} style={S.shotImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Reject reason */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={S.modalBackdrop}>
          <View style={S.modalCard}>
            <Text style={S.modalTitle}>Reject payment</Text>
            <Text style={S.modalSub}>
              Tell {rejectTarget?.companyName ?? 'the company'} why the payment couldn't be verified.
            </Text>
            <TextInput
              style={S.modalInput}
              placeholder="e.g. Screenshot unclear / amount mismatch"
              placeholderTextColor="#8993A4"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={S.modalActions}>
              <TouchableOpacity style={[S.btn, S.rejectBtn]} onPress={() => setRejectTarget(null)}>
                <Text style={S.rejectBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.btn, S.approveBtn, { backgroundColor: '#DE350B' }]} onPress={submitReject}>
                <Text style={S.approveBtnText}>Confirm reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Meta: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={S.meta}>
    <Text style={S.metaLabel}>{label}</Text>
    <Text style={S.metaValue}>{value}</Text>
  </View>
);

const S = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, backgroundColor: '#F4F5F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  filterRow: { flexDirection: 'row', gap: 8, padding: 12 },
  filterChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DFE1E6',
  },
  filterChipActive: { backgroundColor: '#0052CC', borderColor: '#0052CC' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#5E6C84' },
  filterTextActive: { color: '#FFF' },

  scroll: { paddingHorizontal: 12, paddingTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: '#8993A4', textTransform: 'capitalize' },

  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EBECF0',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  company: { fontSize: 16, fontWeight: '700', color: '#172B4D' },
  companyEmail: { fontSize: 12, color: '#8993A4', marginTop: 2 },
  kindBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  kindText: { fontSize: 11, fontWeight: '800' },

  metaRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  meta: { flex: 1 },
  metaLabel: { fontSize: 10, color: '#8993A4', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontWeight: '700', color: '#172B4D', marginTop: 2, textTransform: 'capitalize' },
  date: { fontSize: 11, color: '#8993A4', marginTop: 10 },

  viewShot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  viewShotText: { fontSize: 13, fontWeight: '600', color: '#0052CC' },
  rejReason: { fontSize: 12, color: '#B91C1C', marginTop: 10 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: '#00875A' },
  approveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  rejectBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DFE1E6' },
  rejectBtnText: { color: '#42526E', fontWeight: '700', fontSize: 14 },

  shotBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  shotClose: { position: 'absolute', top: 50, right: 20, zIndex: 2, padding: 8 },
  shotImage: { width: '92%', height: '80%' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(9,30,66,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#172B4D' },
  modalSub: { fontSize: 13, color: '#5E6C84', marginTop: 6, lineHeight: 19 },
  modalInput: {
    marginTop: 14, borderWidth: 1, borderColor: '#DFE1E6', borderRadius: 10,
    padding: 12, minHeight: 80, textAlignVertical: 'top', color: '#172B4D',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});

export default PaymentSubmissionsScreen;
