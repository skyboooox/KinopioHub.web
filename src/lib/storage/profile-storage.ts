import {
  DEFAULT_KINOPIO_SERVERS,
  DEFAULT_MONITOR_URL,
  createDefaultServerProfile,
  sanitizePersistedProfile,
  type KinopioServerProfile,
} from "../kinopio/server-profile";

const STORAGE_KEY = "kinopiohub.web.server-profiles.v1";

interface PersistedProfileState {
  profiles: KinopioServerProfile[];
  selectedProfileId: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function inferMonitorUrl(servers: string[]): string {
  if (
    servers.length === DEFAULT_KINOPIO_SERVERS.length &&
    servers.every((server, index) => server === DEFAULT_KINOPIO_SERVERS[index])
  ) {
    return DEFAULT_MONITOR_URL;
  }

  return "";
}

function parsePersistedProfile(value: unknown): KinopioServerProfile | null {
  if (!isObject(value)) {
    return null;
  }

  const profile = value as Record<string, unknown>;
  const id = typeof profile.id === "string" ? profile.id : "";
  const name = typeof profile.name === "string" ? profile.name : "";
  const servers = Array.isArray(profile.servers)
    ? profile.servers.filter((item): item is string => typeof item === "string")
    : [];
  const monitorUrl =
    typeof profile.monitorUrl === "string"
      ? profile.monitorUrl
      : inferMonitorUrl(servers);
  const serverSelectionMode =
    profile.serverSelectionMode === "ordered" ||
    profile.serverSelectionMode === "random" ||
    profile.serverSelectionMode === "latency"
      ? profile.serverSelectionMode
      : "latency";
  const timeoutMs =
    typeof profile.timeoutMs === "number" && Number.isFinite(profile.timeoutMs)
      ? profile.timeoutMs
      : 4000;
  const rememberAuth = profile.rememberAuth === true;
  const auth = isObject(profile.auth) ? profile.auth : {};

  if (!id || !name || servers.length === 0) {
    return null;
  }

  return {
    id,
    name,
    servers,
    monitorUrl,
    serverSelectionMode,
    timeoutMs,
    rememberAuth,
    auth: {
      mode:
        auth.mode === "none" ||
        auth.mode === "token" ||
        auth.mode === "user-pass" ||
        auth.mode === "creds"
          ? auth.mode
          : "none",
      token: typeof auth.token === "string" ? auth.token : "",
      username: typeof auth.username === "string" ? auth.username : "",
      password: typeof auth.password === "string" ? auth.password : "",
      creds: typeof auth.creds === "string" ? auth.creds : "",
    },
  };
}

export function loadPersistedProfileState(): PersistedProfileState {
  if (typeof window === "undefined" || !window.localStorage) {
    const profile = createDefaultServerProfile();
    return {
      profiles: [profile],
      selectedProfileId: profile.id,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      const profile = createDefaultServerProfile();
      return {
        profiles: [profile],
        selectedProfileId: profile.id,
      };
    }

    const parsedValue = JSON.parse(rawValue);
    if (!isObject(parsedValue) || !Array.isArray(parsedValue.profiles)) {
      throw new Error("Invalid persisted profile state");
    }

    const profiles = parsedValue.profiles
      .map(parsePersistedProfile)
      .filter((profile): profile is KinopioServerProfile => profile !== null);

    if (profiles.length === 0) {
      throw new Error("No valid profiles");
    }

    const selectedProfileId =
      typeof parsedValue.selectedProfileId === "string"
        ? parsedValue.selectedProfileId
        : profiles[0].id;

    return {
      profiles,
      selectedProfileId: profiles.some((profile) => profile.id === selectedProfileId)
        ? selectedProfileId
        : profiles[0].id,
    };
  } catch {
    const profile = createDefaultServerProfile();
    return {
      profiles: [profile],
      selectedProfileId: profile.id,
    };
  }
}

export function persistProfileState(
  profiles: KinopioServerProfile[],
  selectedProfileId: string,
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  const payload: PersistedProfileState = {
    profiles: profiles.map(sanitizePersistedProfile),
    selectedProfileId: profiles.some((profile) => profile.id === selectedProfileId)
      ? selectedProfileId
      : profiles[0]?.id ?? selectedProfileId,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearPersistedProfileState(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function getProfileStorageKey(): string {
  return STORAGE_KEY;
}
