import type KinopioHub from "kinopio-hub";
import type { MutableRefObject } from "react";
import { useEffect, useState } from "react";
import { msg, useI18n, type LocalizedText } from "../i18n";
import {
  copyTextToClipboard,
  formatClipboardError,
} from "../lib/browser/clipboard";
import { splitDotSubject } from "../lib/nats-subject/subject-parsing";
import {
  formatJsonText,
  looksLikeJsonText,
  parseJsonText,
} from "../lib/text/json";
import type { LatestSignalRow } from "../core/watch/useSubjectWatch";
import { SignalRow, type SignalActionState } from "./SignalRow";

type SignalDrawerProps = {
  hubRef: MutableRefObject<KinopioHub | null>;
  sessionStatus: "connected" | "connecting" | "disconnected" | "error";
  errorMessage: LocalizedText | null;
  rows: LatestSignalRow[];
};

function parseSignalValueText(valueText: string): {
  value: unknown;
  errorMessage: LocalizedText | null;
} {
  const trimmed = valueText.trim();

  if (!trimmed) {
    return {
      value: "",
      errorMessage: null,
    };
  }

  if (!looksLikeJsonText(trimmed)) {
    return {
      value: valueText,
      errorMessage: null,
    };
  }

  const parsed = parseJsonText(trimmed);
  if (parsed.ok) {
    return {
      value: parsed.value,
      errorMessage: null,
    };
  }

  return {
    value: valueText,
    errorMessage: msg("signalDrawer.editor.invalidJson"),
  };
}

export function SignalDrawer({
  hubRef,
  sessionStatus,
  errorMessage,
  rows,
}: SignalDrawerProps) {
  const { locale, t, tText } = useI18n();
  const [actions, setActions] = useState<Record<string, SignalActionState>>({});
  const [decodedBase64, setDecodedBase64] = useState<Record<string, boolean>>({});
  const [relativeClock, setRelativeClock] = useState(0);

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
                editing: currentState?.editing ?? false,
                displayFormatted: currentState?.displayFormatted ?? false,
                statusText: currentState?.statusText ?? null,
                statusKind: currentState?.statusKind ?? "idle",
              };
      });

      return next;
    });
  }, [rows]);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRelativeClock((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [rows.length]);

  function updateActionState(
    subject: string,
    updater: (current: SignalActionState) => SignalActionState,
  ) {
    setActions((current) => {
      const existing = current[subject] ?? {
        writeText: "",
        dirty: false,
        editing: false,
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

    const subjectParts = splitDotSubject(row.subject);
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
        editing: false,
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
      editing: false,
      displayFormatted: false,
      statusText: msg("signalDrawer.editor.reset"),
      statusKind: "idle",
    }));
  }

  function handleFormatJsonToggle(row: LatestSignalRow) {
    if (actions[row.subject]?.displayFormatted) {
      updateActionState(row.subject, (current) => ({
        ...current,
        writeText: current.editing ? row.payload : current.writeText,
        dirty: current.editing ? false : current.dirty,
        editing: current.editing,
        displayFormatted: false,
        statusText: null,
        statusKind: "idle",
      }));
      return;
    }

    const formattedValue = formatJsonText(row.payload);
    if (!formattedValue) {
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText: msg("signalDrawer.editor.invalidJson"),
        statusKind: "error",
      }));
      return;
    }

    updateActionState(row.subject, (current) => ({
      ...current,
      writeText: current.editing ? formattedValue : current.writeText,
      dirty: current.editing ? formattedValue !== row.payload : current.dirty,
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

  async function handleCopyCurrentValue(row: LatestSignalRow, valueToCopy: string) {
    try {
      await copyTextToClipboard(valueToCopy);
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText: msg("signalDrawer.editor.copied"),
        statusKind: "success",
      }));
    } catch (error) {
      updateActionState(row.subject, (current) => ({
        ...current,
        statusText: msg("signalDrawer.editor.copyFailed", {
          message: formatClipboardError(error, locale),
        }),
        statusKind: "error",
      }));
    }
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

      <div className="signal-list" role="list" aria-label={t("signalDrawer.rowsLabel")}>
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
        {rows.map((row) => (
          <SignalRow
            key={row.subject}
            row={row}
            actionState={actions[row.subject]}
            decodedBase64={decodedBase64}
            onToggleBase64={handleBase64Toggle}
            onCopyCurrentValue={(targetRow, valueToCopy) => {
              void handleCopyCurrentValue(targetRow, valueToCopy);
            }}
            onFormatJsonToggle={handleFormatJsonToggle}
            onPublish={(targetRow) => {
              void handlePublish(targetRow);
            }}
            onLog={handleConsoleLog}
            onReset={handleReset}
            onUpdateActionState={updateActionState}
          />
        ))}
      </div>
    </section>
  );
}
