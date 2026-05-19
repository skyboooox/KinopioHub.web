import type KinopioHub from "kinopio-hub";
import type { KinopioState } from "kinopio-hub";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatNumber, msg, resolveText, translate, type LocaleCode, type LocalizedText } from "../../i18n";
import {
  detectReplyErrorMessage,
  formatRequestError,
  formatStructuredValue,
  resolveRequestDraft,
  type RequestDraft,
} from "../../lib/request/request-config";
import { createClockTimestamp } from "../../lib/time/timestamp";

type RequestReplyStatus = "idle" | "sending" | "success" | "error";

interface RequestReplyResultState {
  status: RequestReplyStatus;
  statusLabel: LocalizedText;
  responseText: LocalizedText;
  responseMeta: LocalizedText | null;
  errorMessage: LocalizedText | null;
}

export interface RequestReplySnapshot {
  status: RequestReplyStatus;
  statusLabel: LocalizedText;
  responseText: LocalizedText;
  responseMeta: LocalizedText | null;
  errorMessage: LocalizedText | null;
  subjectError: LocalizedText | null;
  payloadError: LocalizedText | null;
  timeoutError: LocalizedText | null;
  resolvedSubject: string;
  canSend: boolean;
  buttonLabel: LocalizedText;
  sendRequest: () => Promise<void>;
  clearResult: () => void;
}

function createIdleResponse(sessionStatus: KinopioState): RequestReplyResultState {
  if (sessionStatus !== "connected") {
    return {
      status: "idle",
      statusLabel: msg("requestPanel.statusLabel.connectFirst"),
      responseText: msg("requestPanel.responseBody.connectFirst"),
      responseMeta: null,
      errorMessage: null,
    };
  }

  return {
    status: "idle",
    statusLabel: msg("requestPanel.statusLabel.ready"),
    responseText: msg("requestPanel.responseBody.ready"),
    responseMeta: null,
    errorMessage: null,
  };
}

export function useRequestReply(
  hubRef: MutableRefObject<KinopioHub | null>,
  sessionStatus: KinopioState,
  draft: RequestDraft,
  locale: LocaleCode,
): RequestReplySnapshot {
  const requestIdRef = useRef(0);
  const [result, setResult] = useState<RequestReplyResultState>(() =>
    createIdleResponse(sessionStatus),
  );
  const resolution = useMemo(() => resolveRequestDraft(draft), [draft]);

  useEffect(() => {
    setResult((current) =>
      current.status === "idle" ? createIdleResponse(sessionStatus) : current,
    );
  }, [sessionStatus]);

  const canSend =
    sessionStatus === "connected" &&
    resolution.canSend &&
    result.status !== "sending";

  const buttonLabel =
    sessionStatus !== "connected"
      ? msg("requestPanel.buttons.connectFirst")
      : result.status === "sending"
        ? msg("requestPanel.buttons.sending")
        : resolution.subject.errorMessage
          ? msg("requestPanel.buttons.fixSubject")
          : resolution.payload.errorMessage
            ? msg("requestPanel.buttons.fixPayload")
            : resolution.timeout.errorMessage
              ? msg("requestPanel.buttons.fixTimeout")
              : msg("requestPanel.buttons.send");

  const sendRequest = useCallback(async () => {
    const hub = hubRef.current;
    const timeoutMs = resolution.timeout.timeoutMs;

    if (
      !hub ||
      sessionStatus !== "connected" ||
      !resolution.canSend ||
      !resolution.subject.scopeName ||
      !resolution.subject.variableName ||
      timeoutMs === null
    ) {
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    const requestStartedAt = Date.now();
    const requestStartedLabel = createClockTimestamp(locale);

    setResult({
      status: "sending",
      statusLabel: msg("requestPanel.statusLabel.requesting", {
        subject: resolution.subject.normalizedSubject,
      }),
      responseText: msg("requestPanel.statusLabel.awaiting"),
      responseMeta: msg("requestPanel.responseMeta.awaiting", {
        timeout: translate(locale, "common.ms", {
          count: formatNumber(locale, timeoutMs),
        }),
        time: requestStartedLabel,
      }),
      errorMessage: null,
    });

    // request-reply scope is scoped to this call; always dispose in finally, including timeout/failure paths.
    const scope = hub.getScope(resolution.subject.scopeName);

    try {
      const variable = scope.getVariable(resolution.subject.variableName);
      const response = await variable.req(resolution.payload.payload, {
        timeout: timeoutMs,
      });

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const responseText = formatStructuredValue(response);
      const serializedResponse =
        typeof responseText === "string"
          ? responseText
          : resolveText(locale, responseText);
      const responseBytes = new TextEncoder().encode(serializedResponse).byteLength;
      const responseDuration = Date.now() - requestStartedAt;
      const responseError = detectReplyErrorMessage(response);

      setResult({
        status: responseError ? "error" : "success",
        statusLabel: responseError
          ? msg("requestPanel.statusLabel.responderError")
          : msg("requestPanel.statusLabel.replyReceived", {
              subject: resolution.subject.normalizedSubject,
            }),
        responseText,
        responseMeta: msg("requestPanel.responseMeta.received", {
          duration: translate(locale, "common.ms", {
            count: formatNumber(locale, responseDuration),
          }),
          bytes: translate(locale, "common.bytes", {
            count: formatNumber(locale, responseBytes),
          }),
          time: createClockTimestamp(locale),
        }),
        errorMessage: responseError,
      });
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const formattedError = formatRequestError(error);
      const responseDuration = Date.now() - requestStartedAt;

      setResult({
        status: "error",
        statusLabel: formattedError,
        responseText: formattedError,
        responseMeta: msg("requestPanel.responseMeta.error", {
          duration: translate(locale, "common.ms", {
            count: formatNumber(locale, responseDuration),
          }),
          time: createClockTimestamp(locale),
        }),
        errorMessage: formattedError,
      });
    } finally {
      scope.dispose();
    }
  }, [hubRef, locale, resolution, sessionStatus]);

  const clearResult = useCallback(() => {
    requestIdRef.current += 1;
    setResult(createIdleResponse(sessionStatus));
  }, [sessionStatus]);

  return {
    status: result.status,
    statusLabel: result.statusLabel,
    responseText: result.responseText,
    responseMeta: result.responseMeta,
    errorMessage: result.errorMessage,
    subjectError: resolution.subject.errorMessage,
    payloadError: resolution.payload.errorMessage,
    timeoutError: resolution.timeout.errorMessage,
    resolvedSubject: resolution.subject.normalizedSubject,
    canSend,
    buttonLabel,
    sendRequest,
    clearResult,
  };
}
