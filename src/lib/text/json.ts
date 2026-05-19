const JSON_VALUE_RE =
  /^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/;

export type JsonParseResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
    };

export type JsonDisplayValue =
  | {
      kind: "json";
      value: unknown;
    }
  | {
      kind: "text";
      value: string;
    };

export function looksLikeJsonText(valueText: string): boolean {
  const trimmed = valueText.trim();
  return /^[\[{"]/.test(trimmed) || JSON_VALUE_RE.test(trimmed);
}

export function parseJsonText(valueText: string): JsonParseResult {
  try {
    return {
      ok: true,
      value: JSON.parse(valueText) as unknown,
    };
  } catch {
    return {
      ok: false,
    };
  }
}

export function formatJsonText(valueText: string): string | null {
  const trimmed = valueText.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = parseJsonText(trimmed);
  return parsed.ok ? stringifyJsonValue(parsed.value, 2) : null;
}

export function parseJsonDisplay(valueText: string): JsonDisplayValue {
  const parsed = parseJsonText(valueText);
  return parsed.ok
    ? {
        kind: "json",
        value: parsed.value,
      }
    : {
        kind: "text",
        value: valueText,
      };
}

export function stringifyJsonPrimitive(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (value === null) {
    return "null";
  }

  return String(value);
}

export function stringifyJsonValue(value: unknown, space?: number): string {
  try {
    return JSON.stringify(value, null, space) ?? String(value);
  } catch {
    return String(value);
  }
}
