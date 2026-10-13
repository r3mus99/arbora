import { forwardRef, useEffect, useMemo, useRef } from "react";
import { Search } from "lucide-react";
import { formatDate } from "../core/format";
import { findPeople, fold, matchedAka, type Person } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";

interface Props {
  people: Record<string, Person>;
  lang: Lang;
  selectedId: string | null;
  /** bump to scroll the selected row into view */
  scrollKey: number;
  /** search text: name, place or year */
  query: string;
  onQuery: (query: string) => void;
  onSelect: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** Compact always-visible list of everybody: sex, name, years; the search box above it filters the list. */
export const PersonRail = forwardRef<HTMLInputElement, Props>(function PersonRail(
  { people, lang, selectedId, scrollKey, query, onQuery, onSelect, t }, finderRef) {
  const list = useRef<HTMLUListElement>(null);
  const sorted = useMemo(() => {
    const q = query.trim();
    const found = q ? findPeople(q, people) : Object.values(people);
    return found.sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
  }, [people, query]);

  useEffect(() => {
    if (scrollKey) list.current?.querySelector("li.sel")?.scrollIntoView({ block: "nearest" });
  }, [scrollKey]);

  const year = (p: Person) => {
    const b = p.birth?.date ? formatDate(p.birth.date, false, lang) : "";
    const d = p.death?.date ? formatDate(p.death.date, false, lang) : "";
    return b || d ? `${b}–${d}` : "";
  };

  return (
    <>
      <PanelHead title={t("ovPeople")} />
      <div className="finder">
        <Search className="icon" aria-hidden="true" />
        <input ref={finderRef} type="search" placeholder={t("search")} autoComplete="off" value={query}
               onChange={(e) => onQuery(e.target.value)}
               onKeyDown={(e) => { if (e.key === "Escape") onQuery(""); }} />
      </div>
      <ul className="rail panel-body" ref={list}>
        {sorted.map((p) => (
          <li key={p.id} className={p.id === selectedId ? "sel" : undefined} onClick={() => onSelect(p.id)}>
            <span className={`dot sex-${p.sex === "M" || p.sex === "F" ? p.sex : "U"}`} aria-hidden="true" />
            <span className="rname">{p.name || "?"}
              {/* found by another form of the name: show which */}
              {query.trim() && matchedAka(query, p) && <span className="aka"> · aka {matchedAka(query, p)}</span>}</span>
            <span className="ryears">{year(p)}</span>
          </li>
        ))}
        {!sorted.length && <li className="none">{t("noneFound")}</li>}
      </ul>
    </>
  );
});
