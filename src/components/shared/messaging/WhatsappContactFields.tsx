import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import CustomInput from '../../../Custom-Components/CustomInput';
import { THEME } from '../../../theme';
import { formatWhatsappPreview } from '../../../utils/whatsappPreview';

const { colors, typography, spacing, radius } = THEME;

/** What the WhatsApp block of a customer / vendor form holds. */
export interface WhatsappFieldsState {
  /** The number as typed. Ignored until `touched`: the server derives it from Phone. */
  value: string;
  touched: boolean;
  optIn: boolean;
  language: '' | 'en' | 'ur';
}

export const emptyWhatsappFields = (): WhatsappFieldsState => ({ value: '', touched: false, optIn: false, language: '' });

/** From a saved contact, for editing. */
export const whatsappFieldsFrom = (c: {
  whatsappE164?: string | null;
  whatsappOptInAt?: string | null;
  preferredLanguage?: 'en' | 'ur' | null;
}): WhatsappFieldsState => ({
  value: c.whatsappE164 ?? '',
  touched: false,
  optIn: !!c.whatsappOptInAt,
  language: c.preferredLanguage ?? '',
});

/** The number the field shows: what was typed, else the phone it will default to. */
export const effectiveWhatsapp = (state: WhatsappFieldsState, phone: string) =>
  state.touched ? state.value : state.value || phone;

/** Inline error, or null. An empty field is fine (the contact just gets no messages). */
export const whatsappFieldError = (state: WhatsappFieldsState, phone: string): string | null => {
  const v = effectiveWhatsapp(state, phone).trim();
  if (!state.touched || v === '') return null;
  return formatWhatsappPreview(v) ? null : 'Not a WhatsApp number. Use 0300 1234567 or +92 300 1234567.';
};

/**
 * The fields the API takes (POST/PATCH /customers, /vendors). The number is
 * sent only when someone edited it — untouched, the server keeps it, or
 * derives it again when Phone changes.
 */
export const whatsappPayload = (state: WhatsappFieldsState) => ({
  ...(state.touched ? { whatsappPhone: state.value.trim() } : {}),
  whatsappOptIn: state.optIn,
  ...(state.language ? { preferredLanguage: state.language } : {}),
});

interface Props {
  party: 'customer' | 'vendor';
  phone: string;
  state: WhatsappFieldsState;
  onChange: (next: WhatsappFieldsState) => void;
}

/**
 * WhatsApp number (prefilled from Phone, with a live "+92 300 1234567"
 * preview and an inline error), consent, and preferred language — the three
 * things FinMatrix Connect needs to message this contact.
 */
const WhatsappContactFields: React.FC<Props> = ({ party, phone, state, onChange }) => {
  const shown = effectiveWhatsapp(state, phone);
  const preview = formatWhatsappPreview(shown);
  const error = whatsappFieldError(state, phone);
  return (
    <View>
      <CustomInput
        label="WhatsApp number"
        value={shown}
        onChangeText={t => onChange({ ...state, value: t, touched: true })}
        placeholder="0300 1234567"
        keyboardType="phone-pad"
        error={error ?? undefined}
      />
      {!error && (
        <Text style={styles.preview} accessibilityLiveRegion="polite">
          {preview ? `Messages go to ${preview}` : 'No WhatsApp messages without a number.'}
        </Text>
      )}

      <TouchableOpacity
        style={styles.checkRow}
        onPress={() => onChange({ ...state, optIn: !state.optIn })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: state.optIn }}
        activeOpacity={0.7}
      >
        <View style={[styles.box, state.optIn && styles.boxOn]}>
          {state.optIn ? <Feather name="check" size={13} color={colors.textInverse} /> : null}
        </View>
        <Text style={styles.checkText}>
          {party === 'customer'
            ? 'This customer agreed to receive invoices, receipts and reminders on WhatsApp'
            : 'This vendor agreed to receive purchase orders and remittances on WhatsApp'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.langLabel}>Message language</Text>
      <View style={styles.langRow} accessibilityRole="radiogroup">
        {(
          [
            ['', 'Company default'],
            ['en', 'English'],
            ['ur', 'اردو'],
          ] as const
        ).map(([value, label]) => {
          const on = state.language === value;
          return (
            <TouchableOpacity
              key={value || 'default'}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange({ ...state, language: value })}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  preview: { ...typography.caption, color: colors.textTertiary, marginTop: -spacing.xs, marginBottom: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  langLabel: { ...typography.labelMd, color: colors.textSecondary, marginBottom: spacing.xs },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipOn: { backgroundColor: colors.primaryLighter, borderColor: colors.primary },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextOn: { color: colors.primary },
});

export default WhatsappContactFields;
