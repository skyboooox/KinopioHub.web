import type {
  KinopioAuthConfig,
  KinopioServerProfile,
} from "../kinopio/server-profile";
import { msg, type LocalizedText } from "../../i18n";

const SHARE_QUERY_KEY = "share";
const SHARE_SCHEMA_VERSION = 1;
const SHARED_PROFILE_ID = "shared-url-profile";

export interface ShareStateV1 {
  version: 1;
  servers: string[];
  monitorUrl: string;
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

function encodeBase64Url(value: string): string {
  const utf8Bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of utf8Bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalizedValue.length % 4;
  const paddedValue =
    padding === 0
      ? normalizedValue
      : `${normalizedValue}${"=".repeat(4 - padding)}`;
  const binary = atob(paddedValue);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
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
    monitorUrl: readString(objectValue.monitorUrl).trim(),
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
    monitorUrl: input.appliedProfile.monitorUrl,
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
    encodeBase64Url(JSON.stringify(shareState)),
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

    const decodedPayload = decodeBase64Url(encodedShareState);
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

export function createSharedProfile(shareState: ShareStateV1): KinopioServerProfile {
  return {
    id: SHARED_PROFILE_ID,
    name: "Shared URL",
    servers: [...shareState.servers],
    monitorUrl: shareState.monitorUrl,
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
        profile.monitorUrl === shareState.monitorUrl &&
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
