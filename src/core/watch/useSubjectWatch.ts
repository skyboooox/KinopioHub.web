import type KinopioHub from "kinopio-hub";
import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { formatDateTime, msg, type LocaleCode, type LocalizedText } from "../../i18n";
import type { WatchSubjectResolution } from "../../lib/nats-subject/watch-subject";

export interface LatestSignalRow {
  subject: string;
  prefix: string;
  receivedAt: string;
  count: number;
  sizeBytes: number;
  payload: string;
  fresh?: boolean;
}

interface SubjectWatcherSnapshot {
  rows: LatestSignalRow[];
  statusLabel: LocalizedText;
}

function createTimestamp(locale: LocaleCode): string {
  return formatDateTime(locale, new Date(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function extractSubject(message: unknown, fallbackSubject: string): string {
  if (
    typeof message === "object" &&
    message !== null &&
    "subject" in message &&
    typeof message.subject === "string"
  ) {
    return message.subject;
  }

  return fallbackSubject;
}

function extractSizeBytes(message: unknown, payload: string): number {
  if (
    typeof message === "object" &&
    message !== null &&
    "data" in message &&
    message.data instanceof Uint8Array
  ) {
    return message.data.byteLength;
  }

  return new TextEncoder().encode(payload).byteLength;
}

function formatPayload(data: unknown): string {
  if (data instanceof Uint8Array) {
    return `[binary ${data.byteLength} bytes]`;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data === undefined) {
    return "undefined";
  }

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function derivePrefix(subject: string): string {
  const tokens = subject.split(".");

  if (tokens.length <= 1) {
    return subject;
  }

  return tokens.slice(0, -1).join(".");
}

export function useSubjectWatch(
  hubRef: MutableRefObject<KinopioHub | null>,
  sessionStatus: "connected" | "connecting" | "disconnected" | "error",
  watchSubject: WatchSubjectResolution,
  locale: LocaleCode,
): SubjectWatcherSnapshot {
  const clearFreshTimersRef = useRef<Record<string, number>>({});
  const [rows, setRows] = useState<LatestSignalRow[]>([]);
  const [statusLabel, setStatusLabel] = useState<LocalizedText>(
    msg("signalDrawer.statusLabel.enter"),
  );

  useEffect(() => {
    const timerHandles = clearFreshTimersRef.current;

    return () => {
      Object.values(timerHandles).forEach((handle) => window.clearTimeout(handle));
      clearFreshTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const timerHandles = clearFreshTimersRef.current;
    Object.values(timerHandles).forEach((handle) => window.clearTimeout(handle));
    clearFreshTimersRef.current = {};
    setRows([]);

    if (watchSubject.mode === "invalid") {
      setStatusLabel(watchSubject.errorMessage ?? msg("signalDrawer.statusLabel.invalid"));
      return;
    }

    if (!watchSubject.subscriptionSubject || !watchSubject.scopeName || !watchSubject.variableName) {
      setStatusLabel(msg("signalDrawer.statusLabel.enterDescendants"));
      return;
    }

    if (sessionStatus !== "connected" || !hubRef.current) {
      setStatusLabel(msg("signalDrawer.statusLabel.connectFirst"));
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const subscriptionSubject = watchSubject.subscriptionSubject;
    const scopeName = watchSubject.scopeName;
    const variableName = watchSubject.variableName;
    const hub = hubRef.current;
    const scope = hub.getScope(scopeName);
    const variable = scope.getVariable(variableName);

    setStatusLabel(msg("signalDrawer.statusLabel.subscribing", {
      subject: subscriptionSubject,
    }));

    void variable
      .sub((data, message) => {
        if (cancelled) {
          return;
        }

        const payload = formatPayload(data);
        const subject = extractSubject(message, subscriptionSubject);
        const nextRow: LatestSignalRow = {
          subject,
          prefix: derivePrefix(subject),
          receivedAt: createTimestamp(locale),
          count: 1,
          sizeBytes: extractSizeBytes(message, payload),
          payload,
          fresh: true,
        };

        setStatusLabel(msg("signalDrawer.statusLabel.watching", {
          subject: subscriptionSubject,
        }));
        setRows((currentRows) => {
          const existingRow = currentRows.find((row) => row.subject === subject);
          const mergedRow = existingRow
            ? {
                ...nextRow,
                count: existingRow.count + 1,
              }
            : nextRow;
          const remainingRows = currentRows.filter((row) => row.subject !== subject);

          return [mergedRow, ...remainingRows];
        });

        if (clearFreshTimersRef.current[subject]) {
          window.clearTimeout(clearFreshTimersRef.current[subject]);
        }

        clearFreshTimersRef.current[subject] = window.setTimeout(() => {
          setRows((currentRows) =>
            currentRows.map((row) =>
              row.subject === subject ? { ...row, fresh: false } : row,
            ),
          );
        }, 1200);
      })
      .then((subscription) => {
        if (cancelled) {
          subscription.unsubscribe();
          scope.dispose();
          return;
        }

        unsubscribe = () => subscription.unsubscribe();
        setStatusLabel(msg("signalDrawer.statusLabel.waiting", {
          subject: subscriptionSubject,
        }));
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : msg("signalDrawer.statusLabel.subscriptionFailed");
        setStatusLabel(message);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      scope.dispose();
    };
  }, [hubRef, locale, sessionStatus, watchSubject]);

  return {
    rows,
    statusLabel,
  };
}
