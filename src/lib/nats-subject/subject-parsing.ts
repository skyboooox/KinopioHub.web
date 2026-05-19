export interface DotSubjectParts {
  scopeName: string;
  variableName: string;
}

export type NatsSubjectTokenFailure =
  | "empty-token"
  | "wildcard-not-allowed"
  | "star-token"
  | "arrow-token"
  | "arrow-not-last";

export function splitSubjectTokens(subject: string): string[] {
  return subject.split(".");
}

export function splitDotSubject(subject: string): DotSubjectParts | null {
  const separatorIndex = subject.indexOf(".");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    scopeName: subject.slice(0, separatorIndex),
    variableName: subject.slice(separatorIndex + 1),
  };
}

export function getSubjectPrefix(subject: string): string {
  const tokens = splitSubjectTokens(subject);
  return tokens.length <= 1 ? subject : tokens.slice(0, -1).join(".");
}

export function containsNatsWildcard(subject: string): boolean {
  return splitSubjectTokens(subject).some(
    (token) => token.includes("*") || token.includes(">"),
  );
}

export function validateNatsSubjectTokens(
  subject: string,
  options: { allowWildcard: boolean },
): NatsSubjectTokenFailure | null {
  const tokens = splitSubjectTokens(subject);

  if (tokens.some((token) => token.length === 0)) {
    return "empty-token";
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const isLastToken = index === tokens.length - 1;
    const containsStar = token.includes("*");
    const containsArrow = token.includes(">");

    if (!containsStar && !containsArrow) {
      continue;
    }

    if (!options.allowWildcard) {
      return "wildcard-not-allowed";
    }

    if (containsStar && token !== "*") {
      return "star-token";
    }

    if (containsArrow && token !== ">") {
      return "arrow-token";
    }

    if (token === ">" && !isLastToken) {
      return "arrow-not-last";
    }
  }

  return null;
}
