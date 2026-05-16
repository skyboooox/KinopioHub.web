import { useEffect } from "react";
import type { KinopioState, ServerSelectionMode } from "kinopio-hub";
import { useI18n, type LocalizedText } from "../i18n";
import {
  AUTH_MODES,
  SERVER_SELECTION_MODES,
  summarizeServers,
  type KinopioAuthMode,
  type KinopioServerProfile,
  type KinopioServerProfileDraft,
  type KinopioServerProfileValidation,
} from "../lib/kinopio/server-profile";
import {
  formatMonitoringBytes,
  formatMonitoringCount,
} from "../lib/monitoring/nats-monitoring";
import type { NatsMonitoringSnapshot } from "../core/monitoring/useNatsMonitoring";

type ServerDossierProps = {
  isOpen: boolean;
  onClose: () => void;
  savedProfiles: KinopioServerProfile[];
  selectedProfileId: string;
  draft: KinopioServerProfileDraft;
  appliedProfile: KinopioServerProfile;
  validation: KinopioServerProfileValidation;
  status: KinopioState;
  statusDetail: LocalizedText;
  statusDetailAt: string | null;
  errorMessage: LocalizedText | null;
  hasPendingChanges: boolean;
  onSelectSavedProfile: (profileId: string) => void;
  onCreateProfile: () => void;
  onDeleteSelectedProfile: () => void;
  onClearLocalSave: () => void;
  onProfileNameChange: (value: string) => void;
  onServersTextChange: (value: string) => void;
  onMonitorUrlTextChange: (value: string) => void;
  onTimeoutMsTextChange: (value: string) => void;
  onServerSelectionModeChange: (value: ServerSelectionMode) => void;
  onAuthModeChange: (value: KinopioAuthMode) => void;
  onTokenTextChange: (value: string) => void;
  onUsernameTextChange: (value: string) => void;
  onPasswordTextChange: (value: string) => void;
  onCredsTextChange: (value: string) => void;
  onRememberAuthChange: (value: boolean) => void;
  onApplyAndConnect: () => void;
  monitoring: NatsMonitoringSnapshot;
};

