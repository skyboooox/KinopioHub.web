import {
  formatNumber,
  getFormattingLocale,
  msg,
  translate,
  type LocaleCode,
  type LocalizedText,
} from "../../i18n";

export interface NatsMonitoringVarzSnapshot {
  serverId: string;
  serverName: string;
  version: string;
  uptime: string;
  connections: number | null;
  subscriptions: number | null;
  inMessages: number | null;
  outMessages: number | null;
  inBytes: number | null;
  outBytes: number | null;
  slowConsumers: number | null;
}

export interface NatsMonitoringFetchResult {
  varz: NatsMonitoringVarzSnapshot;
  healthLabel: string;
  healthDetail: string | null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildMonitoringEndpoint(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl.replace(/\/+$/, "")}/`).toString();
}

function parseHealthPayload(payload: unknown): {
  label: string;
  detail: string | null;
} {
  const objectValue = asObject(payload);
  if (objectValue) {
    const statusValue = readString(objectValue.status).toUpperCase();
    if (statusValue) {
      return {
        label: statusValue,
        detail: null,
      };
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return {
      label: payload.trim().toUpperCase(),
      detail: null,
    };
  }

  return {
    label: "AVAILABLE",
    detail: null,
  };
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw msg(
      "errors.monitoring.httpError",
      {
        status: response.status,
        statusText: response.statusText.trim() || "UNKNOWN",
      },
    );
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw msg("errors.monitoring.invalidJson");
  }
}

async function fetchHealth(
  url: string,
  signal: AbortSignal,
): Promise<{
  label: string;
  detail: string | null;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      },
      signal,
    });

    if (!response.ok) {
      return {
        label: `HTTP ${response.status}`,
        detail: "errors.monitoring.healthOptional",
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json()) as unknown)
      : await response.text();

    return parseHealthPayload(payload);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    return {
      label: "UNAVAILABLE",
      detail: "errors.monitoring.healthUnavailable",
    };
  }
}

export function validateMonitoringUrl(
  rawInput: string,
): {
  normalizedUrl: string;
  errorMessage: LocalizedText | null;
} {
  const trimmedInput = rawInput.trim().replace(/\/+$/, "");

  if (!trimmedInput) {
    return {
      normalizedUrl: "",
      errorMessage: null,
    };
  }

  try {
    const parsedUrl = new URL(trimmedInput);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return {
        normalizedUrl: trimmedInput,
        errorMessage: msg("errors.monitoring.monitorProtocol"),
      };
    }

    return {
      normalizedUrl: trimmedInput,
      errorMessage: null,
    };
  } catch {
    return {
      normalizedUrl: trimmedInput,
      errorMessage: msg("errors.monitoring.monitorInvalid", { url: trimmedInput }),
    };
  }
}

export async function fetchNatsMonitoring(
  monitorUrl: string,
  signal: AbortSignal,
): Promise<NatsMonitoringFetchResult> {
  const normalizedBaseUrl = validateMonitoringUrl(monitorUrl).normalizedUrl;
  const varzUrl = buildMonitoringEndpoint(normalizedBaseUrl, "varz");
  const healthzUrl = buildMonitoringEndpoint(normalizedBaseUrl, "healthz");

  const [varzPayload, healthResult] = await Promise.all([
    fetchJson(varzUrl, signal),
    fetchHealth(healthzUrl, signal),
  ]);

  const varzObject = asObject(varzPayload);
  if (!varzObject) {
    throw msg("errors.monitoring.unexpectedPayload");
  }

  return {
    varz: {
      serverId: readString(varzObject.server_id),
      serverName: readString(varzObject.server_name),
      version: readString(varzObject.version),
      uptime: readString(varzObject.uptime),
      connections: readNumber(varzObject.connections),
      subscriptions: readNumber(varzObject.subscriptions),
      inMessages: readNumber(varzObject.in_msgs),
      outMessages: readNumber(varzObject.out_msgs),
      inBytes: readNumber(varzObject.in_bytes),
      outBytes: readNumber(varzObject.out_bytes),
      slowConsumers: readNumber(varzObject.slow_consumers),
    },
    healthLabel: healthResult.label,
    healthDetail: healthResult.detail,
  };
}

export function formatMonitoringError(error: unknown): LocalizedText {
  if (error instanceof DOMException && error.name === "AbortError") {
    return msg("errors.monitoring.cancelled");
  }

  if (
    error &&
    typeof error === "object" &&
    "key" in error &&
    typeof (error as { key: unknown }).key === "string"
  ) {
    return error as LocalizedText;
  }

  if (error instanceof Error && error.message.trim()) {
    if (error.message.includes("Failed to fetch")) {
      return msg("errors.monitoring.fetchFailed");
    }

    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return msg("errors.monitoring.unknownFailure");
}

export function formatMonitoringCount(
  value: number | null,
  locale: LocaleCode,
): string {
  if (value === null) {
    return translate(locale, "common.notAvailable");
  }

  return formatNumber(locale, value);
}

export function formatMonitoringBytes(
  value: number | null,
  locale: LocaleCode,
): string {
  if (value === null) {
    return translate(locale, "common.notAvailable");
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = size >= 100 || unitIndex === 0 ? 0 : 1;
  const formatter = new Intl.NumberFormat(getFormattingLocale(locale), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${formatter.format(size)} ${units[unitIndex]}`;
}
