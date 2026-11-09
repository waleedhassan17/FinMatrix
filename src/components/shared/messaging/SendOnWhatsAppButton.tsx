import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import CustomButton from '../../../Custom-Components/CustomButton';
import { THEME } from '../../../theme';
import { normalizeWhatsappPhone } from '../../../utils/whatsappPhone';
import { useWhatsappConnect } from '../../../hooks/useWhatsappConnect';
import { logManualShareAPI, sendMessageAPI } from '../../../networks/messaging/messagingNetwork';
import type { SendableDocType } from '../../../models/messagingModel';

const { colors, typography, spacing } = THEME;

export interface SendOnWhatsAppButtonProps {
  title: string;
  docType: SendableDocType;
  docId: string;
  /** e.g. 'reminder' or 'invoice_issued' (see POST /messages/send). */
  event?: string;
  /** The contact's number, for the hand-off and to disable when unusable. */
  phone: string | null | undefined;
  optedOut?: boolean;
  /**
   * Connect off: the existing wa.me hand-off (openWhatsAppChat & co). Its
   * result decides whether the share is logged.
   */
  fallback: () => Promise<{ opened: boolean; reason?: string }>;
  onSent?: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  /** Tighter padding, for a slot in an ActionBar. */
  compact?: boolean;
  /**
   * Show why the button is disabled under it. Off inside an ActionBar, where
   * a caption under one button grew the whole bar: the screen puts the same
   * words (whatsappDisabledReason) in the bar's note instead.
   */
  showReason?: boolean;
}

/** Why a WhatsApp send is impossible for this contact, or null if it is not. */
export const whatsappDisabledReason = (
  phone: string | null | undefined,
  optedOut?: boolean,
): string | null =>
  optedOut ? 'Opted out of WhatsApp' : !normalizeWhatsappPhone(phone) ? 'No WhatsApp number' : null;

/**
 * One WhatsApp button for every document.
 * - Connect on: the SERVER sends (with the PDF) and the toast says "Queued".
 * - Connect off: the wa.me chat opens as before, and the share is recorded on
 *   the document's timeline when the plan has Connect.
 * - No usable number, or the contact replied STOP: disabled, with the reason.
 */
const SendOnWhatsAppButton: React.FC<SendOnWhatsAppButtonProps> = ({
  title,
  docType,
  docId,
  event,
  phone,
  optedOut,
  fallback,
  onSent,
  variant = 'secondary',
  size = 'sm',
  fullWidth = true,
  compact = false,
  showReason = true,
}) => {
  const { enabled, featureOn } = useWhatsappConnect();
  const [busy, setBusy] = useState(false);
  const disabledReason = whatsappDisabledReason(phone, optedOut);

  const press = useCallback(async () => {
    if (disabledReason) return;
    setBusy(true);
    try {
      if (enabled) {
        const r = await sendMessageAPI({ docType, docId, event });
        if (r.status === 'queued' || r.status === 'sending' || r.status === 'sent') {
          Toast.show({ type: 'success', text1: 'Queued', text2: 'WhatsApp sends it in a few seconds.' });
        } else {
          Toast.show({ type: 'info', text1: 'Not sent', text2: r.skipReason ?? 'WhatsApp did not take it.' });
        }
        onSent?.();
        return;
      }
      const opened = await fallback();
      if (!opened.opened) {
        Toast.show({ type: 'error', text1: 'WhatsApp', text2: opened.reason || 'Could not open WhatsApp.' });
        return;
      }
      if (featureOn && phone) {
        // Best effort: the chat already opened; the record is a bonus.
        await logManualShareAPI({ docType, docId, toPhone: phone, event }).catch((): null => null);
      }
      onSent?.();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not send', text2: e?.message });
    } finally {
      setBusy(false);
    }
  }, [disabledReason, enabled, featureOn, docType, docId, event, phone, fallback, onSent]);

  return (
    <View style={fullWidth ? styles.full : undefined}>
      <CustomButton
        title={title}
        onPress={press}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        compact={compact}
        accessibilityHint={disabledReason ?? undefined}
        isLoading={busy}
        disabled={busy || !!disabledReason}
        icon={<Feather name="message-circle" size={14} color={disabledReason ? colors.textDisabled : colors.primary} />}
      />
      {disabledReason && showReason ? (
        <Text style={styles.reason} accessibilityLiveRegion="polite">
          {disabledReason}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  full: { width: '100%' },
  reason: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxs },
});

export default SendOnWhatsAppButton;
