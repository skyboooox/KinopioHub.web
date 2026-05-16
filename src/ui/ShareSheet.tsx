import { useI18n, type LocalizedText } from "../i18n";

type ShareSheetProps = {
  isOpen: boolean;
  shareUrl: string;
  copyStatus: "idle" | "success" | "error";
  copyStatusMessage: LocalizedText;
  onClose: () => void;
  onCopy: () => void;
};

export function ShareSheet({
  isOpen,
  shareUrl,
  copyStatus,
  copyStatusMessage,
  onClose,
  onCopy,
}: ShareSheetProps) {
  const { t, tText } = useI18n();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="server-dossier-modal" role="presentation" onClick={onClose}>
      <section
        className="panel share-sheet-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="server-dossier-dialog__close"
          aria-label={t("shareSheet.close")}
          onClick={onClose}
        >
          {t("shareSheet.close")}
        </button>

        <div className="panel__header">
          <p className="eyebrow-label">{t("shareSheet.eyebrow")}</p>
          <h2 id="share-sheet-title">{t("shareSheet.title")}</h2>
        </div>

        <label className="stack-field">
          <span className="eyebrow-label">{t("shareSheet.shareUrlPreview")}</span>
          <textarea className="share-sheet__url" rows={5} value={shareUrl} readOnly />
        </label>

        <p
          className={`share-sheet__status${copyStatus === "error" ? " share-sheet__status--error" : ""}`}
          aria-live="polite"
        >
          {tText(copyStatusMessage)}
        </p>

        <div className="panel-actions share-sheet__actions">
          <button type="button" className="panel-actions__primary" onClick={onCopy}>
            {t("shareSheet.copyUrl")}
          </button>
        </div>
      </section>
    </div>
  );
}
