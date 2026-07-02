// ═══════════════════════════════════════════════════════
// FinMatrix — Subscription Payment (shared across all three flows)
// Bill → platform bank details → upload transfer screenshot → await approval.
// Reused by Flow 2 (renew on expiry) and Flow 3 (upgrade/change from Settings).
// ═══════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectUser, setUser } from '../Auth/authSlice';
import { authMe } from '../../network/authNetwork';
import {
  getBankDetailsAPI,
  submitPaymentAPI,
  type BankDetails,
} from '../../network/billingNetwork';

const DS = {
  navy: '#091E42',
  primary: '#059669',
  primaryDark: '#047857',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  border: '#DFE1E6',
  text: { h: '#172B4D', sub: '#5E6C84', muted: '#8993A4', inv: '#FFFFFF' },
};

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionPay'>;

const SubscriptionPayScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const plan = route.params?.plan ?? 'standard';
  const mode = route.params?.mode ?? 'change';

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<BankDetails | null>(null);
  const [image, setImage] = useState<{ uri: string; mimeType?: string; fileName?: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setDetails(await getBankDetailsAPI(plan));
      } catch (e: any) {
        Alert.alert('Could not load bill', e?.message ?? 'Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [plan]);

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach your transfer screenshot.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setImage({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? undefined });
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      Alert.alert('Screenshot required', 'Please attach a screenshot of your bank transfer.');
      return;
    }
    setSubmitting(true);
    try {
      await submitPaymentAPI(plan, image);
      // Refresh the session so paymentStatus reflects "submitted".
      try {
        const me = await authMe();
        if (user) dispatch(setUser({ ...user, companyStatus: me.data.user.companyStatus ?? user.companyStatus }));
      } catch {
        /* non-fatal */
      }
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[S.root, S.center]}>
        <ActivityIndicator size="large" color={DS.primary} />
      </View>
    );
  }

  // ── Success / awaiting-verification state ──
  if (submitted) {
    return (
      <View style={S.root}>
        <StatusBar barStyle="light-content" backgroundColor={DS.navy} />
        <SafeAreaView style={S.center}>
          <View style={S.successIcon}>
            <Feather name="clock" size={40} color={DS.primary} />
          </View>
          <Text style={S.successTitle}>Awaiting admin verification</Text>
          <Text style={S.successSub}>
            Your payment for the {details?.planLabel} plan was submitted. An administrator will
            verify it shortly. Your plan activates automatically once approved
            {mode === 'renew' ? ' — then sign in again to restore full access.' : '.'}
          </Text>
          <TouchableOpacity
            style={S.cta}
            onPress={() => {
              if (mode === 'change') navigation.goBack();
              else navigation.navigate('RenewSubscription' as never);
            }}
            activeOpacity={0.85}
          >
            <Text style={S.ctaLabel}>Done</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const bank = details?.bankAccount;

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={DS.navy} />
      <SafeAreaView edges={['top']} style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.back}>
          <Feather name="arrow-left" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Complete your payment</Text>
        <Text style={S.headerSub}>
          {mode === 'renew' ? 'Renew' : 'Subscribe to'} the {details?.planLabel} plan
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        {/* Bill */}
        <View style={S.card}>
          <Text style={S.cardLabel}>AMOUNT DUE</Text>
          <Text style={S.amount}>{details?.amountDueLabel}</Text>
          <Text style={S.billMeta}>
            {details?.planLabel} plan
            {details?.durationMonths ? ` · ${details.durationMonths} months` : ''}
          </Text>
        </View>

        {/* Bank details */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>Transfer to this account</Text>
          {bank && (
            <>
              <Row label="Account title" value={bank.accountTitle} onCopy={copy} />
              <Row label="Bank" value={bank.bankName} onCopy={copy} />
              <Row label="IBAN" value={bank.iban} onCopy={copy} />
            </>
          )}
          <View style={S.noteBox}>
            <Feather name="info" size={14} color={DS.primary} />
            <Text style={S.noteText}>{bank?.instructions}</Text>
          </View>
        </View>

        {/* Upload screenshot */}
        <View style={S.card}>
          <Text style={S.sectionTitle}>Upload transfer screenshot</Text>
          {image ? (
            <View>
              <Image source={{ uri: image.uri }} style={S.preview} resizeMode="cover" />
              <TouchableOpacity style={S.changeBtn} onPress={pickImage}>
                <Feather name="refresh-cw" size={14} color={DS.primary} />
                <Text style={S.changeBtnText}>Change screenshot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={S.uploadBox} onPress={pickImage} activeOpacity={0.8}>
              <Feather name="upload-cloud" size={28} color={DS.primary} />
              <Text style={S.uploadText}>Tap to attach your receipt</Text>
              <Text style={S.uploadHint}>JPG / PNG, up to 8 MB</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[S.cta, submitting && S.ctaDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={S.ctaLabel}>Submit for verification</Text>
          )}
        </TouchableOpacity>
        <Text style={S.legal}>
          Your subscription activates once an administrator verifies the payment. Your data is
          never affected by this process.
        </Text>
      </ScrollView>
    </View>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
}> = ({ label, value, onCopy }) => (
  <View style={S.row}>
    <View style={{ flex: 1 }}>
      <Text style={S.rowLabel}>{label}</Text>
      <Text style={S.rowValue}>{value}</Text>
    </View>
    <TouchableOpacity onPress={() => onCopy(label, value)} style={S.copyBtn}>
      <Feather name="copy" size={16} color={DS.primary} />
    </TouchableOpacity>
  </View>
);

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  header: { backgroundColor: DS.navy, paddingHorizontal: 20, paddingBottom: 20 },
  back: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 14,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },

  card: {
    backgroundColor: DS.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: DS.border,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', color: DS.text.muted, letterSpacing: 1 },
  amount: { fontSize: 34, fontWeight: '800', color: DS.text.h, marginTop: 6 },
  billMeta: { fontSize: 13, color: DS.text.sub, marginTop: 4 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: DS.text.h, marginBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F2F4',
  },
  rowLabel: { fontSize: 11, color: DS.text.muted },
  rowValue: { fontSize: 15, color: DS.text.h, fontWeight: '600', marginTop: 2 },
  copyBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center',
  },
  noteBox: {
    flexDirection: 'row', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10,
    padding: 12, marginTop: 12,
  },
  noteText: { flex: 1, fontSize: 12, color: DS.text.sub, lineHeight: 18 },

  uploadBox: {
    borderWidth: 1.5, borderColor: '#A7F3D0', borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 28, alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4',
  },
  uploadText: { fontSize: 14, fontWeight: '600', color: DS.text.h },
  uploadHint: { fontSize: 11, color: DS.text.muted },
  preview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#EEE' },
  changeBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingTop: 12 },
  changeBtnText: { fontSize: 13, fontWeight: '600', color: DS.primary },

  cta: {
    height: 54, borderRadius: 14, backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaLabel: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  legal: { fontSize: 11, color: DS.text.muted, textAlign: 'center', lineHeight: 16, marginTop: 4 },

  successIcon: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#ECFDF5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: DS.text.h, textAlign: 'center' },
  successSub: { fontSize: 14, color: DS.text.sub, textAlign: 'center', lineHeight: 21, marginTop: 10, marginBottom: 28 },
});

export default SubscriptionPayScreen;
