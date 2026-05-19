import type {
  KinopioAuthConfig,
  KinopioServerProfile,
} from "../kinopio/server-profile";
import {
  decodeBase64UrlText,
  encodeBase64UrlText,
} from "../text/base64";
import {
  DEFAULT_LOCALE,
  msg,
  translate,
  type LocaleCode,
  type LocalizedText,
} from "../../i18n";

// share payload is serialized into query string; this version is used to reject unknown formats safely.
const SHARE_QUERY_KEY = "share";
const SHARE_SCHEMA_VERSION = 1;
const SHARED_PROFILE_ID = "shared-url-profile";

export interface ShareStateV1 {
  version: 1;
  servers: string[];
  serverSelectionMode: KinopioServerProfile["serverSelectionMode"];
  timeoutMs: number;
  watchSubject: string;
  requestSubject: string;
  requestPayload: string;
  requestTimeoutText: string;
}

export interface ShareStateLoadResult {
  shareState: ShareStateV1 | null;
  errorMessage: LocalizedText | null;
}

function createEmptyAuthConfig(): KinopioAuthConfig {
  return {
    mode: "none",
    token: "",
    username: "",
    password: "",
    creds: "",
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function parseShareState(payload: unknown): ShareStateV1 {
  const objectValue = asObject(payload);
  if (!objectValue) {
    throw msg("errors.shareState.notObject");
  }

  if (objectValue.version !== SHARE_SCHEMA_VERSION) {
    throw msg("errors.shareState.unsupportedVersion", {
      version: String(objectValue.version ?? "unknown"),
    });
  }

  const servers = readStringArray(objectValue.servers);
  if (servers.length === 0) {
    throw msg("errors.shareState.serversEmpty");
  }

  const serverSelectionMode =
    objectValue.serverSelectionMode === "ordered" ||
    objectValue.serverSelectionMode === "random" ||
    objectValue.serverSelectionMode === "latency"
      ? objectValue.serverSelectionMode
      : "latency";
  const timeoutMs =
    typeof objectValue.timeoutMs === "number" &&
    Number.isFinite(objectValue.timeoutMs)
      ? objectValue.timeoutMs
      : 4000;

  return {
    version: SHARE_SCHEMA_VERSION,
    servers,
    serverSelectionMode,
    timeoutMs,
    watchSubject: readString(objectValue.watchSubject),
    requestSubject: readString(objectValue.requestSubject),
    requestPayload: readString(objectValue.requestPayload),
    requestTimeoutText:
      readString(objectValue.requestTimeoutText) || String(timeoutMs),
  };
}

export function createShareState(input: {
  appliedProfile: KinopioServerProfile;
  watchSubject: string;
  requestSubject: string;
  requestPayload: string;
  requestTimeoutText: string;
}): ShareStateV1 {
  return {
    version: SHARE_SCHEMA_VERSION,
    servers: [...input.appliedProfile.servers],
    serverSelectionMode: input.appliedProfile.serverSelectionMode,
    timeoutMs: input.appliedProfile.timeoutMs,
    watchSubject: input.watchSubject,
    requestSubject: input.requestSubject,
    requestPayload: input.requestPayload,
    requestTimeoutText: input.requestTimeoutText,
  };
}

export function buildShareUrl(shareState: ShareStateV1): string {
  const url = new URL(window.location.href);
  url.searchParams.set(
    SHARE_QUERY_KEY,
    encodeBase64UrlText(JSON.stringify(shareState)),
  );
  return url.toString();
}

export function loadShareStateFromLocation(): ShareStateLoadResult {
  if (typeof window === "undefined") {
    return {
      shareState: null,
      errorMessage: null,
    };
  }

  try {
    const url = new URL(window.location.href);
    const encodedShareState = url.searchParams.get(SHARE_QUERY_KEY);

    if (!encodedShareState) {
      return {
        shareState: null,
        errorMessage: null,
      };
    }

    const decodedPayload = decodeBase64UrlText(encodedShareState);
    return {
      shareState: parseShareState(JSON.parse(decodedPayload) as unknown),
      errorMessage: null,
    };
  } catch (error) {
    const message =
      error &&
      typeof error === "object" &&
      "key" in error &&
      typeof (error as { key: unknown }).key === "string"
        ? (error as LocalizedText)
        : error instanceof Error && error.message.trim()
          ? error.message.trim()
          : msg("errors.shareState.unknownDecodeFailure");

    return {
      shareState: null,
      errorMessage: message,
    };
  }
}

// URL share intentionally never rehydrates sensitive auth; it only restores topology and UI state.
export function createSharedProfile(
  shareState: ShareStateV1,
  locale: LocaleCode = DEFAULT_LOCALE,
): KinopioServerProfile {
  return {
    id: SHARED_PROFILE_ID,
    name: translate(locale, "serverDossier.profileNames.shared"),
    servers: [...shareState.servers],
    serverSelectionMode: shareState.serverSelectionMode,
    timeoutMs: shareState.timeoutMs,
    auth: createEmptyAuthConfig(),
    rememberAuth: false,
  };
}

export function matchSavedProfileToShareState(
  profiles: KinopioServerProfile[],
  shareState: ShareStateV1,
): KinopioServerProfile | null {
  return (
    profiles.find((profile) => {
      const hasRememberedAuth =
        profile.rememberAuth &&
        profile.auth.mode !== "none" &&
        (profile.auth.token ||
          profile.auth.username ||
          profile.auth.password ||
          profile.auth.creds);

      return (
        hasRememberedAuth &&
        profile.serverSelectionMode === shareState.serverSelectionMode &&
        profile.timeoutMs === shareState.timeoutMs &&
        profile.servers.length === shareState.servers.length &&
        profile.servers.every((server, index) => server === shareState.servers[index])
      );
    }) ?? null
  );
}

export function getSharedProfileId(): string {
  return SHARED_PROFILE_ID;
}