export function ServerDossier({
  isOpen,
  onClose,
  savedProfiles,
  selectedProfileId,
  draft,
  appliedProfile,
  validation,
  status,
  statusDetail,
  statusDetailAt,
  errorMessage,
  hasPendingChanges,
  onSelectSavedProfile,
  onCreateProfile,
  onDeleteSelectedProfile,
  onClearLocalSave,
  onProfileNameChange,
  onServersTextChange,
  onMonitorUrlTextChange,
  onTimeoutMsTextChange,
  onServerSelectionModeChange,
  onAuthModeChange,
  onTokenTextChange,
  onUsernameTextChange,
  onPasswordTextChange,
  onCredsTextChange,
  onRememberAuthChange,
  onApplyAndConnect,
  monitoring,
}: ServerDossierProps) {
  const { locale, t, tText, formatNumber } = useI18n();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const serverRows = [
    [t("serverDossier.rows.profile"), appliedProfile.name],
    [t("serverDossier.rows.active"), tText(summarizeServers(appliedProfile.servers))],
    [t("serverDossier.rows.monitor"), tText(monitoring.summaryLabel)],
    [
      t("serverDossier.rows.mode"),
      t(`common.selectionMode.${appliedProfile.serverSelectionMode}`),
    ],
    [
      t("serverDossier.rows.timeout"),
      t("common.ms", { count: formatNumber(appliedProfile.timeoutMs) }),
    ],
    [t("serverDossier.rows.status"), t(`status.${status}`)],
  ];

  const monitoringRows = monitoring.varz
    ? [
        [
          t("serverDossier.monitoringRows.serverName"),
          monitoring.varz.serverName || t("common.notAvailable"),
        ],
        [
          t("serverDossier.monitoringRows.serverId"),
          monitoring.varz.serverId || t("common.notAvailable"),
        ],
        [
          t("serverDossier.monitoringRows.version"),
          monitoring.varz.version || t("common.notAvailable"),
        ],
        [
          t("serverDossier.monitoringRows.uptime"),
          monitoring.varz.uptime || t("common.notAvailable"),
        ],
        [
          t("serverDossier.monitoringRows.healthz"),
          monitoring.healthLabel ?? t("common.notAvailable"),
        ],
        [
          t("serverDossier.monitoringRows.connections"),
          formatMonitoringCount(monitoring.varz.connections, locale),
        ],
        [
          t("serverDossier.monitoringRows.subscriptions"),
          formatMonitoringCount(monitoring.varz.subscriptions, locale),
        ],
        [
          t("serverDossier.monitoringRows.inMessages"),
          formatMonitoringCount(monitoring.varz.inMessages, locale),
        ],
        [
          t("serverDossier.monitoringRows.outMessages"),
          formatMonitoringCount(monitoring.varz.outMessages, locale),
        ],
        [
          t("serverDossier.monitoringRows.inBytes"),
          formatMonitoringBytes(monitoring.varz.inBytes, locale),
        ],
        [
          t("serverDossier.monitoringRows.outBytes"),
          formatMonitoringBytes(monitoring.varz.outBytes, locale),
        ],
        [
          t("serverDossier.monitoringRows.slowConsumers"),
          formatMonitoringCount(monitoring.varz.slowConsumers, locale),
        ],
      ]
    : [];

  return (
    <div className="server-dossier-modal" role="presentation" onClick={onClose}>
      <div
        className="server-dossier-shell"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="server-dossier-dialog__close"
          aria-label={t("serverDossier.close")}
          onClick={onClose}
        >
          {t("serverDossier.close")}
        </button>

        <section
          id="server-dossier-dialog"
          className="panel panel--cold server-dossier-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="server-dossier-title"
        >
          <div className="panel__header">
            <p className="eyebrow-label">{t("serverDossier.eyebrow")}</p>
            <h2 id="server-dossier-title">{t("serverDossier.title")}</h2>
          </div>

          <div className="dossier-table" role="table" aria-label={t("serverDossier.title")}>
            {serverRows.map(([label, value]) => (
              <div className="dossier-table__row" role="row" key={label}>
                <span className="dossier-table__label" role="rowheader">
                  {label}
                </span>
                <span className="dossier-table__value" role="cell">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="panel-note panel-note--status">
            <p className="panel-note__title">{t("serverDossier.sessionStatus")}</p>
            <p>{tText(statusDetail)}</p>
            {statusDetailAt ? (
              <span className="panel-note__meta">
                {t("serverDossier.updatedAt", { time: statusDetailAt })}
              </span>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="panel-note panel-note--error">
              <p className="panel-note__title">{t("serverDossier.connectionError")}</p>
              <p>{tText(errorMessage)}</p>
            </div>
          ) : null}

          <div className="panel-note panel-note--risk">
            <p className="panel-note__title">{t("serverDossier.authStorageWarning.title")}</p>
            <p>{t("serverDossier.authStorageWarning.body")}</p>
          </div>

          <div className="placeholder-block">
            <label className="stack-field">
              <span className="eyebrow-label">{t("serverDossier.fields.savedProfile")}</span>
              <select
                value={selectedProfileId}
                onChange={(event) => onSelectSavedProfile(event.target.value)}
              >
                {savedProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="panel-actions">
              <button
                type="button"
                className="panel-actions__secondary"
                onClick={onCreateProfile}
              >
                {t("serverDossier.actions.newProfile")}
              </button>
              <button
                type="button"
                className="panel-actions__secondary"
                onClick={onDeleteSelectedProfile}
                disabled={savedProfiles.length <= 1}
              >
                {t("serverDossier.actions.deleteProfile")}
              </button>
              <button
                type="button"
                className="panel-actions__secondary"
                onClick={onClearLocalSave}
              >
                {t("serverDossier.actions.clearLocalSave")}
              </button>
            </div>

            <label className="stack-field">
              <span className="eyebrow-label">{t("serverDossier.fields.profileName")}</span>
              <input
                type="text"
                value={draft.profileName}
                onChange={(event) => onProfileNameChange(event.target.value)}
                spellCheck={false}
              />
              {validation.errors.profileName ? (
                <span className="field-error">{tText(validation.errors.profileName)}</span>
              ) : null}
            </label>

            <label className="stack-field">
              <span className="eyebrow-label">{t("serverDossier.fields.serverList")}</span>
              <textarea
                rows={4}
                value={draft.serversText}
                onChange={(event) => onServersTextChange(event.target.value)}
                spellCheck={false}
              />
              {validation.errors.servers ? (
                <span className="field-error">{tText(validation.errors.servers)}</span>
              ) : null}
            </label>

            <label className="stack-field">
              <span className="eyebrow-label">{t("serverDossier.fields.monitoringBaseUrl")}</span>
              <input
                type="url"
                value={draft.monitorUrlText}
                onChange={(event) => onMonitorUrlTextChange(event.target.value)}
                placeholder="https://demo.nats.io:8222"
                spellCheck={false}
              />
              {validation.errors.monitorUrl ? (
                <span className="field-error">{tText(validation.errors.monitorUrl)}</span>
              ) : null}
            </label>

            <label className="stack-field">
              <span className="eyebrow-label">{t("serverDossier.fields.selectionMode")}</span>
              <div
                className="segment-group"
                role="group"
                aria-label={t("serverDossier.fields.selectionMode")}
              >
                {SERVER_SELECTION_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`segment-button${mode === draft.serverSelectionMode ? " segment-button--active" : ""}`}
                    onClick={() => onServerSelectionModeChange(mode)}
                  >
                    {t(`common.selectionMode.${mode}`)}
                  </button>
                ))}
              </div>
            </label>

            <label className="stack-field stack-field--inline">
              <span className="eyebrow-label">{t("serverDossier.fields.connectTimeout")}</span>
              <input
                type="number"
                min={1000}
                step={500}
                value={draft.timeoutMsText}
                onChange={(event) => onTimeoutMsTextChange(event.target.value)}
              />
              {validation.errors.timeoutMs ? (
                <span className="field-error">{tText(validation.errors.timeoutMs)}</span>
              ) : null}
            </label>

            <label className="stack-field">
              <span className="eyebrow-label">{t("serverDossier.fields.authMode")}</span>
              <div
                className="segment-group"
                role="group"
                aria-label={t("serverDossier.fields.authMode")}
              >
                {AUTH_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`segment-button${mode === draft.authMode ? " segment-button--active" : ""}`}
                    onClick={() => onAuthModeChange(mode)}
                  >
                    {t(`common.authMode.${mode}`)}
                  </button>
                ))}
              </div>
            </label>

            {draft.authMode === "token" ? (
              <label className="stack-field">
                <span className="eyebrow-label">{t("serverDossier.fields.token")}</span>
                <input
                  type="text"
                  value={draft.tokenText}
                  onChange={(event) => onTokenTextChange(event.target.value)}
                  spellCheck={false}
                />
                {validation.errors.token ? (
                  <span className="field-error">{tText(validation.errors.token)}</span>
                ) : null}
              </label>
            ) : null}

            {draft.authMode === "user-pass" ? (
              <>
                <label className="stack-field">
                  <span className="eyebrow-label">{t("serverDossier.fields.username")}</span>
                  <input
                    type="text"
                    value={draft.usernameText}
                    onChange={(event) => onUsernameTextChange(event.target.value)}
                    spellCheck={false}
                  />
                  {validation.errors.username ? (
                    <span className="field-error">{tText(validation.errors.username)}</span>
                  ) : null}
                </label>

                <label className="stack-field">
                  <span className="eyebrow-label">{t("serverDossier.fields.password")}</span>
                  <input
                    type="password"
                    value={draft.passwordText}
                    onChange={(event) => onPasswordTextChange(event.target.value)}
                    spellCheck={false}
                  />
                  {validation.errors.password ? (
                    <span className="field-error">{tText(validation.errors.password)}</span>
                  ) : null}
                </label>
              </>
            ) : null}

            {draft.authMode === "creds" ? (
              <label className="stack-field">
                <span className="eyebrow-label">{t("serverDossier.fields.credsContent")}</span>
                <textarea
                  rows={8}
                  value={draft.credsText}
                  onChange={(event) => onCredsTextChange(event.target.value)}
                  spellCheck={false}
                />
                {validation.errors.creds ? (
                  <span className="field-error">{tText(validation.errors.creds)}</span>
                ) : null}
              </label>
            ) : null}

            <label className="toggle-field">
              <input
                type="checkbox"
                checked={draft.rememberAuth}
                disabled={draft.authMode === "none"}
                onChange={(event) => onRememberAuthChange(event.target.checked)}
              />
              <span>{t("serverDossier.fields.rememberAuth")}</span>
            </label>

            <div className="status-strip" aria-label="Draft status">
              <span
                className={`status-strip__tag${hasPendingChanges ? " status-strip__tag--active" : ""}`}
              >
                {hasPendingChanges
                  ? t("serverDossier.draftStatus.pendingEdits")
                  : t("serverDossier.draftStatus.profileApplied")}
              </span>
              <span className="status-strip__tag">
                {draft.rememberAuth
                  ? t("serverDossier.draftStatus.authSaved")
                  : t("serverDossier.draftStatus.authNotSaved")}
              </span>
              <span className="status-strip__tag">
                {t("serverDossier.draftStatus.shareNoAuth")}
              </span>
            </div>

            <div
              className={`panel-note${monitoring.status === "error" ? " panel-note--error" : " panel-note--status"}`}
            >
              <p className="panel-note__title">{t("serverDossier.monitoringStatus")}</p>
              <p>{tText(monitoring.statusLabel)}</p>
              {monitoring.refreshedAt ? (
                <span className="panel-note__meta">
                  {t("serverDossier.updatedAt", { time: monitoring.refreshedAt })}
                </span>
              ) : null}
            </div>

            <div className="panel-note panel-note--risk">
              <p className="panel-note__title">{t("serverDossier.monitoringSafety.title")}</p>
              <p>{t("serverDossier.monitoringSafety.body")}</p>
            </div>

            {monitoring.varz ? (
              <div
                className="dossier-table"
                role="table"
                aria-label={t("serverDossier.monitoringStatus")}
              >
                {monitoringRows.map(([label, value]) => (
                  <div className="dossier-table__row" role="row" key={label}>
                    <span className="dossier-table__label" role="rowheader">
                      {label}
                    </span>
                    <span className="dossier-table__value" role="cell">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="panel-actions">
              <button
                type="button"
                className="panel-actions__primary"
                onClick={onApplyAndConnect}
                disabled={!validation.profile}
              >
                {t("serverDossier.actions.saveConnect")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
