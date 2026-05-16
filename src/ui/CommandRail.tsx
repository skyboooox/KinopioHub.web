import { useI18n, type LocalizedText } from "../i18n";

type CommandRailProps = {
  subjectInput: string;
  subjectError: LocalizedText | null;
  onSubjectInputChange: (value: string) => void;
};

export function CommandRail({
  subjectInput,
  subjectError,
  onSubjectInputChange,
}: CommandRailProps) {
  const { t, tText } = useI18n();

  return (
    <header className="command-rail">
      <div className="command-rail__brand-block">
        <h1 className="command-rail__brand">{t("chrome.title")}</h1>
      </div>

      <label className="command-rail__subject-field">
        <span className="eyebrow-label">{t("chrome.subjectInput")}</span>
        <input
          aria-label={t("chrome.subjectInput")}
          aria-invalid={subjectError ? "true" : "false"}
          type="text"
          value={subjectInput}
          onChange={(event) => onSubjectInputChange(event.target.value)}
          placeholder="scope.variable"
          spellCheck={false}
        />
        {subjectError ? (
          <span className="command-rail__subject-error field-error">
            {tText(subjectError)}
          </span>
        ) : null}
      </label>
    </header>
  );
}
