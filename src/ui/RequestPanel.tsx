import { useState } from "react";
import { useI18n, type LocalizedText } from "../i18n";

interface RequestPanelProps {
  requestSubject: string;
  requestPayloadText: string;
  timeoutText: string;
  subjectError: LocalizedText | null;
  payloadError: LocalizedText | null;
  timeoutError: LocalizedText | null;
  status: "idle" | "sending" | "success" | "error";
  statusLabel: LocalizedText;
  responseText: LocalizedText;
  responseMeta: LocalizedText | null;
  buttonLabel: LocalizedText;
  canSend: boolean;
  onRequestSubjectChange: (value: string) => void;
  onRequestPayloadChange: (value: string) => void;
  onTimeoutTextChange: (value: string) => void;
  onSendRequest: () => void;
  onClearResult: () => void;
}

export function RequestPanel({
  requestSubject,
  requestPayloadText,
  timeoutText,
  subjectError,
  payloadError,
  timeoutError,
  status,
  statusLabel,
  responseText,
  responseMeta,
  buttonLabel,
  canSend,
  onRequestSubjectChange,
  onRequestPayloadChange,
  onTimeoutTextChange,
  onSendRequest,
  onClearResult,
}: RequestPanelProps) {
  const { t, tText } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPayloadFormatted, setIsPayloadFormatted] = useState(false);
  const [rawPayloadBeforeFormat, setRawPayloadBeforeFormat] = useState<string | null>(
    null,
  );
  const responseVariant =
    status === "success" ? "success" : status === "error" ? "error" : "idle";
  const shouldShowResult = status !== "idle";

  function handlePayloadFormatToggle() {
    if (isPayloadFormatted) {
      onRequestPayloadChange(rawPayloadBeforeFormat ?? requestPayloadText);
      setIsPayloadFormatted(false);
      setRawPayloadBeforeFormat(null);
      return;
    }

    try {
      onRequestPayloadChange(JSON.stringify(JSON.parse(requestPayloadText), null, 2));
      setRawPayloadBeforeFormat(requestPayloadText);
      setIsPayloadFormatted(true);
    } catch {
      onRequestPayloadChange(requestPayloadText);
    }
  }

  return (
    <section className="panel panel--request" aria-labelledby="request-panel-title">
      <div className="panel__header panel__header--with-action">
        <p className="eyebrow-label">{t("requestPanel.eyebrow")}</p>
        <h2 id="request-panel-title">{t("requestPanel.title")}</h2>
        <button
          type="button"
          className="request-panel__collapse-toggle"
          aria-controls="request-panel-body"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? t("requestPanel.collapse") : t("requestPanel.expand")}
        </button>
      </div>

      {isExpanded ? (
        <div id="request-panel-body" className="request-panel__body">
          <div className="request-stack">
            <label className="stack-field">
              <span className="eyebrow-label">{t("requestPanel.requestSubject")}</span>
              <input
                type="text"
                value={requestSubject}
                onChange={(event) => onRequestSubjectChange(event.target.value)}
                aria-invalid={subjectError ? "true" : "false"}
                spellCheck={false}
              />
              {subjectError ? (
                <span className="field-error">{tText(subjectError)}</span>
              ) : null}
            </label>

            <label className="stack-field request-stack__payload-field">
              <span className="eyebrow-label">{t("requestPanel.payloadJson")}</span>
              <div className="request-stack__payload-editor">
                <textarea
                  rows={8}
                  value={requestPayloadText}
                  onChange={(event) => {
                    setIsPayloadFormatted(false);
                    setRawPayloadBeforeFormat(null);
                    onRequestPayloadChange(event.target.value);
                  }}
                  aria-invalid={payloadError ? "true" : "false"}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className={`request-stack__format-toggle${
                    isPayloadFormatted ? " request-stack__format-toggle--active" : ""
                  }`}
                  aria-label={t("requestPanel.formatPayload")}
                  aria-pressed={isPayloadFormatted ? "true" : "false"}
                  title={t("requestPanel.formatPayload")}
                  onClick={handlePayloadFormatToggle}
                >
                  {"{}"}
                </button>
              </div>
              {payloadError ? (
                <span className="field-error">{tText(payloadError)}</span>
              ) : null}
            </label>

            <div className="request-stack__action-row">
              <label className="stack-field stack-field--inline request-stack__timeout">
                <span className="eyebrow-label">{t("requestPanel.timeout")}</span>
                <input
                  type="number"
                  value={timeoutText}
                  onChange={(event) => onTimeoutTextChange(event.target.value)}
                  aria-invalid={timeoutError ? "true" : "false"}
                  min={1}
                  step={500}
                />
                {timeoutError ? (
                  <span className="field-error">{tText(timeoutError)}</span>
                ) : null}
              </label>

              <button
                type="button"
                className="send-button request-stack__send"
                onClick={onSendRequest}
                disabled={!canSend}
              >
                {tText(buttonLabel)}
              </button>
            </div>
          </div>

          {shouldShowResult ? (
            <div className={`request-response request-response--${responseVariant}`}>
              <div className="request-response__header">
                <div className="request-response__heading">
                  <p className="eyebrow-label">{t("requestPanel.result")}</p>
                  {responseMeta ? (
                    <p className="request-response__meta">{tText(responseMeta)}</p>
                  ) : null}
                </div>
                <div className="request-response__status-row">
                  <p
                    className={`request-response__status request-response__status--${status}`}
                  >
                    {tText(statusLabel)}
                  </p>
                  <button
                    type="button"
                    className="request-response__clear"
                    onClick={onClearResult}
                  >
                    {t("requestPanel.clearResult")}
                  </button>
                </div>
              </div>
              <pre className="request-response__body">{tText(responseText)}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
