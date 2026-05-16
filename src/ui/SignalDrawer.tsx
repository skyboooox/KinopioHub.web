import type KinopioHub from "kinopio-hub";
import type { MutableRefObject, ReactNode } from "react";
import { useEffect, useState } from "react";
import { msg, useI18n, type LocalizedText } from "../i18n";
import type { LatestSignalRow } from "../core/watch/useSubjectWatch";

type SignalActionState = {
  writeText: string;
  dirty: boolean;
  displayFormatted: boolean;
  statusText: LocalizedText | null;
  statusKind: "idle" | "success" | "error";
};

type SignalDrawerProps = {
  hubRef: MutableRefObject<KinopioHub | null>;
  sessionStatus: "connected" | "connecting" | "disconnected" | "error";
  errorMessage: LocalizedText | null;
  rows: LatestSignalRow[];
};

type ParsedJsonDisplay =
  | {
      kind: "json";
      value: unknown;
    }
  | {
      kind: "text";
      value: string;
    };

type Base64DecodeResult = {
  text: string;
  json: unknown | null;
};

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

function parseSignalValueText(valueText: string): {
  value: unknown;
  errorMessage: LocalizedText | null;
} {
  const trimmed = valueText.trim();
  const looksLikeJson =
    /^[\[{"]/.test(trimmed) ||
    /^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(trimmed);

  if (!trimmed) {
    return {
      value: "",
      errorMessage: null,
    };
  }

  if (!looksLikeJson) {
    return {
      value: valueText,
      errorMessage: null,
    };
  }

  try {
    return {
      value: JSON.parse(trimmed) as unknown,
      errorMessage: null,
    };
  } catch {
    return {
      value: valueText,
      errorMessage: msg("signalDrawer.editor.invalidJson"),
    };
  }
}

function formatJsonValueText(valueText: string): {
  valueText: string;
  errorMessage: LocalizedText | null;
} {
  const trimmed = valueText.trim();
  if (!trimmed) {
    return {
      valueText,
      errorMessage: msg("signalDrawer.editor.invalidJson"),
    };
  }

  try {
    return {
      valueText: JSON.stringify(JSON.parse(trimmed), null, 2),
      errorMessage: null,
    };
  } catch {
    return {
      valueText,
      errorMessage: msg("signalDrawer.editor.invalidJson"),
    };
  }
}

function parseJsonDisplay(valueText: string): ParsedJsonDisplay {
  try {
    return {
      kind: "json",
      value: JSON.parse(valueText) as unknown,
    };
  } catch {
    return {
      kind: "text",
      value: valueText,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyPrimitive(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (value === null) {
    return "null";
  }

  return String(value);
}

function decodeUtf8(binaryText: string): string {
  const bytes = Uint8Array.from(binaryText, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeBase64Value(value: string): Base64DecodeResult | null {
  const compact = value.trim();
  if (
    compact.length < 16 ||
    compact.length % 4 === 1 ||
    !/^[A-Za-z0-9+/_-]+={0,2}$/.test(compact)
  ) {
    return null;
  }

  try {
    const normalized = compact.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const text = decodeUtf8(atob(padded));
    const printableCharacters = text.match(/[\t\n\r -~\u00a0-\uffff]/g)?.length ?? 0;
    if (!text.trim() || printableCharacters / text.length < 0.9) {
      return null;
    }

    try {
      return {
        text,
        json: JSON.parse(text) as unknown,
      };
    } catch {
      return {
        text,
        json: null,
      };
    }
  } catch {
    return null;
  }
}

function JsonTree({
  value,
  path,
  decodedBase64,
  onToggleBase64,
  decodeLabel,
  rawLabel,
}: {
  value: unknown;
  path: string;
  decodedBase64: Record<string, boolean>;
  onToggleBase64: (path: string) => void;
  decodeLabel: string;
  rawLabel: string;
}): ReactNode {
  if (Array.isArray(value)) {
    return (
      <div className="json-tree json-tree--array">
        <span className="json-tree__bracket">[</span>
        <div className="json-tree__children">
          {value.map((item, index) => (
            <div className="json-tree__row" key={`${path}.${index}`}>
              <span className="json-tree__key">{index}</span>
              <JsonTree
                value={item}
                path={`${path}.${index}`}
                decodedBase64={decodedBase64}
                onToggleBase64={onToggleBase64}
                decodeLabel={decodeLabel}
                rawLabel={rawLabel}
              />
            </div>
          ))}
        </div>
        <span className="json-tree__bracket">]</span>
      </div>
    );
  }

  if (isRecord(value)) {
    return (
      <div className="json-tree json-tree--object">
        <span className="json-tree__bracket">{"{"}</span>
        <div className="json-tree__children">
          {Object.entries(value).map(([key, item]) => (
            <div className="json-tree__row" key={`${path}.${key}`}>
              <span className="json-tree__key">{key}</span>
              <JsonTree
                value={item}
                path={`${path}.${key}`}
                decodedBase64={decodedBase64}
                onToggleBase64={onToggleBase64}
                decodeLabel={decodeLabel}
                rawLabel={rawLabel}
              />
            </div>
          ))}
        </div>
        <span className="json-tree__bracket">{"}"}</span>
      </div>
    );
  }

  if (typeof value === "string") {
    const base64Value = decodeBase64Value(value);
    const isDecoded = Boolean(decodedBase64[path]);

    return (
      <span className="json-tree__value-wrap">
        <span className="json-tree__value json-tree__value--string">
          {isDecoded && base64Value
            ? base64Value.json
              ? JSON.stringify(base64Value.json, null, 2)
              : base64Value.text
            : JSON.stringify(value)}
        </span>
        {base64Value ? (
          <button
            type="button"
            className={`json-tree__base64-toggle${
              isDecoded ? " json-tree__base64-toggle--active" : ""
            }`}
            onClick={() => onToggleBase64(path)}
          >
            {isDecoded ? rawLabel : decodeLabel}
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <span className={`json-tree__value json-tree__value--${typeof value}`}>
      {stringifyPrimitive(value)}
    </span>
  );
}

export function SignalDrawer({
  hubRef,
  sessionStatus,
  errorMessage,
  rows,
}: SignalDrawerProps) {
  const { t, tText, formatNumber } = useI18n();
  const [actions, setActions] = useState<Record<string, SignalActionState>>({});
  const [decodedBase64, setDecodedBase64] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setActions((current) => {
      const next: Record<string, SignalActionState> = {};

      rows.forEach((row) => {
        const currentState = current[row.subject];
        next[row.subject] =
          currentState && currentState.dirty
            ? currentState
            : {
                writeText: row.payload,
                dirty: false,
                displayFormatted: currentState?.displayFormatted ?? false,
                statusText: currentState?.statusText ?? null,
                statusKind: currentState?.statusKind ?? "idle",
              };
      });

      return next;
    });
  }, [rows]);

  function updateActionState(
    subject: string,
    updater: (current: SignalActionState) => SignalActionState,
  ) {
    setActions((current) => {
      const existing = current[subject] ?? {
        writeText: "",
        dirty: false,
        displayFormatted: false,
        statusText: null,
        statusKind: "idle" as const,
      };

      return {
        ...current,
        [subject]: updater(existing),
      };
    });
  }

  async function handlePublish(row: LatestSignalRow) {
    const draft = actions[row.subject]?.writeText ?? row.payload;
    const parsed = parseSignalValueText(draft);
    if (parsed.errorMessage) {
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText: parsed.errorMessage,
        statusKind: "error",
      }));
      return;
    }

    const subjectParts = splitSubject(row.subject);
    if (!subjectParts || sessionStatus !== "connected" || !hubRef.current) {
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText: msg("signalDrawer.editor.connectFirst"),
        statusKind: "error",
      }));
      return;
    }

    const hub = hubRef.current;
    const scope = hub.getScope(subjectParts.scopeName);

    try {
      const variable = scope.getVariable(subjectParts.variableName);
      await variable.pub(parsed.value);
      updateActionState(row.subject, (current) => ({
        ...current,
        dirty: false,
        statusText: msg("signalDrawer.editor.published", {
          subject: row.subject,
        }),
        statusKind: "success",
      }));
    } catch (error) {
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText:
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : msg("signalDrawer.editor.publishFailed"),
        statusKind: "error",
      }));
    } finally {
      scope.dispose();
    }
  }

  function handleConsoleLog(row: LatestSignalRow) {
    const draft = actions[row.subject]?.writeText ?? row.payload;
    const parsed = parseSignalValueText(draft);
    if (parsed.errorMessage) {
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText: parsed.errorMessage,
        statusKind: "error",
      }));
      return;
    }

    console.log("[Kinopio HUB]", row.subject, parsed.value);
    updateActionState(row.subject, (current) => ({
      ...current,
      statusText: msg("signalDrawer.editor.logged", {
        subject: row.subject,
      }),
      statusKind: "success",
    }));
  }

  function handleReset(row: LatestSignalRow) {
    updateActionState(row.subject, () => ({
      writeText: row.payload,
      dirty: false,
      displayFormatted: false,
      statusText: msg("signalDrawer.editor.reset"),
      statusKind: "idle",
    }));
  }

  function handleFormatJsonToggle(row: LatestSignalRow) {
    if (actions[row.subject]?.displayFormatted) {
      updateActionState(row.subject, (current) => ({
        ...current,
        writeText: row.payload,
        dirty: false,
        displayFormatted: false,
        statusText: null,
        statusKind: "idle",
      }));
      return;
    }

    const formatted = formatJsonValueText(row.payload);
    if (formatted.errorMessage) {
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText: formatted.errorMessage,
        statusKind: "error",
      }));
      return;
    }

    updateActionState(row.subject, (current) => ({
      ...current,
      writeText: formatted.valueText,
      dirty: formatted.valueText !== row.payload,
      displayFormatted: true,
      statusText: msg("signalDrawer.editor.formatted"),
      statusKind: "success",
    }));
  }

  function handleBase64Toggle(path: string) {
    setDecodedBase64((current) => ({
      ...current,
      [path]: !current[path],
    }));
  }

  return (
    <section className="panel panel--signal" aria-labelledby="signal-drawer-title">
      <div className="panel__header">
        <p className="eyebrow-label">{t("signalDrawer.eyebrow")}</p>
        <h2 id="signal-drawer-title">{t("signalDrawer.title")}</h2>
      </div>

      {errorMessage ? (
        <div className="panel-note panel-note--error">
          <p className="panel-note__title">{t("signalDrawer.validationError")}</p>
          <p>{tText(errorMessage)}</p>
        </div>
      ) : null}

      <div className="signal-list" role="list" aria-label="Signal preview rows">
        {rows.length === 0 ? (
          <div className="signal-empty">
            <p className="signal-empty__title">{t("signalDrawer.emptyTitle")}</p>
            <p className="signal-empty__body">
              {errorMessage
                ? t("signalDrawer.invalidEmptyBody")
                : t("signalDrawer.emptyBody")}
            </p>
          </div>
        ) : null}
        {rows.map((row) => {
          const actionState = actions[row.subject];
          const displayValue = actionState?.displayFormatted
            ? formatJsonValueText(row.payload).valueText
            : row.payload;
          const parsedDisplay = parseJsonDisplay(displayValue);
          const writeValue = actionState?.writeText ?? row.payload;
          const writeRows = Math.max(1, writeValue.split("\n").length);

          return (
            <article
              key={row.subject}
              className={`signal-row${row.fresh ? " signal-row--fresh" : ""}`}
              role="listitem"
            >
              <div className="signal-row__meta">
                <span className="signal-row__tab">{row.prefix}</span>
                <div className="signal-row__labels">
                  <p className="signal-row__subject">{row.subject}</p>
                  <p className="signal-row__facts">
                    {t("signalDrawer.rowFacts", {
                      time: row.receivedAt,
                      hits: t("common.hits", {
                        count: formatNumber(row.count),
                      }),
                      bytes: t("common.bytes", {
                        count: formatNumber(row.sizeBytes),
                      }),
                    })}
                  </p>
                </div>
              </div>

              <div className="signal-row__value-grid">
                <div className="signal-row__display-card">
                  <div className="signal-row__section-head">
                    <span className="eyebrow-label">{t("signalDrawer.editor.currentValue")}</span>
                    <button
                      type="button"
                      className={`signal-row__format-toggle${
                        actionState?.displayFormatted
                          ? " signal-row__format-toggle--active"
                          : ""
                      }`}
                      aria-label={t("signalDrawer.editor.actions.formatJson")}
                      aria-pressed={actionState?.displayFormatted ? "true" : "false"}
                      title={t("signalDrawer.editor.actions.formatJson")}
                      onClick={() => {
                        handleFormatJsonToggle(row);
                      }}
                    >
                      {"{}"}
                    </button>
                  </div>
                  <div className="signal-row__display-value">
                    {actionState?.displayFormatted && parsedDisplay.kind === "json" ? (
                      <JsonTree
                        value={parsedDisplay.value}
                        path={row.subject}
                        decodedBase64={decodedBase64}
                        onToggleBase64={handleBase64Toggle}
                        decodeLabel={t("signalDrawer.editor.actions.decodeBase64")}
                        rawLabel={t("signalDrawer.editor.actions.rawBase64")}
                      />
                    ) : (
                      <pre className="signal-row__display-raw">{displayValue}</pre>
                    )}
                  </div>
                </div>

                <div className="signal-row__write-card">
                  <label className="signal-row__editor-wrap">
                    <span className="eyebrow-label">{t("signalDrawer.editor.writeValue")}</span>
                    <textarea
                      className="signal-row__editor"
                      rows={writeRows}
                      spellCheck={false}
                      value={writeValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        updateActionState(row.subject, (current) => ({
                          ...current,
                          writeText: nextValue,
                          dirty: nextValue !== row.payload,
                          statusText: null,
                          statusKind: "idle",
                        }));
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="signal-row__actions">
                <button
                  type="button"
                  className="signal-row__action-button signal-row__action-button--primary"
                  onClick={() => {
                    void handlePublish(row);
                  }}
                >
                  {t("signalDrawer.editor.actions.publish")}
                </button>
                <button
                  type="button"
                  className="signal-row__action-button"
                  onClick={() => {
                    handleConsoleLog(row);
                  }}
                >
                  {t("signalDrawer.editor.actions.log")}
                </button>
                <button
                  type="button"
                  className="signal-row__action-button"
                  onClick={() => {
                    handleReset(row);
                  }}
                >
                  {t("signalDrawer.editor.actions.reset")}
                </button>
              </div>
              {actionState?.statusText ? (
                <p
                  className={`signal-row__status signal-row__status--${actionState.statusKind}`}
                >
                  {tText(actionState.statusText)}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
