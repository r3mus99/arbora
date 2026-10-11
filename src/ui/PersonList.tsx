import { useEffect, useMemo, useRef } from "react";
import { formatDate } from "../core/format";
import { findPeople, fold, type GedEvent, type Person } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";

const LIMIT = 500;

interface Props {
  people: Record<string, Person>;
  query: string;
  lang: Lang;
  selectedId: string | null;
  /** bump to scroll the selected row into view */
  scrollKey: number;
  onSelect: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** Table of people matching the search, sorted by name. */
export function PersonList({ people, query, lang, selectedId, scrollKey, onSelect, t }: Props) {
  const body = useRef<HTMLTableSectionElement>(null);
  const found = useMemo(() => {
    const q = query.trim();
    const list = q ? findPeople(q, people) : Object.values(people);
    return list.sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
  }, [people, query]);

  useEffect(() => {
    if (scrollKey) body.current?.querySelector("tr.sel")?.scrollIntoView({ block: "nearest" });
  }, [scrollKey]);

  const year = (ev: GedEvent | null) => (ev && ev.date ? formatDate(ev.date, false, lang) : "");
  const message = (text: string) => (
    <tr><td colSpan={4} className="name">{text}</td></tr>
  );

  return (
    <div className="people">
      <table>
        <thead>
          <tr><th className="hide-sm">ID</th><th>{t("thName")}</th>
            <th>{t("thBirth")}</th><th className="hide-sm">{t("thDeath")}</th></tr>
        </thead>
        <tbody ref={body}>
          {found.slice(0, LIMIT).map((p) => (
            <tr key={p.id} className={p.id === selectedId ? "sel" : undefined}
                onClick={() => onSelect(p.id)}>
              <td className="num hide-sm">{p.id.replace(/@/g, "")}</td>
              <td className="name">{p.name || "?"}</td>
              <td className="num">{year(p.birth)}</td>
              <td className="num hide-sm">{year(p.death)}</td>
            </tr>
          ))}
          {found.length > LIMIT && message(t("more", { n: found.length - LIMIT }))}
          {!found.length && message(t("noneFound"))}
        </tbody>
      </table>
    </div>
  );
}
