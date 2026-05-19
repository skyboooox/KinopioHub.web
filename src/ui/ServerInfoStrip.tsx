import type { ServerDiagnosticRow } from "../core/session/useServerDiagnostics";
import { useI18n } from "../i18n";

type ServerInfoStripProps = {
  status: "connected" | "connecting" | "disconnected" | "error";
  isServerDossierOpen: boolean;
  servers: ServerDiagnosticRow[];
  onOpenServerDossier: () => void;
};

export function ServerInfoStrip({
  status,
  isServerDossierOpen,
  servers,
  onOpenServerDossier,
}: ServerInfoStripProps) {
  const { t, tText } = useI18n();
  const sessionStateLabel = t(`status.${status}`);

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
          <div
            className="server-info-strip__nodes"
            aria-label={t("serverOverview.servers")}
          >
            {servers.length > 0 ? (
              servers.map((server) => (
                <article
                  className={`server-node server-node--${server.state}`}
                  key={`${server.identity}-${server.server}`}
                >
                  <span
                    className={`server-node__badge server-node__badge--${server.state} status-pill status-pill--${server.state === "connected" ? "connected" : server.state === "failed" ? "error" : server.state === "probing" ? "connecting" : "disconnected"}`}
                    title={tText(server.reason)}
                  >
                    <span className="status-pill__dot" aria-hidden="true" />
                    <span className="status-pill__text">
                      {t(`serverOverview.serverState.${server.state}`)}
                      {server.rttMs !== undefined ? (
                        <span className="server-node__latency">
                          {" "}
                          {t("serverOverview.serverLatency", { rtt: server.rttMs })}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="server-node__url" title={server.displayServer}>
                    {server.displayServer}
                  </span>
                </article>
              ))
            ) : (
              <p className="server-info-strip__line">
                {t("serverOverview.summary.noServer")} / {sessionStateLabel}
              </p>
            )}
          </div>
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
