import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../../theme';
import { STATUS_WORDS, tickSpec, type MessageStatus } from '../../../models/messagingModel';

const { colors, typography, spacing } = THEME;

/**
 * WhatsApp delivery ticks: clock while waiting, one check sent, two checks
 * delivered, two checks in the accent (info) colour when read, an alert when
 * it failed, muted when it was not sent. The words are always the accessible
 * label, so a screen reader hears "Delivered", not an icon.
 */
const TONE: Record<'muted' | 'neutral' | 'accent' | 'danger', string> = {
  muted: colors.textTertiary,
  neutral: colors.textSecondary,
  accent: colors.info,
  danger: colors.danger,
};

export interface MessageStatusTicksProps {
  status: MessageStatus;
  size?: number;
  /** Show the status in words beside the ticks. */
  showLabel?: boolean;
}

const MessageStatusTicks: React.FC<MessageStatusTicksProps> = ({ status, size = 14, showLabel = false }) => {
  const spec = tickSpec(status);
  const color = TONE[spec.tone];
  const words = STATUS_WORDS[status];
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`WhatsApp: ${words}`}
      testID={`ticks-${status}`}
    >
      <Feather name={spec.icon} size={size} color={color} />
      {spec.double ? (
        <Feather name="check" size={size} color={color} style={{ marginLeft: -Math.round(size * 0.55) }} />
      ) : null}
      {showLabel ? <Text style={[styles.label, { color }]}>{words}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { ...typography.labelSm, marginLeft: spacing.xxs },
});

export default MessageStatusTicks;
