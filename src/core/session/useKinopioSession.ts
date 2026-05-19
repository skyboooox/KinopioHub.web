import type KinopioHub from "kinopio-hub";
import type { KinopioState } from "kinopio-hub";
import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import {
  msg,
  translate,
  type LocaleCode,
  type LocalizedText,
} from "../../i18n";
import { createKinopioClient, formatKinopioError } from "../../lib/kinopio/client";
import type { KinopioServerProfile } from "../../lib/kinopio/server-profile";
import { normalizeServerIdentity } from "../../lib/kinopio/server-identity";
import { createClockTimestamp } from "../../lib/time/timestamp";

export interface KinopioSessionControl {
  revision: number;
  shouldConnect: boolean;
}

export interface KinopioSessionSnapshot {
  status: KinopioState;
  errorMessage: LocalizedText | null;
  lastEventAt: string | null;
  lastEventLabel: LocalizedText;
  connectedServer: string | null;
  hubRef: MutableRefObject<KinopioHub | null>;
}

type KinopioHubWithNats = KinopioHub & {
  nats?: {
    getServer?: () => string;
  };
};

function readConnectedServer(hub: KinopioHub | null): string | null {
  try {
    return normalizeServerIdentity((hub as KinopioHubWithNats | null)?.nats?.getServer?.());
  } catch {
    return null;
  }
}

export function useKinopioSession(
  profile: KinopioServerProfile,
  control: KinopioSessionControl,
  locale: LocaleCode,
): KinopioSessionSnapshot {
  const hubRef = useRef<KinopioHub | null>(null);
  const [status, setStatus] = useState<KinopioState>(
    control.shouldConnect ? "connecting" : "disconnected",
  );
  const [errorMessage, setErrorMessage] = useState<LocalizedText | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [lastEventLabel, setLastEventLabel] = useState<LocalizedText>(
    control.shouldConnect
      ? msg("session.opening")
      : msg("session.disconnected"),
  );
  const [connectedServer, setConnectedServer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const updateSnapshot = (
      nextStatus: KinopioState,
      nextLabel: LocalizedText,
      nextErrorMessage: LocalizedText | null,
    ) => {
      if (cancelled) {
        return;
      }

      setStatus(nextStatus);
      setLastEventLabel(nextLabel);
      setErrorMessage(nextErrorMessage);
      setLastEventAt(createClockTimestamp(locale));
      if (nextStatus !== "connected") {
        setConnectedServer(null);
      }
    };

    void (async () => {
      const previousHub = hubRef.current;
      hubRef.current = null;

      // Recreate hub only after tearing down the previous one, so strict-mode re-runs
      // and rapid control changes do not leave duplicate active connections.
      if (previousHub) {
        await previousHub.dispose().catch(() => {});
      }

      if (cancelled) {
        return;
      }

      if (!control.shouldConnect) {
        updateSnapshot(
          "disconnected",
          msg("session.disconnectedByOperator"),
          null,
        );
        return;
      }

      updateSnapshot(
        "connecting",
        msg("session.connectingViaMode", {
          mode: translate(locale, `common.selectionMode.${profile.serverSelectionMode}`),
        }),
        null,
      );

      const hub = createKinopioClient(profile);
      hubRef.current = hub;

      try {
        await hub.connect();

        if (cancelled) {
          await hub.dispose().catch(() => {});
          return;
        }

        setConnectedServer(readConnectedServer(hub));
        updateSnapshot(
          "connected",
          msg("session.connectedUsingMode", {
            mode: translate(locale, `common.selectionMode.${profile.serverSelectionMode}`),
          }),
          null,
        );
      } catch (error) {
        if (cancelled) {
          await hub.dispose().catch(() => {});
          return;
        }

        const formattedError = formatKinopioError(error);
        updateSnapshot("error", formattedError, formattedError);
      }
    })();

    return () => {
      cancelled = true;
      const currentHub = hubRef.current;
      hubRef.current = null;
      // Ensure the active hub is disposed from effect cleanup before it is replaced.
      if (currentHub) {
        void currentHub.dispose().catch(() => {});
      }
    };
  }, [control.revision, control.shouldConnect, locale, profile]);

  useEffect(() => {
    if (status !== "connected") {
      setConnectedServer(null);
      return;
    }

    const syncConnectedServer = () => {
      const nextServer = readConnectedServer(hubRef.current);
      setConnectedServer((current) => (current === nextServer ? current : nextServer));
    };

    syncConnectedServer();
    // Keep connected server display fresh while connection may migrate between cluster servers.
    const timer = window.setInterval(syncConnectedServer, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [control.revision, status]);

  return {
    status,
    errorMessage,
    lastEventAt,
    lastEventLabel,
    connectedServer,
    hubRef,
  };
}
