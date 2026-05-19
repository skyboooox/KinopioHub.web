import { wsconnect, type NatsConnection } from "@nats-io/nats-core";
import { useEffect, useMemo, useState } from "react";
import { msg, translate, type LocaleCode, type LocalizedText } from "../../i18n";
import {
  buildKinopioConnectionOptions,
  formatKinopioError,
} from "../../lib/kinopio/client";
import type { KinopioServerProfile } from "../../lib/kinopio/server-profile";
import {
  formatServerDisplay,
  normalizeServerIdentity,
} from "../../lib/kinopio/server-identity";
import { createClockTimestamp } from "../../lib/time/timestamp";

export type ServerDiagnosticState =
  | "connected"
  | "probing"
  | "reachable"
  | "failed"
  | "standby";

export interface ServerDiagnosticRow {
  server: string;
  displayServer: string;
  identity: string;
  state: ServerDiagnosticState;
  reason: LocalizedText;
  rttMs?: number;
  checkedAt?: string;
}

interface ProbeResult {
  state: "reachable" | "failed";
  rttMs?: number;
  errorMessage?: LocalizedText;
  checkedAt: string;
}

async function closeProbeConnection(connection: NatsConnection | null) {
  if (!connection) {
    return;
  }

  try {
    await connection.drain();
  } catch {
    await connection.close().catch(() => {});
  }
}

async function probeServer(
  profile: KinopioServerProfile,
  server: string,
  locale: LocaleCode,
): Promise<ProbeResult> {
  // Diagnostics use a short-lived auxiliary connection (`wsconnect`) per server and do not alter the main session hub.
  let connection: NatsConnection | null = null;

  try {
    connection = await wsconnect({
      ...buildKinopioConnectionOptions(profile),
      servers: [server],
      noRandomize: true,
      reconnect: false,
      maxReconnectAttempts: 0,
      waitOnFirstConnect: false,
      timeout: profile.timeoutMs,
    });

    await connection.flush();
    const rtt = await connection.rtt().catch(() => Number.NaN);

    return {
      state: "reachable",
      rttMs: Number.isFinite(rtt) ? Math.max(0, Math.round(rtt)) : undefined,
      checkedAt: createClockTimestamp(locale),
    };
  } catch (error) {
    return {
      state: "failed",
      errorMessage: formatKinopioError(error),
      checkedAt: createClockTimestamp(locale),
    };
  } finally {
    await closeProbeConnection(connection);
  }
}

function createFailureReason(errorMessage: LocalizedText | undefined): LocalizedText {
  if (!errorMessage) {
    return msg("serverOverview.serverReason.failedUnknown");
  }

  if (typeof errorMessage !== "string") {
    return errorMessage;
  }

  const message = errorMessage.trim();
  const lower = message.toLowerCase();

  if (lower.includes("timeout")) {
    return msg("serverOverview.serverReason.failedTimeout", { message });
  }

  if (
    lower.includes("auth") ||
    lower.includes("authorization") ||
    lower.includes("permission")
  ) {
    return msg("serverOverview.serverReason.failedAuth", { message });
  }

  if (
    lower.includes("tls") ||
    lower.includes("ssl") ||
    lower.includes("certificate") ||
    lower.includes("cert")
  ) {
    return msg("serverOverview.serverReason.failedTls", { message });
  }

  return msg("serverOverview.serverReason.failedNetwork", { message });
}

export function useServerDiagnostics(
  profile: KinopioServerProfile,
  sessionStatus: "connected" | "connecting" | "disconnected" | "error",
  connectedServer: string | null,
  locale: LocaleCode,
): ServerDiagnosticRow[] {
  const [probeResults, setProbeResults] = useState<Record<string, ProbeResult>>({});
  const connectedIdentity = normalizeServerIdentity(connectedServer);

  useEffect(() => {
    let cancelled = false;

    setProbeResults({});

    const targets = profile.servers.filter((server) => normalizeServerIdentity(server));

    if (targets.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    for (const server of targets) {
      const identity = normalizeServerIdentity(server);
      if (!identity) {
        continue;
      }

      void probeServer(profile, server, locale).then((result) => {
        if (cancelled) {
          return;
        }

        setProbeResults((current) => ({
          ...current,
          [identity]: result,
        }));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [connectedIdentity, locale, profile]);

  return useMemo(
    () =>
      profile.servers.map((server): ServerDiagnosticRow => {
        const identity = normalizeServerIdentity(server) ?? server;
        const displayServer = formatServerDisplay(server);

        if (connectedIdentity && identity === connectedIdentity) {
          const probeResult = probeResults[identity];

          return {
            server,
            displayServer,
            identity,
            state: "connected",
            reason: msg("serverOverview.serverReason.connected"),
            rttMs: probeResult?.state === "reachable" ? probeResult.rttMs : undefined,
            checkedAt: probeResult?.checkedAt,
          };
        }

        const probeResult = probeResults[identity];
        if (!probeResult) {
          return {
            server,
            displayServer,
            identity,
            state: sessionStatus === "disconnected" ? "standby" : "probing",
            reason:
              sessionStatus === "disconnected"
                ? msg("serverOverview.serverReason.standby")
                : msg("serverOverview.serverReason.probing"),
          };
        }

        if (probeResult.state === "reachable") {
          const activeServer = connectedServer
            ? formatServerDisplay(connectedServer)
            : translate(locale, `status.${sessionStatus}`);

          return {
            server,
            displayServer,
            identity,
            state: "reachable",
            reason:
              probeResult.rttMs === undefined
                ? msg("serverOverview.serverReason.reachableNoRtt", {
                    active: activeServer,
                    mode: translate(locale, `common.selectionMode.${profile.serverSelectionMode}`),
                  })
                : msg("serverOverview.serverReason.reachable", {
                    active: activeServer,
                    mode: translate(locale, `common.selectionMode.${profile.serverSelectionMode}`),
                    rtt: probeResult.rttMs,
                  }),
            rttMs: probeResult.rttMs,
            checkedAt: probeResult.checkedAt,
          };
        }

        return {
          server,
          displayServer,
          identity,
          state: "failed",
          reason: createFailureReason(probeResult.errorMessage),
          checkedAt: probeResult.checkedAt,
        };
      }),
    [
      connectedIdentity,
      connectedServer,
      locale,
      probeResults,
      profile.serverSelectionMode,
      profile.servers,
      sessionStatus,
    ],
  );
}
