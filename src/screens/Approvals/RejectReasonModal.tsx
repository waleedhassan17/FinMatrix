// ═══════════════════════════════════════════════════════
// FinMatrix — Reject-with-a-reason modal
// ═══════════════════════════════════════════════════════
// Extracted from StaffApprovalsScreen so the approvals inbox and the review
// form share one implementation. A rejection must carry a comment — the server
// enforces it, because a request turned down without a reason tells the
// requester nothing — so the confirm button stays disabled until there is one.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { THEME } from '../../utils/theme';
import CustomButton from '../../Custom-Components/CustomButton';

const { colors, radius, spacing, typography } = THEME;

/** The server's own floor. Anything shorter is not a reason. */
const MIN_REASON = 3;

const RejectReasonModal: React.FC<{
  visible: boolean;
  /** Shown under the title so the reviewer can see what they are rejecting. */
  summary?: string;
  onCancel: () => void;
  onSubmit: (comment: string) => void;
}> = ({ visible, summary, onCancel, onSubmit }) => {
  const [comment, setComment] = useState('');

  // Cleared on the way out through either exit rather than in an effect on
  // `visible`, so a reason typed for one request can never appear pre-filled
  // under the next one. These are the only two ways the modal closes.
  const cancel = () => {
    setComment('');
    onCancel();
  };
  const submit = () => {
    const reason = comment.trim();
    setComment('');
    onSubmit(reason);
  };

  const tooShort = comment.trim().length < MIN_REASON;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Why are you rejecting this?</Text>
          <Text style={styles.modalSubtitle}>{summary}</Text>
          <TextInput
            style={styles.modalInput}
            value={comment}
            onChangeText={setComment}
            placeholder="The requester sees this"
            placeholderTextColor={colors.textTertiary}
            multiline
            autoFocus
          />
          <View style={styles.modalActions}>
            <View style={styles.modalBtn}>
              <CustomButton title="Cancel" variant="secondary" onPress={cancel} fullWidth />
            </View>
            {/* The final "yes" of a rejection: the one place a filled red button belongs. */}
            <View style={styles.modalBtn}>
              <CustomButton title="Reject request" variant="danger" onPress={submit} disabled={tooShort} fullWidth />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.neutral0,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { ...typography.displaySm, color: colors.textPrimary },
  modalSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  modalInput: {
    ...typography.bodyMd,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: { flex: 1 },
});

export default RejectReasonModal;
