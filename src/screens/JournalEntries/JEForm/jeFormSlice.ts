// ═══════════════════════════════════════════════════════
// FinMatrix — JE Form Slice (createAppSlice)
// ═══════════════════════════════════════════════════════
// Co-located with JEFormScreen.tsx
// Owns form-level state: lines, header fields, validation.

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { JEFormLine, JEFormData, JEValidationErrors } from '../../../models/jeModel';
import { createEmptyLine } from '../../../models/jeModel';

export interface JEFormSliceState {
  date: string;
  reference: string;
  memo: string;
  lines: JEFormLine[];
  errors: JEValidationErrors;
  isSaving: boolean;
  editingEntryId: string | null;
}

const initialState: JEFormSliceState = {
  date: new Date().toISOString().slice(0, 10),
  reference: '',
  memo: '',
  lines: [createEmptyLine(), createEmptyLine()],
  errors: {},
  isSaving: false,
  editingEntryId: null,
};

export const jeFormSlice = createAppSlice({
  name: 'jeForm',
  initialState,
  reducers: create => ({
    setJEFormDate: create.reducer((state, action: PayloadAction<string>) => {
      state.date = action.payload;
      if (state.errors.date) delete state.errors.date;
    }),
    setJEFormReference: create.reducer((state, action: PayloadAction<string>) => {
      state.reference = action.payload;
      if (state.errors.reference) delete state.errors.reference;
    }),
    setJEFormMemo: create.reducer((state, action: PayloadAction<string>) => {
      state.memo = action.payload;
    }),
    setJEFormErrors: create.reducer((state, action: PayloadAction<JEValidationErrors>) => {
      state.errors = action.payload;
    }),
    setJEFormSaving: create.reducer((state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    }),

    // ── Line management ─────────────────────────────
    updateLine: create.reducer(
      (state, action: PayloadAction<{ index: number; field: keyof JEFormLine; value: string }>) => {
        const { index, field, value } = action.payload;
        if (state.lines[index]) {
          (state.lines[index] as any)[field] = value;
          // clear line-level errors
          delete state.errors[`line_${index}_account`];
          delete state.errors[`line_${index}_amount`];
          delete state.errors[`line_${index}_both`];
          delete state.errors.balance;
        }
      },
    ),
    addLine: create.reducer(state => {
      state.lines.push(createEmptyLine());
    }),
    removeLine: create.reducer((state, action: PayloadAction<number>) => {
      if (state.lines.length > 2) {
        state.lines.splice(action.payload, 1);
      }
    }),

    // ── Load existing entry for editing ─────────────
    loadEntryForEdit: create.reducer(
      (state, action: PayloadAction<{
        id: string;
        date: string;
        reference: string;
        memo: string;
        lines: JEFormLine[];
      }>) => {
        const { id, date, reference, memo, lines } = action.payload;
        state.editingEntryId = id;
        state.date = date;
        state.reference = reference;
        state.memo = memo;
        state.lines = lines.length >= 2 ? lines : [...lines, ...Array(2 - lines.length).fill(null).map(() => createEmptyLine())];
        state.errors = {};
        state.isSaving = false;
      },
    ),

    resetJEForm: create.reducer(state => {
      state.date = new Date().toISOString().slice(0, 10);
      state.reference = '';
      state.memo = '';
      state.lines = [createEmptyLine(), createEmptyLine()];
      state.errors = {};
      state.isSaving = false;
      state.editingEntryId = null;
    }),
  }),

  selectors: {
    selectJEFormDate: state => state.date,
    selectJEFormReference: state => state.reference,
    selectJEFormMemo: state => state.memo,
    selectJEFormLines: state => state.lines,
    selectJEFormErrors: state => state.errors,
    selectJEFormIsSaving: state => state.isSaving,
    selectJEFormEditingId: state => state.editingEntryId,
  },
});

export const {
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
} = jeFormSlice.actions;

export const {
  selectJEFormDate,
  selectJEFormReference,
  selectJEFormMemo,
  selectJEFormLines,
  selectJEFormErrors,
  selectJEFormIsSaving,
  selectJEFormEditingId,
} = jeFormSlice.selectors;
