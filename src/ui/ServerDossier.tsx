import { useEffect } from "react";
import type { KinopioState, ServerSelectionMode } from "kinopio-hub";
import { useI18n, type LocalizedText } from "../i18n";
import {
  AUTH_MODES,
  SERVER_SELECTION_MODES,
  type KinopioAuthMode,
  type KinopioServerProfile,
  type KinopioServerProfileDraft,
  type KinopioServerProfileValidation,
} from "../lib/kinopio/server-profile";

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
  onSelectSavedProfile: (profileId: string) => void;
  onCreateProfile: () => void;
  onDeleteSelectedProfile: () => void;
  onClearLocalSave: () => void;
  onProfileNameChange: (value: string) => void;
  onServersTextChange: (value: string) => void;
  onTimeoutMsTextChange: (value: string) => void;
  onServerSelectionModeChange: (value: ServerSelectionMode) => void;
  onAuthModeChange: (value: KinopioAuthMode) => void;
  onTokenTextChange: (value: string) => void;
  onUsernameTextChange: (value: string) => void;
  onPasswordTextChange: (value: string) => void;
  onCredsTextChange: (value: string) => void;
  onRememberAuthChange: (value: boolean) => void;
  onApplyAndConnect: () => void;
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
  onSelectSavedProfile,
  onCreateProfile,
  onDeleteSelectedProfile,
  onClearLocalSave,
  onProfileNameChange,
  onServersTextChange,
  onTimeoutMsTextChange,
  onServerSelectionModeChange,
  onAuthModeChange,
  onTokenTextChange,
  onUsernameTextChange,
  onPasswordTextChange,
  onCredsTextChange,
  onRememberAuthChange,
  onApplyAndConnect,
}: ServerDossierProps) {
  const { t, tText } = useI18n();

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

  const serverSummary = [
    [t("serverDossier.rows.profile"), appliedProfile.name],
    [t("serverDossier.rows.status"), t(`status.${status}`)],
    [
      t("serverDossier.rows.active"),
      tText(appliedProfile.servers[0] ?? { key: "serverOverview.summary.noServer" }),
    ],
  ];

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
          title={t("serverDossier.close")}
          onClick={onClose}
        >
          X
        </button>

        <section
          id="server-dossier-dialog"
          className="panel panel--cold server-dossier-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="server-dossier-title"
        >
          <div className="panel__header server-dossier-dialog__header">
            <p className="eyebrow-label">{t("serverDossier.eyebrow")}</p>
            <h2 id="server-dossier-title">{t("serverDossier.title")}</h2>
          </div>

          <div className="dossier-summary" aria-label={t("serverDossier.title")}>
            {serverSummary.map(([label, value]) => (
              <div className="dossier-summary__item" key={label}>
                <span className="dossier-summary__label">
                  {label}
                </span>
                <span className="dossier-summary__value">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="panel-note panel-note--status panel-note--compact">
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

          <div className="placeholder-block placeholder-block--dossier">
            <div className="dossier-profile-bar">
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
            </div>

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

            <label className="stack-field stack-field--full">
              <span className="eyebrow-label">{t("serverDossier.fields.serverList")}</span>
              <textarea
                rows={3}
                value={draft.serversText}
                onChange={(event) => onServersTextChange(event.target.value)}
                spellCheck={false}
              />
              {validation.errors.servers ? (
                <span className="field-error">{tText(validation.errors.servers)}</span>
              ) : null}
            </label>

            <div className="dossier-settings-grid">
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
            </div>

            <div className="dossier-segment-grid">
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

            <div className="stack-field">
              <span className="eyebrow-label dossier-auth-heading">
                {t("serverDossier.fields.authMode")}
                <span className="dossier-risk-wrap">
                  <button
                    type="button"
                    className="dossier-risk-icon"
                    aria-describedby="server-dossier-auth-risk"
                    aria-label={`${t("serverDossier.authStorageWarning.title")}: ${t("serverDossier.authStorageWarning.body")}`}
                  >
                    !
                  </button>
                  <span
                    id="server-dossier-auth-risk"
                    className="dossier-risk-tooltip"
                    role="tooltip"
                  >
                    {t("serverDossier.authStorageWarning.body")}
                  </span>
                </span>
              </span>
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
              <label
                className={`toggle-field toggle-field--auth${draft.rememberAuth ? " toggle-field--checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={draft.rememberAuth}
                  onChange={(event) => onRememberAuthChange(event.target.checked)}
                />
                <span className="toggle-field__box" aria-hidden="true" />
                <span className="toggle-field__label">
                  {t("serverDossier.fields.rememberAuth")}
                </span>
              </label>
            </div>
            </div>

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
