const URL_WITH_AUTH_RE = /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^\s/@]+@/g;
const SENSITIVE_QUERY_PARAM_RE =
  /([?&])(token|password|username|user|pass|creds|cred)(=[^&\s#]*)/gi;

export function redactSensitiveConnectionText(value: string): string {
  return value
    .replace(URL_WITH_AUTH_RE, "$1[redacted]@")
    .replace(SENSITIVE_QUERY_PARAM_RE, "$1$2=[redacted]");
}
