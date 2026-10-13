import { useEffect, useMemo, useRef } from "react";
import { formatDate } from "../core/format";
import { fold, type Person } from "../core/gedcom";
import type { Lang } from "../core/texts";

interface Props {
  people: Record<string, Person>;
  lang: Lang;
  selectedId: string | null;
  /** bump to scroll the selected row into view */
  scrollKey: number;
  onSelect: (id: string) => void;
}

/** Compact always-visible list of everybody: sex, name, years. */
export function PersonRail({ people, lang, selectedId, scrollKey, onSelect }: Props) {
  const list = useRef<HTMLUListElement>(null);
  const sorted = useMemo(
    () => Object.values(people).sort((a, b) => fold(a.name).localeCompare(fold(b.name))), [people]);

  useEffect(() => {
    if (scrollKey) list.current?.querySelector("li.sel")?.scrollIntoView({ block: "nearest" });
  }, [scrollKey]);

  const year = (p: Person) => {
    const b = p.birth?.date ? formatDate(p.birth.date, false, lang) : "";
    const d = p.death?.date ? formatDate(p.death.date, false, lang) : "";
    return b || d ? `${b}–${d}` : "";
  };

  return (
    <ul className="rail" ref={list}>
      {sorted.map((p) => (
        <li key={p.id} className={p.id === selectedId ? "sel" : undefined} onClick={() => onSelect(p.id)}>
          <span className={`dot sex-${p.sex === "M" || p.sex === "F" ? p.sex : "U"}`} aria-hidden="true" />
          <span className="rname">{p.name || "?"}</span>
          <span className="ryears">{year(p)}</span>
        </li>
      ))}
    </ul>
  );
}
