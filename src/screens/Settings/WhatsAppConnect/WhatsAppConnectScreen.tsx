// ═══════════════════════════════════════════════════════
// FinMatrix — WhatsApp Connect (owner settings)
// The master switch, what goes out automatically, when, in
// which language, a monthly cap, a test message, the one-time
// consent confirmation, and this month's usage.
// ═══════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { useWhatsappConnect } from '../../../hooks/useWhatsappConnect';
import { useIsOwner } from '../../../hooks/useCapability';
import {
  confirmContactsConsent,
  fetchMessagingStats,
  saveMessagingSettings,
  selectMessagingSaving,
  selectMessagingStats,
} from './whatsAppConnectSlice';
import { sendTestMessageAPI } from '../../../networks/messaging/messagingNetwork';
import {
  EVENT_LABELS,
  MESSAGE_EVENTS,
  RULE_LABELS,
  type EventRule,
  type MessageEvent,
} from '../../../models/messagingModel';
import { ReportContainer, ReportHeader, EmptyBlock, LoadingBlock } from '../../../components/reports/ReportUI';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomButton from '../../../Custom-Components/CustomButton';
import BottomSheet from '../../Reports/shared/BottomSheet';
import { formatDate } from '../../../utils/formatters';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

const { colors, typography, spacing, radius } = THEME;
type Nav = NativeStackNavigationProp<MoreStackParamList>;

/** invoice_revised has no trigger while a sent invoice cannot be edited (see CONNECT_PROGRESS D4). */
const SHOWN_EVENTS = MESSAGE_EVENTS.filter(e => e !== 'invoice_revised');
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const days = (v: string): number[] | null => {
  const parts = v.split(/[\s,]+/).filter(Boolean);
  const n = parts.map(Number);
  return n.every(x => Number.isInteger(x) && x >= 0 && x <= 365) ? n : null;
};

const WhatsAppConnectScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { featureOn, settings, loading, refresh } = useWhatsappConnect();
  const isOwner = useIsOwner();
  const saving = useAppSelector(selectMessagingSaving);
  const stats = useAppSelector(selectMessagingStats);
  const [consentOpen, setConsentOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  // Editable copy of the form fields; rules and the switch save on tap.
  const [quietOn, setQuietOn] = useState(true);
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('09:00');
  const [before, setBefore] = useState('3');
  const [after, setAfter] = useState('0, 7, 15, 30');
  const [cap, setCap] = useState('');

  // Refill the editable copy whenever fresh settings arrive (adjusted during
  // render, the React-recommended way to derive state from a changing prop).
  const [syncedFrom, setSyncedFrom] = useState<typeof settings>(null);
  if (settings && settings !== syncedFrom) {
    setSyncedFrom(settings);
    setQuietOn(!!settings.quietHours);
    setQuietStart(settings.quietHours?.start ?? '21:00');
    setQuietEnd(settings.quietHours?.end ?? '09:00');
    setBefore(settings.reminderSchedule.beforeDue.join(', '));
    setAfter(settings.reminderSchedule.afterDue.join(', '));
    setCap(settings.monthlyCap === null ? '' : String(settings.monthlyCap));
  }

  useEffect(() => {
    if (featureOn) void dispatch(fetchMessagingStats());
  }, [dispatch, featureOn]);

  const save = useCallback(
    async (patch: Parameters<typeof saveMessagingSettings>[0], done?: string) => {
      const r: any = await dispatch(saveMessagingSettings(patch));
      if (r.error) {
        Toast.show({ type: 'error', text1: 'Not saved', text2: r.payload?.message ?? r.error?.message });
        return false;
      }
      if (done) Toast.show({ type: 'success', text1: done });
      return true;
    },
    [dispatch],
  );

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (quietOn && !HHMM.test(quietStart)) e.quietStart = 'Use HH:mm, e.g. 21:00';
    if (quietOn && !HHMM.test(quietEnd)) e.quietEnd = 'Use HH:mm, e.g. 09:00';
    if (!days(before)) e.before = 'Whole days, comma separated';
    if (!days(after)) e.after = 'Whole days, comma separated';
    if (cap.trim() && !(Number.isInteger(Number(cap)) && Number(cap) >= 0)) e.cap = 'A whole number, or empty for no cap';
    return e;
  }, [quietOn, quietStart, quietEnd, before, after, cap]);

  const saveSchedule = useCallback(async () => {
    if (Object.keys(errors).length) {
      Toast.show({ type: 'error', text1: 'Check the highlighted fields' });
      return;
    }
    await save(
      {
        quietHours: quietOn ? { start: quietStart, end: quietEnd } : null,
        reminderSchedule: { beforeDue: days(before) ?? [], afterDue: days(after) ?? [] },
        monthlyCap: cap.trim() ? Number(cap) : null,
      },
      'Saved',
    );
  }, [errors, save, quietOn, quietStart, quietEnd, before, after, cap]);

  const sendTest = useCallback(async () => {
    setTesting(true);
    try {
      const r = await sendTestMessageAPI();
      Toast.show(
        r.status === 'queued'
          ? { type: 'success', text1: 'Test queued', text2: 'It goes to your own WhatsApp in a few seconds.' }
          : { type: 'info', text1: 'Not sent', text2: r.skipReason ?? r.status },
      );
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not send the test', text2: e?.message });
    } finally {
      setTesting(false);
    }
  }, []);

  if (!featureOn) {
    return (
      <ReportContainer>
        <ReportHeader title="WhatsApp Connect" onBack={() => navigation.goBack()} />
        <EmptyBlock icon="message-circle" title="WhatsApp Connect is not part of this plan" />
      </ReportContainer>
    );
  }
  if (!settings) {
    return (
      <ReportContainer>
        <ReportHeader title="WhatsApp Connect" onBack={() => navigation.goBack()} />
        {loading ? <LoadingBlock /> : <EmptyBlock icon="wifi-off" title="Could not load the settings" />}
      </ReportContainer>
    );
  }

  const readOnly = !isOwner;
  return (
    <ReportContainer>
      <ReportHeader
        title="WhatsApp Connect"
        subtitle={
          settings.providerMode === 'simulated'
            ? 'Simulated — nothing reaches WhatsApp yet'
            : "Sent from FinMatrix's WhatsApp number, in your company's name"
        }
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!settings.available ? (
          <View style={[styles.card, { marginBottom: spacing.md }]}>
            <Text style={styles.rowTitle}>WhatsApp sending is being set up</Text>
            <Text style={styles.rowSub}>
              {"It can be switched on as soon as FinMatrix's WhatsApp number is ready. Until then, the WhatsApp button on each document opens a chat on your own phone, as before."}
            </Text>
          </View>
        ) : null}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Send documents on WhatsApp</Text>
              <Text style={styles.rowSub}>
                Invoices, receipts, purchase orders and remittances go to your contacts from the server, with the PDF, and you can see when they are read.
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              disabled={readOnly || saving || (!settings.available && !settings.enabled)}
              onValueChange={v => void save({ enabled: v }, v ? 'WhatsApp Connect is on' : 'WhatsApp Connect is off')}
              trackColor={{ false: colors.neutral300, true: colors.primary }}
              thumbColor={colors.surface}
              accessibilityLabel="Send documents on WhatsApp"
            />
          </View>
        </View>

        <Text style={styles.section}>WHAT GOES OUT</Text>
        <View style={styles.card}>
          {SHOWN_EVENTS.map((e: MessageEvent, i) => (
            <View key={e} style={[styles.ruleRow, i > 0 && styles.divider]}>
              <Text style={styles.ruleLabel}>{EVENT_LABELS[e]}</Text>
              <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={EVENT_LABELS[e]}>
                {(['auto', 'manual', 'off'] as EventRule[]).map(r => {
                  const on = settings.eventRules[e] === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      disabled={readOnly || saving}
                      style={[styles.segBtn, on && styles.segBtnOn]}
                      onPress={() => void save({ eventRules: { [e]: r } })}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on, disabled: readOnly }}
                    >
                      <Text style={[styles.segText, on && styles.segTextOn]}>{RULE_LABELS[r]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.section}>LANGUAGE</Text>
        <View style={[styles.card, styles.langRow]}>
          {(
            [
              ['en', 'English'],
              ['ur', 'اردو (Urdu)'],
            ] as const
          ).map(([l, label]) => {
            const on = settings.defaultLanguage === l;
            return (
              <TouchableOpacity
                key={l}
                disabled={readOnly || saving}
                style={[styles.segBtn, on && styles.segBtnOn]}
                onPress={() => void save({ defaultLanguage: l })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.segText, on && styles.segTextOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.section}>WHEN</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={[styles.rowTitle, { flex: 1 }]}>Quiet hours ({settings.timezone})</Text>
            <Switch
              value={quietOn}
              disabled={readOnly}
              onValueChange={setQuietOn}
              trackColor={{ false: colors.neutral300, true: colors.primary }}
              thumbColor={colors.surface}
              accessibilityLabel="Quiet hours"
            />
          </View>
          {quietOn && (
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <CustomInput label="From" value={quietStart} onChangeText={setQuietStart} placeholder="21:00" error={errors.quietStart} disabled={readOnly} />
              </View>
              <View style={styles.col}>
                <CustomInput label="Until" value={quietEnd} onChangeText={setQuietEnd} placeholder="09:00" error={errors.quietEnd} disabled={readOnly} />
              </View>
            </View>
          )}
          <Text style={styles.rowSub}>Messages wait until quiet hours end. Approval alerts go at any hour.</Text>
          <CustomInput label="Reminder days before the due date" value={before} onChangeText={setBefore} placeholder="3" keyboardType="numbers-and-punctuation" error={errors.before} disabled={readOnly} />
          <CustomInput label="Reminder days after the due date" value={after} onChangeText={setAfter} placeholder="0, 7, 15, 30" keyboardType="numbers-and-punctuation" error={errors.after} disabled={readOnly} />
          <CustomInput label="Monthly message cap (empty = no cap)" value={cap} onChangeText={setCap} placeholder="No cap" keyboardType="number-pad" error={errors.cap} disabled={readOnly} />
          {!readOnly && <CustomButton title="Save" onPress={saveSchedule} isLoading={saving} variant="primary" size="md" fullWidth />}
        </View>

        <Text style={styles.section}>CONTACTS</Text>
        <View style={styles.card}>
          <Text style={styles.rowTitle}>Consent</Text>
          <Text style={styles.rowSub}>
            {settings.contactsOptInConfirmedAt
              ? `Confirmed on ${formatDate(settings.contactsOptInConfirmedAt)}: your existing contacts agreed to WhatsApp messages.`
              : 'Messages only go to contacts whose consent is recorded. If all your existing contacts agreed, confirm it once here.'}
          </Text>
          {!settings.contactsOptInConfirmedAt && !readOnly && (
            <CustomButton title="Confirm consent for existing contacts" onPress={() => setConsentOpen(true)} variant="secondary" size="sm" fullWidth />
          )}
          <View style={{ height: spacing.sm }} />
          <CustomButton title="Fix contacts" onPress={() => navigation.navigate('FixContacts')} variant="text" size="sm" fullWidth />
        </View>

        <Text style={styles.section}>THIS MONTH</Text>
        <View style={styles.card}>
          {settings.allowance ? <AllowanceBar limit={settings.allowance.limit} used={settings.allowance.used} /> : null}
          {stats ? (
            <>
              <Text style={styles.rowTitle}>
                {stats.usage.count} sent{stats.usage.cap !== null ? ` of ${stats.usage.cap}` : ''}
              </Text>
              <Text style={styles.rowSub}>
                {stats.delivered} delivered · {stats.read} read · {stats.failed} not delivered · {stats.remindersSent} reminders
              </Text>
            </>
          ) : (
            <Text style={styles.rowSub}>No messages yet.</Text>
          )}
          {!readOnly && (
            <>
              <View style={{ height: spacing.sm }} />
              <CustomButton title="Send me a test message" onPress={sendTest} isLoading={testing} variant="secondary" size="sm" fullWidth />
            </>
          )}
        </View>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <BottomSheet
        visible={consentOpen}
        onClose={() => setConsentOpen(false)}
        title="Confirm consent"
        subtitle="Once, for your existing contacts"
        footer={
          <CustomButton
            title="Yes, they agreed"
            variant="primary"
            size="md"
            fullWidth
            onPress={async () => {
              setConsentOpen(false);
              const r: any = await dispatch(confirmContactsConsent());
              if (r.error) Toast.show({ type: 'error', text1: 'Not confirmed', text2: r.error?.message });
              else Toast.show({ type: 'success', text1: 'Consent confirmed' });
              refresh();
            }}
          />
        }
      >
        <Text style={styles.sheetText}>
          WhatsApp only allows business messages to people who agreed to receive them. Confirm that your existing customers and vendors agreed to get invoices, receipts, reminders and orders from your business on WhatsApp. This is recorded with your name and the time, and cannot be undone here. Anyone can still reply STOP to stop the messages.
        </Text>
      </BottomSheet>
    </ReportContainer>
  );
};

/**
 * The plan's WhatsApp allowance: FinMatrix pays Meta for these messages, so at
 * the limit automatic sending pauses until next month (sharing by hand still works).
 */
function AllowanceBar({ limit, used }: { limit: number; used: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;
  const full = used >= limit;
  const fill = full ? colors.danger : pct >= 80 ? colors.warning : colors.primary;
  return (
    <View style={styles.allowance} accessibilityLabel={`${used} of ${limit} WhatsApp messages used this month`}>
      <Text style={styles.rowTitle}>
        {used} of {limit}
        <Text style={styles.rowSubInline}> WhatsApp messages included in your plan</Text>
      </Text>
      <View style={styles.allowanceTrack}>
        <View style={[styles.allowanceFill, { width: `${pct}%`, backgroundColor: fill }]} />
      </View>
      {full ? (
        <Text style={styles.allowanceFull}>
          Used up: documents go out on WhatsApp again next month. You can still share them by hand.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md },
  allowance: { marginBottom: spacing.sm },
  rowSubInline: { ...typography.bodySm, color: colors.textSecondary },
  allowanceTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.neutral100,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  allowanceFill: { height: '100%', borderRadius: radius.full },
  allowanceFull: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  section: { ...typography.overline, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  rowTitle: { ...typography.labelLg, color: colors.textPrimary },
  rowSub: { ...typography.bodySm, color: colors.textSecondary, marginTop: spacing.xxs, marginBottom: spacing.sm },
  ruleRow: { paddingVertical: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  ruleLabel: { ...typography.labelMd, color: colors.textPrimary, marginBottom: spacing.xs },
  segment: { flexDirection: 'row', flexWrap: 'wrap' },
  segBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    marginBottom: spacing.xxs,
  },
  segBtnOn: { backgroundColor: colors.primaryLighter, borderColor: colors.primary },
  segText: { ...typography.labelSm, color: colors.textSecondary },
  segTextOn: { color: colors.primary },
  langRow: { flexDirection: 'row' },
  twoCol: { flexDirection: 'row' },
  col: { flex: 1, marginRight: spacing.xs },
  sheetText: { ...typography.bodyMd, color: colors.textSecondary },
});

export default WhatsAppConnectScreen;
