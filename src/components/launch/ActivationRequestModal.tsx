// ═══════════════════════════════════════════════════════
// FinMatrix — "Request activation"
// ═══════════════════════════════════════════════════════
// No online payment: the owner names the plan they want (or "not sure") and
// the FinMatrix team switches it on. Used by the trial banner and the
// trial-ended screen. Same endpoint and copy as the web.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { AuthField, AuthSelect } from '../auth/AuthUI';
import { LAUNCH, LAUNCH_ERRORS } from '../../config/launchStrings';
import { getOfferedPlans, requestActivation, type OfferedPlan } from '../../networks/launch/launchNetwork';
import { THEME } from '../../theme';

const { colors, radius, spacing, typography } = THEME;
export const UNSURE_PLAN = 'unsure';

interface Props {
  companyId: string;
  visible: boolean;
  onClose: () => void;
  onDone?: () => void;
}

const ActivationRequestModal: React.FC<Props> = ({ companyId, visible, onClose, onDone }) => {
  const [plans, setPlans] = useState<OfferedPlan[]>([]);
  const [plan, setPlan] = useState(UNSURE_PLAN);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    getOfferedPlans().then(setPlans).catch((): void => undefined);
  }, [visible]);

  const close = () => {
    setError('');
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await requestActivation(companyId, { requestedPlan: plan, note: note.trim() || undefined });
      Toast.show({ type: 'success', text1: LAUNCH.activationSent });
      setNote('');
      close();
      onDone?.();
    } catch (e) {
      const code = (e as { code?: string })?.code;
      const known = code ? LAUNCH_ERRORS[code] : undefined;
      setError(known ? known : (e as Error)?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={S.scrim}>
        <View style={S.sheet}>
          <Text style={[S.title]}>{LAUNCH.activationTitle}</Text>
          <Text style={[S.body]}>{LAUNCH.activationBody}</Text>
          <AuthSelect
            label={LAUNCH.planLabel}
            value={plan}
            onChange={setPlan}
            options={[
              { value: UNSURE_PLAN, label: LAUNCH.planUnsure },
              ...plans.map(p => ({ value: p.key, label: p.label })),
            ]}
          />
          <AuthField
            label={LAUNCH.noteLabel}
            value={note}
            onChangeText={setNote}
            maxLength={1000}
            multiline
          />
          {error ? <Text style={[S.error]}>{error}</Text> : null}
          <View style={S.row}>
            <Pressable onPress={close} disabled={busy} style={S.secondary} accessibilityRole="button">
              <Text style={S.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => void submit()}
              disabled={busy}
              style={[S.primary, busy && S.disabled]}
              accessibilityRole="button"
              testID="activation-submit"
            >
              {busy ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={S.primaryText}>{LAUNCH.requestActivation}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const S = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  title: { ...typography.h4, color: colors.neutral900 },
  body: { ...typography.bodySm, color: colors.neutral600 },
  error: { ...typography.bodySm, color: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  secondary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  secondaryText: { ...typography.labelMd, color: colors.neutral800 },
  primary: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    minWidth: 160,
    alignItems: 'center',
  },
  primaryText: { ...typography.labelMd, color: colors.textInverse },
  disabled: { opacity: 0.6 },
});

export default ActivationRequestModal;
