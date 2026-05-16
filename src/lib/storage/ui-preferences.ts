import { DEFAULT_LOCALE, type LocaleCode, type ThemeMode } from "../../i18n";

const THEME_STORAGE_KEY = "kinopiohub.theme";
const LOCALE_STORAGE_KEY = "kinopiohub.locale";
const SUBJECT_INPUT_STORAGE_KEY = "kinopiohub.subjectInput";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isLocaleCode(value: unknown): value is LocaleCode {
  return value === "zh-CN" || value === "en";
}

export function loadThemePreference(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeMode(storedTheme)) {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function persistThemePreference(theme: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyThemePreference(theme: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function loadLocalePreference(): LocaleCode {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocaleCode(storedLocale) ? storedLocale : DEFAULT_LOCALE;
}

export function persistLocalePreference(locale: LocaleCode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function applyLocalePreference(locale: LocaleCode): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
}

export function loadSubjectInputPreference(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSubject = window.localStorage.getItem(SUBJECT_INPUT_STORAGE_KEY);
  return storedSubject && storedSubject.trim() ? storedSubject : null;
}

export function persistSubjectInputPreference(subjectInput: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SUBJECT_INPUT_STORAGE_KEY, subjectInput);
}

export function getThemeStorageKey(): string {
  return THEME_STORAGE_KEY;
}

export function getLocaleStorageKey(): string {
  return LOCALE_STORAGE_KEY;
}

export function getSubjectInputStorageKey(): string {
  return SUBJECT_INPUT_STORAGE_KEY;
}
