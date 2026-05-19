import { timeDiff } from "skyboxtool";
import type { CSSProperties } from "react";
import { useI18n, type LocalizedText } from "../i18n";
import type { LatestSignalRow } from "../core/watch/useSubjectWatch";
import { formatJsonText, parseJsonDisplay } from "../lib/text/json";
import { JsonTree } from "./JsonTree";

export type SignalActionState = {
  writeText: string;
  dirty: boolean;
  editing: boolean;
  displayFormatted: boolean;
  statusText: LocalizedText | null;
  statusKind: "idle" | "success" | "error";
};

type SignalRowProps = {
  row: LatestSignalRow;
  actionState?: SignalActionState;
  decodedBase64: Record<string, boolean>;
  onToggleBase64: (path: string) => void;
  onCopyCurrentValue: (row: LatestSignalRow, valueToCopy: string) => void;
  onFormatJsonToggle: (row: LatestSignalRow) => void;
  onPublish: (row: LatestSignalRow) => void;
  onLog: (row: LatestSignalRow) => void;
  onReset: (row: LatestSignalRow) => void;
  onUpdateActionState: (
    subject: string,
    updater: (current: SignalActionState) => SignalActionState,
  ) => void;
};

function formatRelativeUpdate(
  timestamp: number,
  translate: (key: string, values?: Record<string, string | number>) => string,
): string {
  const diff = timeDiff(timestamp);
  const [count, unit] = diff.match(/^(\d+)([smhd])/)?.slice(1) ?? [];

  if (!count || !unit) {
    return translate("signalDrawer.relative.compact", { value: diff });
  }

  const key =
    unit === "s"
      ? "signalDrawer.relative.seconds"
      : unit === "m"
        ? "signalDrawer.relative.minutes"
        : unit === "h"
          ? "signalDrawer.relative.hours"
          : "signalDrawer.relative.days";

  return translate(key, { count });
}

