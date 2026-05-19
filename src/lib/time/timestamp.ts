import { formatDateTime, type LocaleCode } from "../../i18n";

export function createClockTimestamp(
  locale: LocaleCode,
  value: Date | number = new Date(),
): string {
  return formatDateTime(locale, value, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
