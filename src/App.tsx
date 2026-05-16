import type { ServerSelectionMode } from "kinopio-hub";
import { useEffect, useMemo, useState } from "react";
import { useNatsMonitoring } from "./core/monitoring/useNatsMonitoring";
import { useRequestReply } from "./core/request/useRequestReply";
import { useKinopioSession } from "./core/session/useKinopioSession";
import { useSubjectWatch } from "./core/watch/useSubjectWatch";
import {
  I18nProvider,
  isMessageDescriptor,
  msg,
  translate,
  useI18n,
  type LocaleCode,
  type LocalizedText,
  type ThemeMode,
} from "./i18n";
import {
  createDefaultServerProfile,
  createServerProfileDraft,
  type KinopioServerProfile,
  validateServerProfileDraft,
} from "./lib/kinopio/server-profile";
import { normalizeWatchSubjectInput } from "./lib/nats-subject/watch-subject";
import {
  buildShareUrl,
  createShareState,
  createSharedProfile,
  loadShareStateFromLocation,
  matchSavedProfileToShareState,
} from "./lib/share/share-state";
import {
  clearPersistedProfileState,
  loadPersistedProfileState,
  persistProfileState,
} from "./lib/storage/profile-storage";
import {
  applyLocalePreference,
  applyThemePreference,
  loadLocalePreference,
  loadSubjectInputPreference,
  loadThemePreference,
  persistLocalePreference,
  persistSubjectInputPreference,
  persistThemePreference,
} from "./lib/storage/ui-preferences";
import { CommandRail } from "./ui/CommandRail";
import { RequestPanel } from "./ui/RequestPanel";
import { ServerDossier } from "./ui/ServerDossier";
import { ServerInfoStrip } from "./ui/ServerInfoStrip";
import { ShareSheet } from "./ui/ShareSheet";
import { SignalDrawer } from "./ui/SignalDrawer";

function upsertProfile(
  profiles: KinopioServerProfile[],
  nextProfile: KinopioServerProfile,
) {
  const existingIndex = profiles.findIndex((profile) => profile.id === nextProfile.id);

  if (existingIndex === -1) {
    return [...profiles, nextProfile];
  }

  return profiles.map((profile) =>
    profile.id === nextProfile.id ? nextProfile : profile,
  );
}

const initialProfileState = loadPersistedProfileState();
const initialThemePreference = loadThemePreference();
const initialLocalePreference = loadLocalePreference();
const initialSubjectInputPreference = loadSubjectInputPreference();
const initialShareState = loadShareStateFromLocation();
const initialSharedProfile = initialShareState.shareState
  ? createSharedProfile(initialShareState.shareState, initialLocalePreference)
  : null;
const initialSelectedProfile =
  initialSharedProfile ??
  initialProfileState.profiles.find(
    (profile) => profile.id === initialProfileState.selectedProfileId,
  ) ??
  initialProfileState.profiles[0];
const initialMatchingSavedProfile = initialShareState.shareState
  ? matchSavedProfileToShareState(
      initialProfileState.profiles,
      initialShareState.shareState,
    )
  : null;

applyThemePreference(initialThemePreference);
applyLocalePreference(initialLocalePreference);

