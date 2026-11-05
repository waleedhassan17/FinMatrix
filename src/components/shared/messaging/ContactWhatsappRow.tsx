import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../../theme';
import { useContactWhatsapp, useWhatsappConnect } from '../../../hooks/useWhatsappConnect';
import { CONTACT_STATUS_WORDS, type ContactStatus } from '../../../models/messagingModel';
import { formatWhatsappPreview } from '../../../utils/whatsappPreview';

const { colors, typography, spacing, radius } = THEME;

const TONE: Record<ContactStatus, { fg: string; bg: string }> = {
  ready: { fg: colors.success, bg: colors.successLighter },
  unverified: { fg: colors.success, bg: colors.successLighter },
  no_consent: { fg: colors.warning, bg: colors.warningLighter },
  missing: { fg: colors.textSecondary, bg: colors.neutral100 },
  invalid: { fg: colors.textSecondary, bg: colors.neutral100 },
  not_on_whatsapp: { fg: colors.danger, bg: colors.dangerLighter },
  opted_out: { fg: colors.danger, bg: colors.dangerLighter },
};

/**
 * "WhatsApp · Ready +92 312 4890176" on a customer or vendor: whether FinMatrix
 * Connect can message them. Renders nothing unless Connect is on.
 */
const ContactWhatsappRow: React.FC<{
  partyType: 'customer' | 'vendor';
  partyId: string | null | undefined;
  refreshKey?: unknown;
}> = ({ partyType, partyId, refreshKey }) => {
  const { enabled } = useWhatsappConnect();
  const row = useContactWhatsapp(partyType, partyId, enabled, refreshKey);
  if (!enabled || !row) return null;
  const tone = TONE[row.status];
  const number = formatWhatsappPreview(row.whatsappE164);
  return (
    <View style={styles.row} accessible accessibilityLabel={`WhatsApp: ${CONTACT_STATUS_WORDS[row.status]}`}>
      <Feather name="message-circle" size={14} color={colors.textSecondary} style={styles.icon} />
      <Text style={styles.label}>WhatsApp</Text>
      <View style={styles.value}>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.fg }]}>{CONTACT_STATUS_WORDS[row.status]}</Text>
        </View>
        {number ? (
          <Text style={styles.number} numberOfLines={1}>
            {number}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  icon: { marginRight: spacing.xs },
  label: { ...typography.bodySm, color: colors.textSecondary, width: 80 },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  pill: { borderRadius: radius.full, paddingHorizontal: spacing.xs, paddingVertical: 2, marginRight: spacing.xs },
  pillText: { ...typography.labelSm },
  number: { ...typography.bodySm, color: colors.textPrimary, flexShrink: 1 },
});

export default ContactWhatsappRow;
