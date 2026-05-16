import { credsAuthenticator, type ConnectionOptions } from "@nats-io/nats-core";
import KinopioHub from "kinopio-hub";
import { msg, type LocalizedText } from "../../i18n";
import type { KinopioServerProfile } from "./server-profile";

type KinopioRuntimeOptions = NonNullable<
  ConstructorParameters<typeof KinopioHub>[0]
> &
  Pick<ConnectionOptions, "authenticator" | "pass" | "token" | "user">;

function createCredsAuthenticator(creds: string) {
  const encoder = new TextEncoder();

  return credsAuthenticator(() => encoder.encode(creds));
}

export function buildKinopioRuntimeOptions(
  profile: KinopioServerProfile,
): KinopioRuntimeOptions {
  const runtimeOptions: KinopioRuntimeOptions = {
    autoConnect: false,
    autoRetry: false,
    servers: profile.servers,
    serverSelectionMode: profile.serverSelectionMode,
    timeout: profile.timeoutMs,
  };

  switch (profile.auth.mode) {
    case "token":
      runtimeOptions.token = profile.auth.token;
      break;
    case "user-pass":
      runtimeOptions.user = profile.auth.username;
      runtimeOptions.pass = profile.auth.password;
      break;
    case "creds":
      runtimeOptions.authenticator = createCredsAuthenticator(profile.auth.creds);
      break;
    case "none":
    default:
      break;
  }

  return runtimeOptions;
}

export function createKinopioClient(profile: KinopioServerProfile): KinopioHub {
  return new KinopioHub(buildKinopioRuntimeOptions(profile));
}

export function formatKinopioError(error: unknown): LocalizedText {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return msg("session.unknownConnectionError");
}
