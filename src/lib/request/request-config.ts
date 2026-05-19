import { msg, type LocalizedText } from "../../i18n";
import {
  splitDotSubject,
  validateNatsSubjectTokens,
} from "../nats-subject/subject-parsing";
import { redactSensitiveConnectionText } from "../error-redactor";
import { parseJsonText, stringifyJsonValue } from "../text/json";

export interface RequestSubjectResolution {
  rawInput: string;
  normalizedSubject: string;
  scopeName: string | null;
  variableName: string | null;
  errorMessage: LocalizedText | null;
}

export interface RequestPayloadResolution {
  payload: unknown;
  hasPayload: boolean;
  errorMessage: LocalizedText | null;
}

export interface RequestTimeoutResolution {
  rawInput: string;
  timeoutMs: number | null;
  errorMessage: LocalizedText | null;
}

export interface RequestDraft {
  subjectInput: string;
  payloadText: string;
  timeoutText: string;
}

export interface RequestDraftResolution {
  subject: RequestSubjectResolution;
  payload: RequestPayloadResolution;
  timeout: RequestTimeoutResolution;
  canSend: boolean;
}

function validateExactSubject(subject: string): LocalizedText | null {
  const tokenFailure = validateNatsSubjectTokens(subject, {
    allowWildcard: false,
  });

  if (tokenFailure === "empty-token") {
    return msg("errors.request.subjectEmptyTokens");
  }

  if (tokenFailure) {
    return msg("errors.request.subjectNoWildcard");
  }

  return null;
}

export function resolveRequestSubjectInput(
  rawInput: string,
): RequestSubjectResolution {
  const trimmedInput = rawInput.trim();

  if (!trimmedInput) {
    return {
      rawInput,
      normalizedSubject: "",
      scopeName: null,
      variableName: null,
      errorMessage: msg("errors.request.subjectEmpty"),
    };
  }

  const validationError = validateExactSubject(trimmedInput);
  if (validationError) {
    return {
      rawInput,
      normalizedSubject: trimmedInput,
      scopeName: null,
      variableName: null,
      errorMessage: validationError,
    };
  }

  const subjectParts = splitDotSubject(trimmedInput);

  if (!subjectParts) {
    return {
      rawInput,
      normalizedSubject: trimmedInput,
      scopeName: null,
      variableName: null,
      errorMessage: msg("errors.request.subjectNeedDot"),
    };
  }

  return {
    rawInput,
    normalizedSubject: trimmedInput,
    scopeName: subjectParts.scopeName,
    variableName: subjectParts.variableName,
    errorMessage: null,
  };
}

export function resolveRequestPayloadText(payloadText: string): RequestPayloadResolution {
  const trimmedPayload = payloadText.trim();

  if (!trimmedPayload) {
    return {
      payload: undefined,
      hasPayload: false,
      errorMessage: null,
    };
  }

  const parsedPayload = parseJsonText(trimmedPayload);

  if (parsedPayload.ok) {
    return {
      payload: parsedPayload.value,
      hasPayload: true,
      errorMessage: null,
    };
  }

  return {
    payload: undefined,
    hasPayload: true,
    errorMessage: msg("errors.request.payloadInvalid"),
  };
}

export function resolveRequestTimeoutInput(timeoutText: string): RequestTimeoutResolution {
  const trimmedInput = timeoutText.trim();

  if (!trimmedInput) {
    return {
      rawInput: timeoutText,
      timeoutMs: null,
      errorMessage: msg("errors.request.timeoutEmpty"),
    };
  }

  const parsedTimeout = Number(trimmedInput);

  if (!Number.isInteger(parsedTimeout) || parsedTimeout <= 0) {
    return {
      rawInput: timeoutText,
      timeoutMs: null,
      errorMessage: msg("errors.request.timeoutPositiveInteger"),
    };
  }

  return {
    rawInput: timeoutText,
    timeoutMs: parsedTimeout,
    errorMessage: null,
  };
}

export function resolveRequestDraft(
  draft: RequestDraft,
): RequestDraftResolution {
  const subject = resolveRequestSubjectInput(draft.subjectInput);
  const payload = resolveRequestPayloadText(draft.payloadText);
  const timeout = resolveRequestTimeoutInput(draft.timeoutText);

  return {
    subject,
    payload,
    timeout,
    canSend:
      !subject.errorMessage && !payload.errorMessage && !timeout.errorMessage,
  };
}

export function formatStructuredValue(value: unknown): LocalizedText {
  if (value instanceof Uint8Array) {
    return `Uint8Array(${value.byteLength})`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return stringifyJsonValue(value);
  }

  if (value === undefined) {
    return msg("requestPanel.responseBody.emptyReply");
  }

  try {
    return stringifyJsonValue(value, 2);
  } catch {
    return String(value);
  }
}

export function detectReplyErrorMessage(response: unknown): string | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return null;
  }

  const errorValue = Reflect.get(response, "error");
  if (typeof errorValue === "string" && errorValue.trim()) {
    return errorValue.trim();
  }

  const okValue = Reflect.get(response, "ok");
  const messageValue = Reflect.get(response, "message");
  if (
    okValue === false &&
    typeof messageValue === "string" &&
    messageValue.trim()
  ) {
    return messageValue.trim();
  }

  return null;
}

export function formatRequestError(error: unknown): LocalizedText {
  if (error instanceof Error && error.message.trim()) {
    const lowerMessage = error.message.trim().toLowerCase();

    if (lowerMessage.includes("timeout")) {
      return msg("errors.request.timedOut");
    }

    if (
      lowerMessage.includes("503") ||
      lowerMessage.includes("no responders")
    ) {
      return msg("errors.request.noResponder");
    }

    return redactSensitiveConnectionText(error.message.trim());
  }

  if (typeof error === "string" && error.trim()) {
    return redactSensitiveConnectionText(error.trim());
  }

  return msg("errors.request.unknownFailure");
}
