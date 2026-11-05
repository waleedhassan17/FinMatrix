import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { THEME } from '../../../theme';
import { formatDateTime } from '../../../utils/formatters';
import { downloadAndShareFile } from '../../../networks/network/authedDownload';
import {
  getMessageTimelineAPI,
  messageMediaPath,
  resendMessageAPI,
} from '../../../networks/messaging/messagingNetwork';
import { isInFlight, STATUS_WORDS, type TimelineMessage } from '../../../models/messagingModel';
import MessageStatusTicks from './MessageStatusTicks';

const { colors, typography, spacing, radius } = THEME;

export interface MessageTimelineProps {
  docType: string;
  docId: string | null | undefined;
  title?: string;
  /** Change to reload (e.g. after a send). */
  refreshKey?: unknown;
  /** Report the newest message, for "Remittance sent to …" style summaries. */
  onLatest?: (m: TimelineMessage | null) => void;
  /**
   * 'latest': one line for the newest message ("Receipt sent to Ali · ✓✓"),
   * for a success sheet. 'full' (default): the whole timeline card.
   */
  variant?: 'full' | 'latest';
  /** For 'latest': what was sent, e.g. 'Receipt'. */
  latestLabel?: string;
}

const POLL_MS = 5_000;

/**
 * Every WhatsApp message about one document, newest first: what it was, who it
 * went to (masked), when, its ticks, and in plain words why it did not go.
 * "View PDF sent" opens the exact copy that was sent; Resend is offered for a
 * failed message. Polls every 5 s only while something is still on its way.
 */
const MessageTimeline: React.FC<MessageTimelineProps> = ({
  docType,
  docId,
  title = 'WhatsApp',
  refreshKey,
  onLatest,
  variant = 'full',
  latestLabel = 'Sent',
}) => {
  const [messages, setMessages] = useState<TimelineMessage[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Bumped to re-read: by the poll timer, and after a resend. */
  const [tick, setTick] = useState(0);
  const onLatestRef = useRef(onLatest);
  useEffect(() => {
    onLatestRef.current = onLatest;
  }, [onLatest]);

  const load = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!docId) return undefined;
    let live = true;
    getMessageTimelineAPI(docType, docId)
      .then(list => {
        if (!live) return;
        setMessages(list);
        onLatestRef.current?.(list[0] ?? null);
      })
      .catch(() => {
        if (live) setMessages(prev => prev ?? []);
      });
    return () => {
      live = false;
    };
  }, [docType, docId, refreshKey, tick]);

  // Poll only while something is still on its way (queued, sending, sent).
  const inFlight = !!messages?.some(m => isInFlight(m.status));
  useEffect(() => {
    if (!inFlight) return undefined;
    const t = setTimeout(() => setTick(n => n + 1), POLL_MS);
    return () => clearTimeout(t);
  }, [inFlight, messages]);

  const viewPdf = useCallback(async (m: TimelineMessage) => {
    try {
      setBusyId(m.id);
      await downloadAndShareFile(messageMediaPath(m.id), `${m.eventLabel.replace(/\W+/g, '-')}.pdf`, 'application/pdf');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not open the PDF', text2: e?.message });
    } finally {
      setBusyId(null);
    }
  }, []);

  const resend = useCallback(
    async (m: TimelineMessage) => {
      try {
        setBusyId(m.id);
        const r = await resendMessageAPI(m.id);
        Toast.show(
          r.status === 'queued'
            ? { type: 'success', text1: 'Queued', text2: 'It goes out in a few seconds.' }
            : { type: 'info', text1: 'Not sent', text2: r.skipReason ?? STATUS_WORDS[r.status] },
        );
        load();
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Could not resend', text2: e?.message });
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  if (!docId) return null;

  if (variant === 'latest') {
    const m = messages?.[0];
    if (!m) return null;
    const notGone = m.status === 'skipped' || m.status === 'cancelled' || m.status === 'failed';
    return (
      <View style={styles.latest} testID="message-latest" accessibilityLiveRegion="polite">
        <Text style={styles.latestText} numberOfLines={2}>
          {notGone
            ? `${latestLabel} not sent on WhatsApp${m.reason ? `: ${m.reason}` : ''}`
            : `${latestLabel} sent to ${m.recipientName || 'the customer'} on WhatsApp`}
        </Text>
        <MessageStatusTicks status={m.status} />
      </View>
    );
  }

  return (
    <View testID="message-timeline">
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>
        {messages === null ? (
          <ActivityIndicator color={colors.textTertiary} />
        ) : messages.length === 0 ? (
          <Text style={styles.empty}>No WhatsApp messages for this document yet.</Text>
        ) : (
          messages.map((m, i) => (
            <View key={m.id} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.rowTop}>
                <Text style={styles.event} numberOfLines={1}>
                  {m.eventLabel}
                  {m.channel === 'wa_link' ? ' · shared by hand' : ''}
                </Text>
                <MessageStatusTicks status={m.status} showLabel />
              </View>
              <Text style={styles.meta}>
                {[m.recipientName, m.toPhoneMasked].filter(Boolean).join(' · ')}
                {m.createdAt ? ` · ${formatDateTime(m.createdAt)}` : ''}
              </Text>
              {m.reason ? <Text style={[styles.reason, m.status === 'failed' && styles.reasonDanger]}>{m.reason}</Text> : null}
              {(m.hasMedia || m.canResend) && (
                <View style={styles.actions}>
                  {m.hasMedia ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => viewPdf(m)}
                      disabled={busyId === m.id}
                      style={styles.link}
                    >
                      <Text style={styles.linkText}>View PDF sent</Text>
                    </TouchableOpacity>
                  ) : null}
                  {m.canResend ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => resend(m)}
                      disabled={busyId === m.id}
                      style={styles.link}
                    >
                      <Text style={styles.linkText}>Resend</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    ...typography.overline,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  empty: { ...typography.bodySm, color: colors.textTertiary },
  row: { paddingVertical: spacing.xs },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  event: { ...typography.labelMd, color: colors.textPrimary, flex: 1, marginRight: spacing.xs },
  meta: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
  reason: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  reasonDanger: { color: colors.danger },
  actions: { flexDirection: 'row', marginTop: spacing.xs },
  link: { marginRight: spacing.md },
  linkText: { ...typography.labelSm, color: colors.primary },
  latest: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  latestText: { ...typography.bodySm, color: colors.textSecondary, marginRight: spacing.xs, flexShrink: 1, textAlign: 'center' },
});

export default MessageTimeline;
