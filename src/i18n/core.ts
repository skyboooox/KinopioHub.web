import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export type LocaleCode = "zh-CN" | "en";
export type ThemeMode = "light" | "dark";
export type MessageValue = string | number;

export interface MessageDescriptor {
  key: string;
  values?: Record<string, MessageValue>;
}

export type LocalizedText = MessageDescriptor | string;

const dictionaries = {
  "zh-CN": zhCN,
  en,
} as const;

const formattingLocaleMap: Record<LocaleCode, string> = {
  "zh-CN": "zh-CN",
  en: "en-GB",
};

export const DEFAULT_LOCALE: LocaleCode = "zh-CN";

function resolvePath(
  source: Record<string, unknown>,
  path: string,
): string | null {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return null;
  }, source);

  return typeof value === "string" ? value : null;
}

function interpolate(
  template: string,
  values?: Record<string, MessageValue>,
): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    const value = values[token];
    return value === undefined ? "" : String(value);
  });
}

export function msg(
  key: string,
  values?: Record<string, MessageValue>,
): MessageDescriptor {
  return {
    key,
    values,
  };
}

export function isMessageDescriptor(
  value: LocalizedText | null | undefined,
): value is MessageDescriptor {
  return Boolean(
    value &&
      typeof value === "object" &&
      "key" in value &&
      typeof value.key === "string",
  );
}

export function translate(
  locale: LocaleCode,
  key: string,
  values?: Record<string, MessageValue>,
): string {
  const dictionary = dictionaries[locale] as Record<string, unknown>;
  const template =
    resolvePath(dictionary, key) ?? resolvePath(dictionaries.en as Record<string, unknown>, key);

  if (!template) {
    return key;
  }

  return interpolate(template, values);
}

export function resolveText(
  locale: LocaleCode,
  value: LocalizedText | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (isMessageDescriptor(value)) {
    return translate(locale, value.key, value.values);
  }

  return value;
}

export function getFormattingLocale(locale: LocaleCode): string {
  return formattingLocaleMap[locale];
}

export function formatDateTime(
  locale: LocaleCode,
  value: Date | number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(getFormattingLocale(locale), options).format(value);
}

export function formatNumber(locale: LocaleCode, value: number): string {
  return new Intl.NumberFormat(getFormattingLocale(locale)).format(value);
}
