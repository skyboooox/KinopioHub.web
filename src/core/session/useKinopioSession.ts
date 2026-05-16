import type KinopioHub from "kinopio-hub";
import type { KinopioState } from "kinopio-hub";
import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import {
  formatDateTime,
  msg,
  translate,
  type LocaleCode,
  type LocalizedText,
} from "../../i18n";
import { createKinopioClient, formatKinopioError } from "../../lib/kinopio/client";
import type { KinopioServerProfile } from "../../lib/kinopio/server-profile";

export interface KinopioSessionControl {
  revision: number;
  shouldConnect: boolean;
}

export interface KinopioSessionSnapshot {
  status: KinopioState;
  errorMessage: LocalizedText | null;
  lastEventAt: string | null;
  lastEventLabel: LocalizedText;
  hubRef: MutableRefObject<KinopioHub | null>;
}

function createTimestamp(locale: LocaleCode): string {
  return formatDateTime(locale, new Date(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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
      setLastEventAt(createTimestamp(locale));
    };

    void (async () => {
      const previousHub = hubRef.current;
      hubRef.current = null;

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
      if (currentHub) {
        void currentHub.dispose().catch(() => {});
      }
    };
  }, [control.revision, control.shouldConnect, locale, profile]);

  return {
    status,
    errorMessage,
    lastEventAt,
    lastEventLabel,
    hubRef,
  };
}
