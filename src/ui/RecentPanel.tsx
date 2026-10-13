import { Star } from "lucide-react";
import { formatDate } from "../core/format";
import type { GedcomData, Person } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import type { Entry } from "./marks";
import { PanelHead } from "./PanelHead";

interface Props {
  entries: Entry[];
  data: GedcomData;
  lang: Lang;
  selectedId: string | null;
  onPerson: (id: string) => void;
  onStar: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** Favourite people on top, then the most recently visited ones; a click opens a person, the star marks a favourite. */
export function RecentPanel({ entries, data, lang, selectedId, onPerson, onStar, t }: Props) {
  const year = (p: Person) => {
    const b = p.birth?.date ? formatDate(p.birth.date, false, lang) : "";
    const d = p.death?.date ? formatDate(p.death.date, false, lang) : "";
    return b || d ? `${b}–${d}` : "";
  };
  return (
    <section className="panel-col" aria-label={t("recent")}>
      <PanelHead title={t("recent")} />
      {!entries.length ? <p className="sp-none panel-body">{t("recentEmpty")}</p> : <ul className="rail recent panel-body">
        {entries.map(({ id, fav }) => {
          const p = data.people[id];
          const label = t(fav ? "starRemove" : "starAdd");
          return (
            <li key={id} className={id === selectedId ? "sel" : undefined} onClick={() => onPerson(id)}>
              <span className={`dot sex-${p.sex === "M" || p.sex === "F" ? p.sex : "U"}`} aria-hidden="true" />
              <span className="rname">{p.name || "?"}</span>
              <span className="ryears">{year(p)}</span>
              <button type="button" className={`row-star${fav ? " on" : ""}`} aria-pressed={fav} title={label} aria-label={label}
                      onClick={(e) => { e.stopPropagation(); onStar(id); }}><Star className="icon" aria-hidden="true" /></button>
            </li>
          );
        })}
      </ul>}
    </section>
  );
}
