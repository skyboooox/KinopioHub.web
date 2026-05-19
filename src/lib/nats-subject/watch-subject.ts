import { msg, type LocalizedText } from "../../i18n";
import {
  containsNatsWildcard,
  splitDotSubject,
  validateNatsSubjectTokens,
  type NatsSubjectTokenFailure,
} from "./subject-parsing";

export type WatchSubjectMode =
  | "idle"
  | "all-descendants"
  | "explicit-wildcard"
  | "invalid";

export interface WatchSubjectResolution {
  rawInput: string;
  normalizedSubject: string;
  subscriptionSubject: string | null;
  scopeName: string | null;
  variableName: string | null;
  mode: WatchSubjectMode;
  errorMessage: LocalizedText | null;
}

// Default watch target while input is empty; keeps UI state predictable while still using a valid NATS pattern.
const PLACEHOLDER_SUBJECT = "scope.variable.>";
const WATCH_TOKEN_ERROR_KEY_BY_FAILURE: Record<NatsSubjectTokenFailure, string> = {
  "empty-token": "errors.watch.emptyTokens",
  "wildcard-not-allowed": "errors.watch.noWildcard",
  "star-token": "errors.watch.starToken",
  "arrow-token": "errors.watch.arrowToken",
  "arrow-not-last": "errors.watch.arrowLast",
};

function createInvalidResolution(
  rawInput: string,
  normalizedSubject: string,
  errorMessage: LocalizedText,
): WatchSubjectResolution {
  return {
    rawInput,
    normalizedSubject,
    subscriptionSubject: null,
    scopeName: null,
    variableName: null,
    mode: "invalid",
    errorMessage,
  };
}

function formatWatchTokenFailure(
  failure: NatsSubjectTokenFailure | null,
): LocalizedText | null {
  if (!failure) {
    return null;
  }

  return msg(WATCH_TOKEN_ERROR_KEY_BY_FAILURE[failure]);
}

export function normalizeWatchSubjectInput(
  rawInput: string,
): WatchSubjectResolution {
  const trimmedInput = rawInput.trim().replace(/\.+$/, "");

  if (!trimmedInput) {
    return {
      rawInput,
      normalizedSubject: PLACEHOLDER_SUBJECT,
      subscriptionSubject: null,
      scopeName: null,
      variableName: null,
      mode: "idle",
      errorMessage: null,
    };
  }

  // For non-wildcard input we append `.>` to subscribe to all descendants.
  // If input contains wildcard, we only accept explicit NATS `*`/`>` token usage.
  const wildcardMode = containsNatsWildcard(trimmedInput);
  const validationError = formatWatchTokenFailure(
    validateNatsSubjectTokens(trimmedInput, {
      allowWildcard: wildcardMode,
    }),
  );
  if (validationError) {
    return createInvalidResolution(rawInput, trimmedInput, validationError);
  }

  const normalizedSubject = wildcardMode
    ? trimmedInput
    : `${trimmedInput}.>`;
  const subjectParts = splitDotSubject(normalizedSubject);

  if (!subjectParts) {
    return createInvalidResolution(
      rawInput,
      normalizedSubject,
      msg("errors.watch.needDot"),
    );
  }

  return {
    rawInput,
    normalizedSubject,
    subscriptionSubject: normalizedSubject,
    scopeName: subjectParts.scopeName,
    variableName: subjectParts.variableName,
    mode: wildcardMode ? "explicit-wildcard" : "all-descendants",
    errorMessage: null,
  };
}
