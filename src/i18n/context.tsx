import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import {
  formatDateTime,
  formatNumber,
  resolveText,
  translate,
  type LocaleCode,
  type LocalizedText,
  type MessageValue,
} from "./core";

interface I18nContextValue {
  locale: LocaleCode;
  t: (key: string, values?: Record<string, MessageValue>) => string;
  tText: (value: LocalizedText | null | undefined) => string;
  formatDateTime: (
    value: Date | number,
    options: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (value: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: PropsWithChildren<{ locale: LocaleCode }>) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: (key, values) => translate(locale, key, values),
      tText: (text) => resolveText(locale, text),
      formatDateTime: (date, options) => formatDateTime(locale, date, options),
      formatNumber: (value) => formatNumber(locale, value),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return context;
}
