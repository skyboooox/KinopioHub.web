import {
  isMessageDescriptor,
  msg,
  resolveText,
  translate,
  type LocaleCode,
  type LocalizedText,
} from "../../i18n";

export async function copyTextToClipboard(value: string): Promise<void> {
  if (!navigator.clipboard) {
    throw msg("errors.clipboard.apiUnavailable");
  }

  await navigator.clipboard.writeText(value);
}

export function formatClipboardError(
  error: unknown,
  locale: LocaleCode,
): string {
  if (
    error &&
    typeof error === "object" &&
    isMessageDescriptor(error as LocalizedText)
  ) {
    return resolveText(locale, error as LocalizedText);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return translate(locale, "errors.clipboard.unknownFailure");
}
