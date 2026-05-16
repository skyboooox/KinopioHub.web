import { useI18n } from "../i18n";

type StatusPillProps = {
  state: "connected" | "connecting" | "disconnected" | "error";
};

export function StatusPill({ state }: StatusPillProps) {
  const { t } = useI18n();

  return (
    <span className={`status-pill status-pill--${state}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {t(`status.${state}`)}
    </span>
  );
}
