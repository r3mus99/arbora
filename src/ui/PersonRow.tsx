import { Star } from "lucide-react";
import { formatDate } from "../core/format";
import type { Person } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";

interface Props {
  person: Person;
  lang: Lang;
  /** the person shown in the detail */
  selected: boolean;
  favourite: boolean;
  /** another form of the name that matched the search */
  aka?: string;
  /** a click on the selected person deselects it */
  onSelect: (id: string) => void;
  onStar: (id: string) => void;
  t: (key: StringKey) => string;
}

const years = (p: Person, lang: Lang) => {
  const b = p.birth?.date ? formatDate(p.birth.date, false, lang) : "";
  const d = p.death?.date ? formatDate(p.death.date, false, lang) : "";
  return b || d ? `${b}–${d}` : "";
};

/** One person of a list in the tool bar (People, Recent): sex dot, name, years and the favourite star. Both lists use this row, so they always look alike. */
export function PersonRow({ person: p, lang, selected, favourite, aka, onSelect, onStar, t }: Props) {
  const label = t(favourite ? "starRemove" : "starAdd");
  return (
    <li className={selected ? "sel" : undefined} onClick={() => onSelect(p.id)}>
      <span className={`dot sex-${p.sex === "M" || p.sex === "F" ? p.sex : "U"}`} aria-hidden="true" />
      <span className="rname">{p.name || "?"}{aka && <span className="aka"> · aka {aka}</span>}</span>
      <span className="ryears">{years(p, lang)}</span>
      <button type="button" className={`row-star${favourite ? " on" : ""}`} aria-pressed={favourite} title={label} aria-label={label}
              onClick={(e) => { e.stopPropagation(); onStar(p.id); }}><Star className="icon" aria-hidden="true" /></button>
    </li>
  );
}
