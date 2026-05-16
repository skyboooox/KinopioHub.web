import type { ServerSelectionMode } from "kinopio-hub";
import { msg, type LocalizedText } from "../../i18n";

export type KinopioAuthMode = "none" | "token" | "user-pass" | "creds";

export interface KinopioAuthConfig {
  mode: KinopioAuthMode;
  token: string;
  username: string;
  password: string;
  creds: string;
}

export interface KinopioServerProfile {
  id: string;
  name: string;
  servers: string[];
  monitorUrl: string;
  serverSelectionMode: ServerSelectionMode;
  timeoutMs: number;
  auth: KinopioAuthConfig;
  rememberAuth: boolean;
}

export interface KinopioServerProfileDraft {
  profileId: string;
  profileName: string;
  serversText: string;
  monitorUrlText: string;
  serverSelectionMode: ServerSelectionMode;
  timeoutMsText: string;
  authMode: KinopioAuthMode;
  tokenText: string;
  usernameText: string;
  passwordText: string;
  credsText: string;
  rememberAuth: boolean;
}

export interface KinopioServerProfileValidation {
  profile: KinopioServerProfile | null;
  errors: {
    profileName?: LocalizedText;
    servers?: LocalizedText;
    monitorUrl?: LocalizedText;
    timeoutMs?: LocalizedText;
    token?: LocalizedText;
    username?: LocalizedText;
    password?: LocalizedText;
    creds?: LocalizedText;
  };
}

export const DEFAULT_KINOPIO_SERVERS = [
  "wss://demo.nats.io:8443",
  "wss://demo.nats.io:4443",
];
export const DEFAULT_MONITOR_URL = "https://demo.nats.io:8222";

export const DEFAULT_SERVER_SELECTION_MODE: ServerSelectionMode = "latency";
export const DEFAULT_TIMEOUT_MS = 4000;
export const AUTH_MODES: KinopioAuthMode[] = [
  "none",
  "token",
  "user-pass",
  "creds",
];
export const SERVER_SELECTION_MODES: ServerSelectionMode[] = [
  "ordered",
  "random",
  "latency",
];

function createProfileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `profile-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createEmptyAuthConfig(): KinopioAuthConfig {
  return {
    mode: "none",
    token: "",
    username: "",
    password: "",
    creds: "",
  };
}

export function createDefaultServerProfile(): KinopioServerProfile {
  return {
    id: createProfileId(),
    name: "Demo WSS",
    servers: [...DEFAULT_KINOPIO_SERVERS],
    monitorUrl: DEFAULT_MONITOR_URL,
    serverSelectionMode: DEFAULT_SERVER_SELECTION_MODE,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    auth: createEmptyAuthConfig(),
    rememberAuth: false,
  };
}

export function createServerProfileDraft(
  profile: KinopioServerProfile,
): KinopioServerProfileDraft {
  return {
    profileId: profile.id,
    profileName: profile.name,
    serversText: profile.servers.join("\n"),
    monitorUrlText: profile.monitorUrl,
    serverSelectionMode: profile.serverSelectionMode,
    timeoutMsText: String(profile.timeoutMs),
    authMode: profile.auth.mode,
    tokenText: profile.auth.token,
    usernameText: profile.auth.username,
    passwordText: profile.auth.password,
    credsText: profile.auth.creds,
    rememberAuth: profile.rememberAuth,
  };
}

export function createFreshProfileDraft(): KinopioServerProfileDraft {
  const profile = createDefaultServerProfile();

  return {
    ...createServerProfileDraft(profile),
    profileName: "New Profile",
  };
}

export function validateServerProfileDraft(
  draft: KinopioServerProfileDraft,
): KinopioServerProfileValidation {
  const errors: KinopioServerProfileValidation["errors"] = {};
  const profileName = draft.profileName.trim();

  if (!profileName) {
    errors.profileName = msg("errors.profile.profileNameRequired");
  }

  const parsedServers = Array.from(
    new Set(
      draft.serversText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );

  if (parsedServers.length === 0) {
    errors.servers = msg("errors.profile.serversRequired");
  }

  for (const server of parsedServers) {
    try {
      const parsedUrl = new URL(server);
      if (!["ws:", "wss:"].includes(parsedUrl.protocol)) {
        errors.servers = msg("errors.profile.serversProtocol");
        break;
      }
    } catch {
      errors.servers = msg("errors.profile.serverInvalid", { server });
      break;
    }
  }

  const monitorUrl = draft.monitorUrlText.trim().replace(/\/+$/, "");
  if (monitorUrl) {
    try {
      const parsedUrl = new URL(monitorUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        errors.monitorUrl = msg("errors.profile.monitorProtocol");
      }
    } catch {
      errors.monitorUrl = msg("errors.profile.monitorInvalid", { url: monitorUrl });
    }
  }

  const timeoutMs = Number(draft.timeoutMsText);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
    errors.timeoutMs = msg("errors.profile.timeoutMinimum");
  }

  if (draft.authMode === "token" && !draft.tokenText.trim()) {
    errors.token = msg("errors.profile.tokenRequired");
  }

  if (draft.authMode === "user-pass") {
    if (!draft.usernameText.trim()) {
      errors.username = msg("errors.profile.usernameRequired");
    }

    if (!draft.passwordText.trim()) {
      errors.password = msg("errors.profile.passwordRequired");
    }
  }

  if (draft.authMode === "creds") {
    const creds = draft.credsText.trim();
    if (!creds) {
      errors.creds = msg("errors.profile.credsRequired");
    } else if (
      !creds.includes("BEGIN NATS USER JWT") ||
      !creds.includes("BEGIN USER NKEY SEED")
    ) {
      errors.creds = msg("errors.profile.credsInvalid");
    }
  }

  if (
    errors.profileName ||
    errors.servers ||
    errors.monitorUrl ||
    errors.timeoutMs ||
    errors.token ||
    errors.username ||
    errors.password ||
    errors.creds
  ) {
    return {
      profile: null,
      errors,
    };
  }

  return {
    profile: {
      id: draft.profileId,
      name: profileName,
      servers: parsedServers,
      monitorUrl,
      serverSelectionMode: draft.serverSelectionMode,
      timeoutMs,
      auth: {
        mode: draft.authMode,
        token: draft.tokenText.trim(),
        username: draft.usernameText.trim(),
        password: draft.passwordText,
        creds: draft.credsText.trim(),
      },
      rememberAuth: draft.rememberAuth,
    },
    errors,
  };
}

export function sanitizePersistedProfile(
  profile: KinopioServerProfile,
): KinopioServerProfile {
  if (profile.rememberAuth) {
    return {
      ...profile,
      auth: {
        ...profile.auth,
      },
    };
  }

  return {
    ...profile,
    auth: createEmptyAuthConfig(),
    rememberAuth: false,
  };
}

export function serverProfilesEqual(
  left: KinopioServerProfile,
  right: KinopioServerProfile,
): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.monitorUrl === right.monitorUrl &&
    left.serverSelectionMode === right.serverSelectionMode &&
    left.timeoutMs === right.timeoutMs &&
    left.rememberAuth === right.rememberAuth &&
    left.auth.mode === right.auth.mode &&
    left.auth.token === right.auth.token &&
    left.auth.username === right.auth.username &&
    left.auth.password === right.auth.password &&
    left.auth.creds === right.auth.creds &&
    left.servers.length === right.servers.length &&
    left.servers.every((server, index) => server === right.servers[index])
  );
}

export function summarizeServers(servers: string[]): LocalizedText {
  if (servers.length === 0) {
    return msg("serverOverview.summary.noServer");
  }

  if (servers.length === 1) {
    return servers[0];
  }

  return msg("serverOverview.summary.moreServers", {
    first: servers[0],
    count: servers.length - 1,
  });
}
