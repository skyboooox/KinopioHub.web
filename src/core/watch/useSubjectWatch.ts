import type KinopioHub from "kinopio-hub";
import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { msg, type LocaleCode, type LocalizedText } from "../../i18n";
import { getSubjectPrefix } from "../../lib/nats-subject/subject-parsing";
import type { WatchSubjectResolution } from "../../lib/nats-subject/watch-subject";
import { stringifyJsonValue } from "../../lib/text/json";
import { createClockTimestamp } from "../../lib/time/timestamp";

export interface LatestSignalRow {
  subject: string;
  prefix: string;
  receivedAt: string;
  receivedAtMs: number;
  count: number;
  sizeBytes: number;
  payload: string;
  fresh?: boolean;
}

interface SubjectWatcherSnapshot {
  rows: LatestSignalRow[];
  statusLabel: LocalizedText;
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

  return stringifyJsonValue(data);
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
      // Cancel all stale freshness timers when subject changes or component unmounts.
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
        const receivedAtMs = Date.now();
        const subject = extractSubject(message, subscriptionSubject);
        const nextRow: LatestSignalRow = {
          subject,
          prefix: getSubjectPrefix(subject),
          receivedAt: createClockTimestamp(locale),
          receivedAtMs,
          count: 1,
          sizeBytes: extractSizeBytes(message, payload),
          payload,
          fresh: true,
        };

        setStatusLabel(msg("signalDrawer.statusLabel.watching", {
          subject: subscriptionSubject,
        }));
        setRows((currentRows) => {
          const existingIndex = currentRows.findIndex((row) => row.subject === subject);

          if (existingIndex === -1) {
            return [...currentRows, nextRow];
          }

          return currentRows.map((row, index) =>
            index === existingIndex
              ? {
                  ...nextRow,
                  count: row.count + 1,
                }
              : row,
          );
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
          // If cleanup already ran while waiting for sub creation, immediately release both handles.
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

        scope.dispose();
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : msg("signalDrawer.statusLabel.subscriptionFailed");
        setStatusLabel(message);
      });

    return () => {
      cancelled = true;
      // Scope/handler must be disposed in one path to avoid subscription leaks in strict-mode.
      unsubscribe?.();
      scope.dispose();
    };
  }, [hubRef, locale, sessionStatus, watchSubject]);

  return {
    rows,
    statusLabel,
  };
}
