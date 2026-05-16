import { msg, type LocalizedText } from "../../i18n";

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

const PLACEHOLDER_SUBJECT = "scope.variable.>";

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

function splitSubject(subject: string) {
  const separatorIndex = subject.indexOf(".");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    scopeName: subject.slice(0, separatorIndex),
    variableName: subject.slice(separatorIndex + 1),
  };
}

function validateSubjectTokens(
  subject: string,
  wildcardMode: boolean,
): LocalizedText | null {
  const tokens = subject.split(".");

  if (tokens.some((token) => token.length === 0)) {
    return msg("errors.watch.emptyTokens");
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isLastToken = index === tokens.length - 1;
    const containsStar = token.includes("*");
    const containsArrow = token.includes(">");

    if (!wildcardMode && (containsStar || containsArrow)) {
      return msg("errors.watch.noWildcard");
    }

    if (!containsStar && !containsArrow) {
      continue;
    }

    if (containsStar && token !== "*") {
      return msg("errors.watch.starToken");
    }

    if (containsArrow && token !== ">") {
      return msg("errors.watch.arrowToken");
    }

    if (token === ">" && !isLastToken) {
      return msg("errors.watch.arrowLast");
    }
  }

  return null;
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

  const wildcardMode = trimmedInput.includes("*") || trimmedInput.includes(">");
  const validationError = validateSubjectTokens(trimmedInput, wildcardMode);
  if (validationError) {
    return createInvalidResolution(rawInput, trimmedInput, validationError);
  }

  const normalizedSubject = wildcardMode
    ? trimmedInput
    : `${trimmedInput}.>`;
  const subjectParts = splitSubject(normalizedSubject);

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
