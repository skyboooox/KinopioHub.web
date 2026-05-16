import { useI18n, type LocalizedText } from "../i18n";
import { StatusPill } from "./StatusPill";

type ServerInfoStripProps = {
  status: "connected" | "connecting" | "disconnected" | "error";
  isServerDossierOpen: boolean;
  activeServerSummary: LocalizedText;
  onOpenServerDossier: () => void;
};

export function ServerInfoStrip({
  status,
  isServerDossierOpen,
  activeServerSummary,
  onOpenServerDossier,
}: ServerInfoStripProps) {
  const { t, tText } = useI18n();

  return (
    <section
      className="panel panel--cold server-info-strip"
      aria-labelledby="server-info-strip-title"
    >
      <div className="server-info-strip__layout">
        <div className="server-info-strip__identity">
          <p className="eyebrow-label">{t("serverOverview.eyebrow")}</p>
          <h2 id="server-info-strip-title">{t("serverOverview.title")}</h2>
        </div>

        <div className="server-info-strip__rail">
          <StatusPill state={status} />
          <p className="server-info-strip__line">{tText(activeServerSummary)}</p>
        </div>

        <div className="server-info-strip__actions">
          <button
            type="button"
            className={`command-rail__dossier-toggle${isServerDossierOpen ? " command-rail__dossier-toggle--active" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={isServerDossierOpen}
            aria-controls="server-dossier-dialog"
            onClick={onOpenServerDossier}
          >
            {t("serverOverview.actions.dossier")}
          </button>
        </div>
      </div>
    </section>
  );
}
