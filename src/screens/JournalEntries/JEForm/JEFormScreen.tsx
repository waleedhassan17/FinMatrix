// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entry Form Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomButton from '../../../Custom-Components/CustomButton';
import JournalLineRow from '../../../components/JournalLineRow';
import { formatCurrency } from '../../../utils/formatters';
import {
  validateJournalEntryDraft,
  validateJournalEntryPost,
  generateNextReference,
} from '../../../models/jeModel';
import type { JEFormData } from '../../../models/jeModel';

import {
  setJEFormDate,
  setJEFormReference,
  setJEFormMemo,
  setJEFormErrors,
  setJEFormSaving,
  updateLine,
  addLine,
  removeLine,
  loadEntryForEdit,
  resetJEForm,
  selectJEFormDate,
  selectJEFormReference,
  selectJEFormMemo,
  selectJEFormLines,
  selectJEFormErrors,
  selectJEFormIsSaving,
  selectJEFormEditingId,
} from './jeFormSlice';

import {
  selectJEEntries,
  createJournalEntry,
  updateJournalEntry,
  postJournalEntry,
} from '../JEList/jeListSlice';

import { selectAccounts, fetchAccounts } from '../../ChartOfAccounts/COAList/coaListSlice';

import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import type { JournalEntry } from '../../../types';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type Route = RouteProp<MoreStackParamList, 'JEForm'>;

const JEFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const dispatch = useAppDispatch();

  const entryId = route.params?.entryId;
  const isEditing = !!entryId;

  // ── Selectors ──────────────────────────────────────
  const date = useAppSelector(selectJEFormDate);
  const reference = useAppSelector(selectJEFormReference);
  const memo = useAppSelector(selectJEFormMemo);
  const lines = useAppSelector(selectJEFormLines);
  const errors = useAppSelector(selectJEFormErrors);
  const isSaving = useAppSelector(selectJEFormIsSaving);
  const editingId = useAppSelector(selectJEFormEditingId);
  const allEntries = useAppSelector(selectJEEntries);
  const accounts = useAppSelector(selectAccounts);

  // ── Load accounts if needed ────────────────────────
  useEffect(() => {
    if (accounts.length === 0) dispatch(fetchAccounts());
  }, [dispatch, accounts.length]);

  // ── Init form ──────────────────────────────────────
  useEffect(() => {
    if (isEditing) {
      const entry = allEntries.find(e => e.id === entryId);
      if (entry) {
        dispatch(
          loadEntryForEdit({
            id: entry.id,
            date: entry.date,
            reference: entry.entryNumber,
            memo: entry.description,
            lines: entry.lines.map(l => ({
              id: l.id,
              accountId: l.accountId,
              description: l.description,
              debit: l.debit > 0 ? String(l.debit) : '',
              credit: l.credit > 0 ? String(l.credit) : '',
            })),
          }),
        );
      }
    } else {
      dispatch(resetJEForm());
      // auto-generate reference
      const refs = allEntries.map(e => e.entryNumber);
      dispatch(setJEFormReference(generateNextReference(refs)));
    }
    return () => { dispatch(resetJEForm()); };
  }, [dispatch, isEditing, entryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Account dropdown options ───────────────────────
  const accountOptions = useMemo(
    () =>
      accounts
        .filter(a => a.isActive)
        .map(a => ({ label: `${a.code} — ${a.name}`, value: a.id })),
    [accounts],
  );

  // ── Totals ─────────────────────────────────────────
  const totalDebit = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0),
    [lines],
  );
  const totalCredit = useMemo(
    () => lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0),
    [lines],
  );
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01;

  // ── Build form data ────────────────────────────────
  const buildFormData = useCallback(
    (): JEFormData => ({ date, reference, memo, lines }),
    [date, reference, memo, lines],
  );

  // ── Build JournalEntry from form ───────────────────
  const buildEntry = useCallback(
    (status: 'draft' | 'posted'): JournalEntry => {
      const now = new Date().toISOString();
      const id = editingId ?? `je-new-${Date.now()}`;
      return {
        id,
        companyId: 'comp-001',
        entryNumber: reference,
        date,
        description: memo,
        reference,
        status,
        lines: lines
          .filter(l => l.accountId)
          .map(l => {
            const acct = accounts.find(a => a.id === l.accountId);
            return {
              id: l.id,
              accountId: l.accountId,
              accountName: acct?.name ?? '',
              accountCode: acct?.code ?? '',
              debit: parseFloat(l.debit) || 0,
              credit: parseFloat(l.credit) || 0,
              description: l.description,
            };
          }),
        totalDebit,
        totalCredit,
        createdBy: 'user-001',
        approvedBy: status === 'posted' ? 'user-001' : null,
        postedAt: status === 'posted' ? now : null,
        createdAt: now,
        updatedAt: now,
      };
    },
    [editingId, reference, date, memo, lines, accounts, totalDebit, totalCredit],
  );

  // ── Save as Draft ──────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    const formData = buildFormData();
    const validationErrors = validateJournalEntryDraft(formData);
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setJEFormErrors(validationErrors));
      return;
    }
    dispatch(setJEFormSaving(true));
    const entry = buildEntry('draft');
    if (isEditing) {
      await dispatch(updateJournalEntry(entry));
    } else {
      await dispatch(createJournalEntry(entry));
    }
    dispatch(setJEFormSaving(false));
    navigation.goBack();
  }, [dispatch, navigation, buildFormData, buildEntry, isEditing]);

  // ── Post ───────────────────────────────────────────
  const handlePost = useCallback(async () => {
    const formData = buildFormData();
    const validationErrors = validateJournalEntryPost(formData);
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setJEFormErrors(validationErrors));
      return;
    }
    Alert.alert('Post Entry', 'Post this journal entry? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Post',
        onPress: async () => {
          dispatch(setJEFormSaving(true));
          if (isEditing) {
            await dispatch(updateJournalEntry(buildEntry('draft')));
            await dispatch(postJournalEntry(editingId!));
          } else {
            const entry = buildEntry('posted');
            await dispatch(createJournalEntry(entry));
          }
          dispatch(setJEFormSaving(false));
          navigation.goBack();
        },
      },
    ]);
  }, [dispatch, navigation, buildFormData, buildEntry, isEditing, editingId]);

  // ── Line handlers ─────────────────────────────────
  const handleUpdateLine = useCallback(
    (index: number, field: 'accountId' | 'description' | 'debit' | 'credit', value: string) => {
      dispatch(updateLine({ index, field, value }));
    },
    [dispatch],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Entry' : 'New Entry'}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* ── Header fields ────────────────── */}
          <View style={styles.section}>
            <CustomInput
              label="Date"
              value={dayjs(date).format('YYYY-MM-DD')}
              onChangeText={v => dispatch(setJEFormDate(v))}
              placeholder="YYYY-MM-DD"
              error={errors.date}
            />
            <CustomInput
              label="Reference"
              value={reference}
              onChangeText={v => dispatch(setJEFormReference(v))}
              placeholder="JE-001"
              error={errors.reference}
            />
            <CustomInput
              label="Memo"
              value={memo}
              onChangeText={v => dispatch(setJEFormMemo(v))}
              placeholder="Entry description…"
              multiline
            />
          </View>

          {/* ── Lines header ─────────────────── */}
          <View style={styles.linesHeader}>
            <Text style={styles.linesTitle}>Lines</Text>
            {errors.lines && <Text style={styles.linesError}>{errors.lines}</Text>}
          </View>

          {/* ── Line rows ────────────────────── */}
          {lines.map((line, index) => (
            <JournalLineRow
              key={line.id}
              accountId={line.accountId}
              description={line.description}
              debit={line.debit}
              credit={line.credit}
              accountOptions={accountOptions}
              onAccountChange={v => handleUpdateLine(index, 'accountId', v)}
              onDescriptionChange={v => handleUpdateLine(index, 'description', v)}
              onDebitChange={v => handleUpdateLine(index, 'debit', v)}
              onCreditChange={v => handleUpdateLine(index, 'credit', v)}
              onDelete={() => dispatch(removeLine(index))}
              canDelete={lines.length > 2}
              accountError={errors[`line_${index}_account`]}
              amountError={errors[`line_${index}_amount`] || errors[`line_${index}_both`]}
            />
          ))}

          {/* ── Add line ─────────────────────── */}
          <TouchableOpacity style={styles.addLineBtn} onPress={() => dispatch(addLine())}>
            <Text style={styles.addLineBtnText}>+ Add Line</Text>
          </TouchableOpacity>

          {/* ── Totals ───────────────────────── */}
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Debits</Text>
              <Text style={[styles.totalsValue, { color: colors.success }]}>
                {formatCurrency(totalDebit)}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Credits</Text>
              <Text style={[styles.totalsValue, { color: colors.danger }]}>
                {formatCurrency(totalCredit)}
              </Text>
            </View>
            <View style={[styles.balanceRow, isBalanced ? styles.balancedBg : styles.unbalancedBg]}>
              <Text style={isBalanced ? styles.balancedText : styles.unbalancedText}>
                {isBalanced ? '✓ Balanced' : `✕ Unbalanced (diff: ${formatCurrency(diff)})`}
              </Text>
            </View>
            {errors.balance && <Text style={styles.balanceError}>{errors.balance}</Text>}
          </View>

          {/* ── Action buttons ───────────────── */}
          <View style={styles.actions}>
            <CustomButton
              title="Save as Draft"
              onPress={handleSaveDraft}
              variant="secondary"
              size="lg"
              fullWidth
              isLoading={isSaving}
            />
            <View style={styles.actionSpacer} />
            <CustomButton
              title="Post Entry"
              onPress={handlePost}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSaving}
              disabled={!isBalanced}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.sm, padding: spacing.xs },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },

  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },

  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },

  linesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  linesError: {
    fontSize: 12,
    color: colors.danger,
    fontFamily: typography.fontFamily,
  },

  addLineBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  addLineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
  },

  totalsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  totalsValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  balanceRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  balancedBg: { backgroundColor: colors.success + '14' },
  unbalancedBg: { backgroundColor: colors.danger + '14' },
  balancedText: { fontSize: 14, fontWeight: '700', color: colors.success },
  unbalancedText: { fontSize: 14, fontWeight: '700', color: colors.danger },
  balanceError: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },

  actions: {
    marginTop: spacing.sm,
  },
  actionSpacer: { height: spacing.sm },
});

export default JEFormScreen;
