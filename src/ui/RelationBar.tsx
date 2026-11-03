import { Home, User } from "lucide-react";
import { useMemo } from "react";
import { ancestry, shortName } from "../core/ancestry";
import type { GedcomData } from "../core/gedcom";
import type { StringKey } from "./i18n";
import { NavArrows } from "./NavArrows";

interface Props {
  data: GedcomData;
  /** the person open in the detail */
  selectedId: string | null;
  homeId: string | null;
  onBack?: () => void;
  onForward?: () => void;
  /** show a person in the chart and the detail */
  onOpen: (id: string) => void;
  /** make the open person the home person */
  onSetHome: () => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** Longer lines than this show the first and the last people and "…" between them. */
const MAX_CRUMBS = 6;

/**
 * The bar under the chart: Back and Forward, the home person (one click returns to them, a second icon button (the words only appear while no home person is set) makes the open
 * person the home person) and, for an ancestor of the home person, the line from the home person down to the open one.
 */
export function RelationBar({ data, selectedId, homeId, onBack, onForward, onOpen, onSetHome, t }: Props) {
  const paths = useMemo(() => ancestry(data, homeId).paths, [data, homeId]);
  const home = homeId ? data.people[homeId] : null;
  // [home, ..., open person]; the home person is the first (bold) step, so the crumbs start after them
  const line = selectedId && homeId && selectedId !== homeId ? [...(paths.get(selectedId) || [])].reverse().slice(1) : [];
  const crumbs: (string | null)[] = line.length > MAX_CRUMBS ? [line[0], null, ...line.slice(-(MAX_CRUMBS - 2))] : line;
  const name = home?.name || "?";
  return (
    <div className="relation-bar">
      <NavArrows onBack={onBack} onForward={onForward} t={t} />
      {home ? <span className="crumb home-crumb">
          {selectedId === home.id ? <strong>{name}</strong>
            : <button type="button" className="link" onClick={() => onOpen(home.id)}
                      title={t("returnHome", { name })} aria-label={t("returnHome", { name })}>{name}</button>}
        </span>
        : <button type="button" className="home-chip empty" onClick={onSetHome} disabled={!selectedId}
                  title={t("homeSet")} aria-label={t("homeSet")}>
          <User className="icon" aria-hidden="true" /><strong>{t("homeSet")}</strong></button>}
      {crumbs.length > 0 && <nav className="crumbs" aria-label={t("relationLine")}>
        {crumbs.map((id, i) => <span key={id ?? "gap"} className="crumb">
          <span className="crumb-sep" aria-hidden="true">›</span>
          {id === null ? <span className="muted">…</span>
            : i === crumbs.length - 1 ? <strong title={data.people[id]?.name}>{shortName(data.people[id])}</strong>
              : <button type="button" className="link" title={data.people[id]?.name} onClick={() => onOpen(id)}>{shortName(data.people[id])}</button>}
        </span>)}
      </nav>}
      {home && selectedId && selectedId !== homeId && <button type="button" className="icon-btn set-home" onClick={onSetHome}
                                                                 title={t("homeSet")} aria-label={t("homeSet")}>
        <Home className="icon" aria-hidden="true" /></button>}
    </div>
  );
}