export function SignalRow({
  row,
  actionState,
  decodedBase64,
  onToggleBase64,
  onCopyCurrentValue,
  onFormatJsonToggle,
  onPublish,
  onLog,
  onReset,
  onUpdateActionState,
}: SignalRowProps) {
  const { t, tText, formatNumber } = useI18n();
  const displayValue = actionState?.displayFormatted
    ? formatJsonText(row.payload) ?? row.payload
    : row.payload;
  const parsedDisplay = parseJsonDisplay(displayValue);
  const writeValue = actionState?.writeText ?? row.payload;
  const displayHeightStyle = {
    "--signal-row-lines": Math.max(2, displayValue.split("\n").length + 1),
  } as CSSProperties;
  const writeHeightStyle = {
    "--signal-row-lines": Math.max(2, writeValue.split("\n").length + 1),
  } as CSSProperties;
  const isEditing = Boolean(actionState?.editing);
  const hitCount = formatNumber(row.count);
  const byteCount = formatNumber(row.sizeBytes);
  const hitUnit = t("common.hits", { count: "" }).trim();
  const byteUnit = t("common.bytes", { count: "" }).trim();
  const factsLabel = t("signalDrawer.rowFacts", {
    time: row.receivedAt,
    hits: t("common.hits", { count: hitCount }),
    bytes: t("common.bytes", { count: byteCount }),
  });
  const relativeUpdatedAt = formatRelativeUpdate(row.receivedAtMs, t);

  return (
    <article
      className={`signal-row${row.fresh ? " signal-row--fresh" : ""}`}
      role="listitem"
    >
      <div className="signal-row__meta">
        <div className="signal-row__labels">
          <div className="signal-row__subject-line">
            <p className="signal-row__subject">{row.subject}</p>
            <span
              className="signal-row__updated-at"
              key={`updated-${row.receivedAtMs}`}
              title={row.receivedAt}
              aria-label={t("signalDrawer.relative.label", {
                time: relativeUpdatedAt,
              })}
            >
              {relativeUpdatedAt}
            </span>
          </div>
          <p className="signal-row__facts" aria-label={factsLabel}>
            <span
              className="signal-row__fact-number"
              key={`time-${row.receivedAt}-${row.count}`}
            >
              {row.receivedAt}
            </span>
            <span className="signal-row__fact-separator" aria-hidden="true">
              {" / "}
            </span>
            <span
              className="signal-row__fact-number"
              key={`hits-${row.receivedAt}-${row.count}`}
            >
              {hitCount}
            </span>{" "}
            {hitUnit}
            <span className="signal-row__fact-separator" aria-hidden="true">
              {" / "}
            </span>
            <span
              className="signal-row__fact-number"
              key={`bytes-${row.receivedAt}-${row.count}`}
            >
              {byteCount}
            </span>{" "}
            {byteUnit}
          </p>
        </div>
      </div>

      <div className="signal-row__value-grid">
        <div className="signal-row__display-card">
          <div className="signal-row__section-head">
            <span className="eyebrow-label">
              {t("signalDrawer.editor.currentValue")}
            </span>
            <button
              type="button"
              className="signal-row__copy-toggle"
              aria-label={t("signalDrawer.editor.actions.copy")}
              title={t("signalDrawer.editor.actions.copy")}
              onClick={() => onCopyCurrentValue(row, displayValue)}
            >
              {t("signalDrawer.editor.actions.copy")}
            </button>
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
              onClick={() => onFormatJsonToggle(row)}
            >
              {"{}"}
            </button>
          </div>
          <div className="signal-row__display-value" style={displayHeightStyle}>
            {actionState?.displayFormatted && parsedDisplay.kind === "json" ? (
              <JsonTree
                value={parsedDisplay.value}
                path={row.subject}
                decodedBase64={decodedBase64}
                onToggleBase64={onToggleBase64}
                decodeLabel={t("signalDrawer.editor.actions.decodeBase64")}
                rawLabel={t("signalDrawer.editor.actions.rawBase64")}
              />
            ) : (
              <pre className="signal-row__display-raw">{displayValue}</pre>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="signal-row__write-card">
            <label className="signal-row__editor-wrap">
              <span className="eyebrow-label">
                {t("signalDrawer.editor.writeValue")}
              </span>
              <textarea
                className="signal-row__editor"
                rows={Math.max(2, writeValue.split("\n").length + 1)}
                style={writeHeightStyle}
                spellCheck={false}
                value={writeValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onUpdateActionState(row.subject, (current) => ({
                    ...current,
                    writeText: nextValue,
                    dirty: nextValue !== row.payload,
                    editing: true,
                    statusText: null,
                    statusKind: "idle",
                  }));
                }}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="signal-row__actions">
        <button
          type="button"
          className="signal-row__action-button"
          aria-expanded={isEditing}
          onClick={() => {
            onUpdateActionState(row.subject, (current) => ({
              ...current,
              editing: !current.editing,
              writeText:
                !current.editing && current.displayFormatted
                  ? displayValue
                  : current.writeText || row.payload,
              statusText: null,
              statusKind: "idle",
            }));
          }}
        >
          {isEditing
            ? t("signalDrawer.editor.actions.doneEditing")
            : t("signalDrawer.editor.actions.edit")}
        </button>
        {isEditing ? (
          <button
            type="button"
            className="signal-row__action-button signal-row__action-button--primary"
            onClick={() => onPublish(row)}
          >
            {t("signalDrawer.editor.actions.publish")}
          </button>
        ) : null}
        <button
          type="button"
          className="signal-row__action-button"
          onClick={() => onLog(row)}
        >
          {t("signalDrawer.editor.actions.log")}
        </button>
        {isEditing ? (
          <button
            type="button"
            className="signal-row__action-button"
            onClick={() => onReset(row)}
          >
            {t("signalDrawer.editor.actions.reset")}
          </button>
        ) : null}
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
}
