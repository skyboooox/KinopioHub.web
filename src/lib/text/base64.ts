const BASE64_TEXT_PATTERN = /^[A-Za-z0-9+/_-]+={0,2}$/;

function utf8ToBinary(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return binary;
}

function binaryToUtf8(value: string): string {
  const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function padBase64(value: string): string {
  const padding = value.length % 4;

  if (padding === 1) {
    throw new Error("Invalid base64 length");
  }

  return padding === 0 ? value : `${value}${"=".repeat(4 - padding)}`;
}

function isMostlyPrintableText(value: string, minRatio: number): boolean {
  if (!value.trim()) {
    return false;
  }

  const printableCount = value.match(/[\t\n\r -~\u00a0-\uffff]/g)?.length ?? 0;
  return printableCount / value.length >= minRatio;
}

export function encodeBase64UrlText(value: string): string {
  return btoa(utf8ToBinary(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeBase64UrlText(value: string): string {
  const normalizedValue = value.trim().replace(/-/g, "+").replace(/_/g, "/");
  return binaryToUtf8(atob(padBase64(normalizedValue)));
}

export function tryDecodeBase64Text(
  value: string,
  options: {
    minLength?: number;
    requireMostlyPrintable?: boolean;
    minPrintableRatio?: number;
  } = {},
): string | null {
  const compactValue = value.trim();
  const minLength = options.minLength ?? 1;

  if (
    compactValue.length < minLength ||
    compactValue.length % 4 === 1 ||
    !BASE64_TEXT_PATTERN.test(compactValue)
  ) {
    return null;
  }

  try {
    const decodedText = decodeBase64UrlText(compactValue);

    if (
      options.requireMostlyPrintable &&
      !isMostlyPrintableText(decodedText, options.minPrintableRatio ?? 0.9)
    ) {
      return null;
    }

    return decodedText;
  } catch {
    return null;
  }
}
