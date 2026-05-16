import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import en from './locales/en';
import ar from './locales/ar';
import es from './locales/es';

export const STORAGE_KEY = '@stratlens_language';
export const SUPPORTED_LANGUAGES = ['en', 'ar', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_META: Record<SupportedLanguage, { label: string; nativeLabel: string; flag: string; rtl: boolean }> = {
  en: { label: 'English',  nativeLabel: 'English',  flag: '🇬🇧', rtl: false },
  ar: { label: 'Arabic',   nativeLabel: 'العربية',  flag: '🇦🇪', rtl: true  },
  es: { label: 'Spanish',  nativeLabel: 'Español',  flag: '🇪🇸', rtl: false },
};

export function isRTL(lang: string): boolean {
  return lang === 'ar';
}

export async function getStoredLanguage(): Promise<SupportedLanguage | null> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(val ?? '') ? (val as SupportedLanguage) : null;
  } catch {
    return null;
  }
}

export async function storeLanguage(lang: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang);
}

function detectDeviceLanguage(): SupportedLanguage {
  const code = Localization.getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? (code as SupportedLanguage) : 'en';
}

/** Call once at app boot (before React renders). Returns the language used. */
export async function initI18n(): Promise<SupportedLanguage> {
  const stored = await getStoredLanguage();
  const lang: SupportedLanguage = stored ?? detectDeviceLanguage();

  // Apply RTL at native level so it is ready before the first render
  const needsRTL = isRTL(lang);
  if (I18nManager.isRTL !== needsRTL) {
    I18nManager.allowRTL(needsRTL);
    I18nManager.forceRTL(needsRTL);
  }

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        ar: { translation: ar },
        es: { translation: es },
      },
      lng: lang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  }

  return lang;
}

/**
 * Switch language at runtime.
 * Text changes immediately. RTL layout changes require an app reload —
 * call `reloadApp()` if switching to/from Arabic.
 */
export async function changeLanguage(lang: SupportedLanguage): Promise<boolean> {
  await storeLanguage(lang);
  await i18n.changeLanguage(lang);
  const rtlChange = isRTL(lang) !== I18nManager.isRTL;
  if (rtlChange) {
    I18nManager.allowRTL(isRTL(lang));
    I18nManager.forceRTL(isRTL(lang));
  }
  return rtlChange; // true = caller should prompt for reload
}

export default i18n;
