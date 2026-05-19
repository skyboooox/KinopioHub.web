import { credsAuthenticator, type ConnectionOptions } from "@nats-io/nats-core";
import KinopioHub from "kinopio-hub";
import { msg, type LocalizedText } from "../../i18n";
import type { KinopioServerProfile } from "./server-profile";
import { redactSensitiveConnectionText } from "../error-redactor";

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
  return {
    ...buildKinopioConnectionOptions(profile),
    servers: profile.servers,
    autoConnect: false,
    autoRetry: false,
    serverSelectionMode: profile.serverSelectionMode,
  };
}

export function buildKinopioConnectionOptions(
  profile: KinopioServerProfile,
): ConnectionOptions & Pick<ConnectionOptions, "authenticator" | "pass" | "token" | "user"> {
  const connectionOptions: ConnectionOptions &
    Pick<ConnectionOptions, "authenticator" | "pass" | "token" | "user"> = {
      servers: profile.servers,
      timeout: profile.timeoutMs,
    };

  switch (profile.auth.mode) {
    case "token":
      connectionOptions.token = profile.auth.token;
      break;
    case "user-pass":
      connectionOptions.user = profile.auth.username;
      connectionOptions.pass = profile.auth.password;
      break;
    case "creds":
      connectionOptions.authenticator = createCredsAuthenticator(profile.auth.creds);
      break;
    case "none":
    default:
      break;
  }

  return connectionOptions;
}

export function createKinopioClient(profile: KinopioServerProfile): KinopioHub {
  return new KinopioHub(buildKinopioRuntimeOptions(profile));
}

export function formatKinopioError(error: unknown): LocalizedText {
  if (error instanceof Error && error.message.trim()) {
    return redactSensitiveConnectionText(error.message.trim());
  }

  if (typeof error === "string" && error.trim()) {
    return redactSensitiveConnectionText(error.trim());
  }

  return msg("session.unknownConnectionError");
}
