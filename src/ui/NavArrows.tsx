import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StringKey } from "./i18n";

interface Props {
  /** the person opened before / after the current one; undefined when there is none */
  onBack?: () => void;
  onForward?: () => void;
  t: (key: StringKey) => string;
}

/** Back and Forward through the people opened. Above the chart; in the detail heading on a narrow screen, where there is no chart. */
export function NavArrows({ onBack, onForward, t }: Props) {
  return (
    <div className="tools nav-arrows">
      <button type="button" className="icon-btn" onClick={onBack} disabled={!onBack} title={t("back")} aria-label={t("back")}>
        <ChevronLeft className="icon" aria-hidden="true" /></button>
      <button type="button" className="icon-btn" onClick={onForward} disabled={!onForward} title={t("forward")} aria-label={t("forward")}>
        <ChevronRight className="icon" aria-hidden="true" /></button>
    </div>
  );
}
