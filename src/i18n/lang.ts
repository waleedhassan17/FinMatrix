// ═══════════════════════════════════════════════════════
// FinMatrix — English / Urdu for the launch screens
// ═══════════════════════════════════════════════════════
// The app has no i18n framework; the launch screens (how to start, account
// status, trial banner, activation) need two languages, so this is the
// smallest thing that works: one module-level choice, persisted in
// AsyncStorage, with a hook that re-renders on change. Mirrors the web's
// src/i18n/lang.ts so both clients read the same strings the same way.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'ur';
export interface Bilingual {
  en: string;
  ur: string;
}

const KEY = '@finmatrix/lang';
let current: Lang = 'en';
const listeners = new Set<() => void>();

// Read the stored choice once; screens re-render when it arrives.
AsyncStorage.getItem(KEY)
  .then(v => {
    if (v === 'ur' || v === 'en') {
      current = v;
      listeners.forEach(fn => fn());
    }
  })
  .catch((): void => undefined);

export const currentLang = (): Lang => current;

export const setLang = (lang: Lang): void => {
  current = lang;
  listeners.forEach(fn => fn());
  AsyncStorage.setItem(KEY, lang).catch((): void => undefined);
};

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};
const snapshot = (): Lang => current;

/** The reader's language; re-renders when it changes. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export const pick = (text: Bilingual, lang: Lang): string => text[lang] || text.en;

/** Text styles for the current language: Urdu reads right to left. */
export const rtlText = (lang: Lang) =>
  lang === 'ur' ? ({ writingDirection: 'rtl', textAlign: 'right' } as const) : null;
