import type { KinopioState } from "kinopio-hub";
import { useEffect, useState } from "react";
import {
  formatDateTime,
  msg,
  translate,
  type LocaleCode,
  type LocalizedText,
} from "../../i18n";
import {
  fetchNatsMonitoring,
  formatMonitoringError,
  type NatsMonitoringVarzSnapshot,
} from "../../lib/monitoring/nats-monitoring";

type MonitoringStatus = "idle" | "loading" | "ready" | "error";

export interface NatsMonitoringSnapshot {
  status: MonitoringStatus;
  summaryLabel: LocalizedText;
  statusLabel: LocalizedText;
  refreshedAt: string | null;
  errorMessage: LocalizedText | null;
  healthLabel: string | null;
  healthDetail: string | null;
  varz: NatsMonitoringVarzSnapshot | null;
}

function createTimestamp(locale: LocaleCode): string {
  return formatDateTime(locale, new Date(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function useNatsMonitoring(
  monitorUrl: string,
  sessionStatus: KinopioState,
  locale: LocaleCode,
): NatsMonitoringSnapshot {
  const [snapshot, setSnapshot] = useState<NatsMonitoringSnapshot>({
    status: "idle",
    summaryLabel: msg("serverDossier.monitoringSummary.noVarzUrl"),
    statusLabel: msg("serverDossier.monitoringStatusLabel.noUrl"),
    refreshedAt: null,
    errorMessage: null,
    healthLabel: null,
    healthDetail: null,
    varz: null,
  });

  useEffect(() => {
    const normalizedUrl = monitorUrl.trim();

    if (!normalizedUrl) {
      setSnapshot({
        status: "idle",
        summaryLabel: msg("serverDossier.monitoringSummary.noVarzUrl"),
        statusLabel: msg("serverDossier.monitoringStatusLabel.noUrl"),
        refreshedAt: null,
        errorMessage: null,
        healthLabel: null,
        healthDetail: null,
        varz: null,
      });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setSnapshot((current) => ({
      ...current,
      status: "loading",
      summaryLabel: msg("serverDossier.monitoringSummary.loading"),
      statusLabel:
        sessionStatus === "connected"
          ? msg("serverDossier.monitoringStatusLabel.reading", {
              url: normalizedUrl,
            })
          : msg("serverDossier.monitoringStatusLabel.readingWhile", {
              url: normalizedUrl,
              status: translate(locale, `status.${sessionStatus}`),
            }),
      errorMessage: null,
    }));

    void (async () => {
      try {
        const result = await fetchNatsMonitoring(normalizedUrl, controller.signal);

        if (cancelled) {
          return;
        }

        setSnapshot({
          status: "ready",
          summaryLabel: msg("serverDossier.monitoringSummary.ready"),
          statusLabel: msg("serverDossier.monitoringStatusLabel.ready", {
            url: normalizedUrl,
          }),
          refreshedAt: createTimestamp(locale),
          errorMessage: null,
          healthLabel: result.healthLabel,
          healthDetail: result.healthDetail,
          varz: result.varz,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSnapshot({
          status: "error",
          summaryLabel: msg("serverDossier.monitoringSummary.error"),
          statusLabel: formatMonitoringError(error),
          refreshedAt: createTimestamp(locale),
          errorMessage: formatMonitoringError(error),
          healthLabel: null,
          healthDetail: null,
          varz: null,
        });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [locale, monitorUrl, sessionStatus]);

  return snapshot;
}
