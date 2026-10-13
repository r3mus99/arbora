import { forwardRef, useEffect, useMemo, useRef } from "react";
import { Search } from "lucide-react";
import { findPeople, fold, matchedAka, type Person } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { PersonRow } from "./PersonRow";

interface Props {
  people: Record<string, Person>;
  lang: Lang;
  /** the person shown in the detail */
  selectedId: string | null;
  favourites: ReadonlySet<string>;
  onStar: (id: string) => void;
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
  { people, lang, selectedId, favourites, onStar, scrollKey, query, onQuery, onSelect, t }, finderRef) {
  const list = useRef<HTMLUListElement>(null);
  const sorted = useMemo(() => {
    const q = query.trim();
    const found = q ? findPeople(q, people) : Object.values(people);
    return found.sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
  }, [people, query]);

  useEffect(() => {
    if (scrollKey) list.current?.querySelector("li.sel")?.scrollIntoView({ block: "nearest" });
  }, [scrollKey]);

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
          <PersonRow key={p.id} person={p} lang={lang} selected={p.id === selectedId} favourite={favourites.has(p.id)}
                     aka={query.trim() ? matchedAka(query, p) || undefined : undefined}
                     onSelect={onSelect} onStar={onStar} t={t} />
        ))}
        {!sorted.length && <li className="none">{t("noneFound")}</li>}
      </ul>
    </>
  );
});