function AppFrame({
  theme,
  locale,
  onThemeChange,
  onLocaleChange,
}: {
  theme: ThemeMode;
  locale: LocaleCode;
  onThemeChange: (theme: ThemeMode) => void;
  onLocaleChange: (locale: LocaleCode) => void;
}) {
  const { t, tText } = useI18n();
  const [subjectInput, setSubjectInput] = useState(
    initialShareState.shareState?.watchSubject ||
      initialSubjectInputPreference ||
      "weather.station.alpha",
  );
  const [requestSubjectInput, setRequestSubjectInput] = useState(
    initialShareState.shareState?.requestSubject ||
      "weather.station.alpha.getSnapshot",
  );
  const [requestPayloadText, setRequestPayloadText] = useState(
    initialShareState.shareState?.requestPayload ||
      '{ "kind": "preview", "includeHistory": false }',
  );
  const [requestTimeoutText, setRequestTimeoutText] = useState(
    initialShareState.shareState?.requestTimeoutText || "3000",
  );
  const [isServerDossierOpen, setIsServerDossierOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [shareCopyStatus, setShareCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [shareCopyStatusMessage, setShareCopyStatusMessage] =
    useState<LocalizedText>(msg("shareSheet.copyHint"));
  const [matchingSavedAuthProfileId, setMatchingSavedAuthProfileId] = useState(
    initialMatchingSavedProfile?.id ?? null,
  );
  const [savedProfiles, setSavedProfiles] = useState(initialProfileState.profiles);
  const [selectedProfileId, setSelectedProfileId] = useState(
    initialSharedProfile?.id ?? initialProfileState.selectedProfileId,
  );
  const [appliedProfile, setAppliedProfile] = useState(initialSelectedProfile);
  const [profileDraft, setProfileDraft] = useState(() =>
    createServerProfileDraft(initialSelectedProfile),
  );
  const [sessionControl, setSessionControl] = useState({
    revision: 0,
    shouldConnect: true,
  });

  useEffect(() => {
    persistProfileState(savedProfiles, selectedProfileId);
  }, [savedProfiles, selectedProfileId]);

  useEffect(() => {
    persistSubjectInputPreference(subjectInput);
  }, [subjectInput]);

  const watchSubject = useMemo(
    () => normalizeWatchSubjectInput(subjectInput),
    [subjectInput],
  );
  const draftValidation = useMemo(
    () => validateServerProfileDraft(profileDraft),
    [profileDraft],
  );
  const session = useKinopioSession(appliedProfile, sessionControl, locale);
  const monitoring = useNatsMonitoring(
    appliedProfile.monitorUrl,
    session.status,
    locale,
  );
  const signalWatch = useSubjectWatch(
    session.hubRef,
    session.status,
    watchSubject,
    locale,
  );
  const requestReply = useRequestReply(
    session.hubRef,
    session.status,
    {
      subjectInput: requestSubjectInput,
      payloadText: requestPayloadText,
      timeoutText: requestTimeoutText,
    },
    locale,
  );
  const activeServerSummary = useMemo<LocalizedText>(() => {
    if (appliedProfile.servers.length === 0) {
      return msg("serverOverview.summary.noServer");
    }

    return appliedProfile.servers[0];
  }, [appliedProfile.servers]);
  const shareLoadAlertMessage = useMemo<LocalizedText | null>(() => {
    if (!initialShareState.errorMessage) {
      return null;
    }

    return msg("errors.shareState.restoreFailed", {
      message: tText(initialShareState.errorMessage),
    });
  }, [tText]);
  const shareUrl = useMemo(
    () =>
      buildShareUrl(
        createShareState({
          appliedProfile,
          watchSubject: subjectInput,
          requestSubject: requestSubjectInput,
          requestPayload: requestPayloadText,
          requestTimeoutText,
        }),
      ),
    [
      appliedProfile,
      requestPayloadText,
      requestSubjectInput,
      requestTimeoutText,
      subjectInput,
    ],
  );

  function handleApplyAndConnect() {
    if (!draftValidation.profile) {
      return;
    }

    const nextProfile = draftValidation.profile;
    setSavedProfiles((current) => upsertProfile(current, nextProfile));
    setSelectedProfileId(nextProfile.id);
    setAppliedProfile(nextProfile);
    setProfileDraft(createServerProfileDraft(nextProfile));
    setSessionControl((current) => ({
      revision: current.revision + 1,
      shouldConnect: true,
    }));
  }

  function handleSelectionModeChange(value: ServerSelectionMode) {
    setProfileDraft((current) => ({
      ...current,
      serverSelectionMode: value,
    }));
  }

  function handleSelectSavedProfile(profileId: string) {
    const nextProfile = savedProfiles.find((profile) => profile.id === profileId);
    if (!nextProfile) {
      return;
    }

    setSelectedProfileId(profileId);
    setAppliedProfile(nextProfile);
    setProfileDraft(createServerProfileDraft(nextProfile));
    setSessionControl((current) => ({
      revision: current.revision + 1,
      shouldConnect: true,
    }));
  }

  function handleCreateProfile() {
    const nextProfileIndex = savedProfiles.length + 1;
    const nextProfile = {
      ...createDefaultServerProfile(),
      name: translate(locale, "serverDossier.profileNames.new", {
        count: nextProfileIndex,
      }),
    };

    setSavedProfiles((current) => [...current, nextProfile]);
    setSelectedProfileId(nextProfile.id);
    setAppliedProfile(nextProfile);
    setProfileDraft(createServerProfileDraft(nextProfile));
    setSessionControl((current) => ({
      revision: current.revision + 1,
      shouldConnect: true,
    }));
  }

  function handleDeleteSelectedProfile() {
    const remainingProfiles = savedProfiles.filter(
      (profile) => profile.id !== selectedProfileId,
    );

    const fallbackProfile =
      remainingProfiles[0] ?? {
        ...createDefaultServerProfile(),
        name: "Demo WSS",
      };
    const nextProfiles =
      remainingProfiles.length > 0 ? remainingProfiles : [fallbackProfile];

    setSavedProfiles(nextProfiles);
    setSelectedProfileId(fallbackProfile.id);
    setAppliedProfile(fallbackProfile);
    setProfileDraft(createServerProfileDraft(fallbackProfile));
    setSessionControl((current) => ({
      revision: current.revision + 1,
      shouldConnect: true,
    }));
  }

  function handleClearLocalSave() {
    clearPersistedProfileState();

    const nextProfile = {
      ...createDefaultServerProfile(),
      name: "Demo WSS",
    };

    setMatchingSavedAuthProfileId(null);
    setSavedProfiles([nextProfile]);
    setSelectedProfileId(nextProfile.id);
    setAppliedProfile(nextProfile);
    setProfileDraft(createServerProfileDraft(nextProfile));
    setSessionControl((current) => ({
      revision: current.revision + 1,
      shouldConnect: true,
    }));
  }

  async function handleCopyShareUrl() {
    try {
      if (!navigator.clipboard) {
        throw msg("errors.clipboard.apiUnavailable");
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareCopyStatus("success");
      setShareCopyStatusMessage(msg("shareSheet.copySuccess"));
    } catch (error) {
      const message =
        error &&
        typeof error === "object" &&
        isMessageDescriptor(error as LocalizedText)
          ? tText(error as LocalizedText)
          : error instanceof Error && error.message.trim()
            ? error.message.trim()
            : typeof error === "string" && error.trim()
              ? error.trim()
              : t("errors.clipboard.unknownFailure");
      setShareCopyStatus("error");
      setShareCopyStatusMessage(
        msg("shareSheet.copyFailed", {
          message,
        }),
      );
    }
  }

  function handleUseMatchingLocalAuth() {
    if (!matchingSavedAuthProfileId) {
      return;
    }

    const matchingProfile = savedProfiles.find(
      (profile) => profile.id === matchingSavedAuthProfileId,
    );
    if (!matchingProfile) {
      return;
    }

    setSelectedProfileId(matchingProfile.id);
    setAppliedProfile(matchingProfile);
    setProfileDraft(createServerProfileDraft(matchingProfile));
    setMatchingSavedAuthProfileId(null);
    setSessionControl((current) => ({
      revision: current.revision + 1,
      shouldConnect: true,
    }));
  }

  return (
    <div className="app-shell">
      <div className="app-chassis">
        <CommandRail
          subjectInput={subjectInput}
          subjectError={watchSubject.errorMessage}
          onSubjectInputChange={setSubjectInput}
        />

        <ServerInfoStrip
          status={session.status}
          isServerDossierOpen={isServerDossierOpen}
          activeServerSummary={activeServerSummary}
          onOpenServerDossier={() => setIsServerDossierOpen(true)}
        />

        {shareLoadAlertMessage ? (
          <div className="app-alerts">
            <div className="panel-note panel-note--error">
              <p className="panel-note__title">{t("alerts.shareUrlWarning")}</p>
              <p>{tText(shareLoadAlertMessage)}</p>
            </div>
          </div>
        ) : null}

        {!shareLoadAlertMessage && matchingSavedAuthProfileId ? (
          <div className="app-alerts">
            <div className="panel-note panel-note--status app-alerts__action">
              <div>
                <p className="panel-note__title">{t("alerts.localAuthAvailable")}</p>
                <p>{t("alerts.localAuthBody")}</p>
              </div>
              <button
                type="button"
                className="panel-actions__secondary"
                onClick={handleUseMatchingLocalAuth}
              >
                {t("alerts.useLocalAuth")}
              </button>
            </div>
          </div>
        ) : null}

        <main className="main-grid" aria-label={t("chrome.a11y.main")}>
          <ServerDossier
            isOpen={isServerDossierOpen}
            onClose={() => setIsServerDossierOpen(false)}
            savedProfiles={savedProfiles}
            selectedProfileId={selectedProfileId}
            draft={profileDraft}
            appliedProfile={appliedProfile}
            validation={draftValidation}
            status={session.status}
            statusDetail={session.lastEventLabel}
            statusDetailAt={session.lastEventAt}
            errorMessage={session.errorMessage}
            onSelectSavedProfile={handleSelectSavedProfile}
            onCreateProfile={handleCreateProfile}
            onDeleteSelectedProfile={handleDeleteSelectedProfile}
            onClearLocalSave={handleClearLocalSave}
            onProfileNameChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                profileName: value,
              }))
            }
            onServersTextChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                serversText: value,
              }))
            }
            onMonitorUrlTextChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                monitorUrlText: value,
              }))
            }
            onTimeoutMsTextChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                timeoutMsText: value,
              }))
            }
            onServerSelectionModeChange={handleSelectionModeChange}
            onAuthModeChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                authMode: value,
                rememberAuth: value === "none" ? false : current.rememberAuth,
              }))
            }
            onTokenTextChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                tokenText: value,
              }))
            }
            onUsernameTextChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                usernameText: value,
              }))
            }
            onPasswordTextChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                passwordText: value,
              }))
            }
            onCredsTextChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                credsText: value,
              }))
            }
            onRememberAuthChange={(value) =>
              setProfileDraft((current) => ({
                ...current,
                rememberAuth: value,
              }))
            }
            onApplyAndConnect={handleApplyAndConnect}
            monitoring={monitoring}
          />

          <SignalDrawer
            hubRef={session.hubRef}
            sessionStatus={session.status}
            errorMessage={watchSubject.errorMessage}
            rows={signalWatch.rows}
          />

          <RequestPanel
            requestSubject={requestSubjectInput}
            requestPayloadText={requestPayloadText}
            timeoutText={requestTimeoutText}
            subjectError={requestReply.subjectError}
            payloadError={requestReply.payloadError}
            timeoutError={requestReply.timeoutError}
            status={requestReply.status}
            statusLabel={requestReply.statusLabel}
            responseText={requestReply.responseText}
            responseMeta={requestReply.responseMeta}
            buttonLabel={requestReply.buttonLabel}
            canSend={requestReply.canSend}
            onRequestSubjectChange={setRequestSubjectInput}
            onRequestPayloadChange={setRequestPayloadText}
            onTimeoutTextChange={setRequestTimeoutText}
            onSendRequest={() => {
              void requestReply.sendRequest();
            }}
            onClearResult={requestReply.clearResult}
          />
        </main>

        <div className="bottom-control-rail">
          <div className="command-rail__controls" aria-label={t("chrome.a11y.appearance")}>
            <div className="command-rail__switcher" role="group" aria-label={t("chrome.a11y.theme")}>
              {(["light", "dark"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`command-rail__switch-button${theme === value ? " command-rail__switch-button--active" : ""}`}
                  onClick={() => onThemeChange(value)}
                >
                  {t(`chrome.theme.${value}`)}
                </button>
              ))}
            </div>

            <div className="command-rail__switcher" role="group" aria-label={t("chrome.a11y.locale")}>
              {(["zh-CN", "en"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`command-rail__switch-button${locale === value ? " command-rail__switch-button--active" : ""}`}
                  onClick={() => onLocaleChange(value)}
                >
                  {t(`chrome.locale.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`command-rail__dossier-toggle bottom-control-rail__share${isShareSheetOpen ? " command-rail__dossier-toggle--active" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={isShareSheetOpen}
            onClick={() => {
              setShareCopyStatus("idle");
              setShareCopyStatusMessage(msg("shareSheet.copyHint"));
              setIsShareSheetOpen(true);
            }}
          >
            {t("serverOverview.actions.share")}
          </button>
        </div>

        <ShareSheet
          isOpen={isShareSheetOpen}
          shareUrl={shareUrl}
          copyStatus={shareCopyStatus}
          copyStatusMessage={shareCopyStatusMessage}
          onClose={() => setIsShareSheetOpen(false)}
          onCopy={() => {
            void handleCopyShareUrl();
          }}
        />

      </div>
    </div>
  );
}

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(initialThemePreference);
  const [locale, setLocale] = useState<LocaleCode>(initialLocalePreference);

  useEffect(() => {
    applyThemePreference(theme);
    persistThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    applyLocalePreference(locale);
    persistLocalePreference(locale);
  }, [locale]);

  return (
    <I18nProvider locale={locale}>
      <AppFrame
        theme={theme}
        locale={locale}
        onThemeChange={setTheme}
        onLocaleChange={setLocale}
      />
    </I18nProvider>
  );
}
