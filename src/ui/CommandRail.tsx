import { useEffect, useRef, useState } from "react";
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
  const [isSubjectChanging, setIsSubjectChanging] = useState(false);
  const previousSubjectInputRef = useRef(subjectInput);
  const subjectChangeDebounceTimerRef = useRef<number | null>(null);
  const subjectChangeAnimationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (subjectChangeDebounceTimerRef.current !== null) {
        window.clearTimeout(subjectChangeDebounceTimerRef.current);
      }

      if (subjectChangeAnimationTimerRef.current !== null) {
        window.clearTimeout(subjectChangeAnimationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (previousSubjectInputRef.current === subjectInput) {
      return;
    }

    previousSubjectInputRef.current = subjectInput;
    if (subjectChangeDebounceTimerRef.current !== null) {
      window.clearTimeout(subjectChangeDebounceTimerRef.current);
    }

    subjectChangeDebounceTimerRef.current = window.setTimeout(() => {
      subjectChangeDebounceTimerRef.current = null;
      replaySubjectChangeAnimation();
    }, 1000);
  }, [subjectInput]);

  function replaySubjectChangeAnimation() {
    if (subjectChangeAnimationTimerRef.current !== null) {
      window.clearTimeout(subjectChangeAnimationTimerRef.current);
    }

    setIsSubjectChanging(false);
    window.requestAnimationFrame(() => {
      setIsSubjectChanging(true);
      subjectChangeAnimationTimerRef.current = window.setTimeout(() => {
        setIsSubjectChanging(false);
        subjectChangeAnimationTimerRef.current = null;
      }, 920);
    });
  }

  return (
    <header
      className={`command-rail${
        isSubjectChanging ? " command-rail--subject-changing" : ""
      }`}
    >
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
          placeholder={t("chrome.subjectInputPlaceholder")}
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
