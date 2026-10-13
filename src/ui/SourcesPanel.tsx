import { BookMarked, ListFilter, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import type { SourceOverview } from "../core/sources";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { Linked } from "./Sources";

interface Props {
  overview: SourceOverview;
  data: GedcomData;
  onPerson: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

type Tab = "sources" | "notes";

/** The people under one entry, as links. */
export function People({ ids, data, onPerson, t, notes }: { ids: string[]; data: GedcomData; notes?: Record<string, string> } & Pick<Props, "onPerson" | "t">) {
  const people = ids.map((id) => data.people[id]).filter(Boolean).sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
  return <ul className="sp-people" aria-label={t("srcPeople", { n: people.length })}>
    {people.map((p) => <li key={p.id}><button type="button" className="link" onClick={() => onPerson(p.id)}>{p.name || "?"}</button>
      {notes?.[p.id] && <span className="sp-sub"> · {notes[p.id]}</span>}</li>)}
  </ul>;
}

/** Overview of all sources (with the people citing them) and all notes of the file, read-only. */
export function SourcesPanel({ overview, data, onPerson, t }: Props) {
  const [tab, setTab] = useState<Tab>("sources");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const q = fold(query.trim());
  const sources = useMemo(() => overview.sources.filter((s) => !q
    || fold([s.citation.title, s.citation.author, s.citation.publication, s.citation.repository].join(" ")).includes(q)), [overview, q]);
  const notes = useMemo(() => overview.notes.filter((n) => !q || fold(n.text).includes(q)), [overview, q]);
  const toggle = (key: string) => setOpen(open === key ? null : key);
  const shown = tab === "sources" ? sources.length : notes.length;
  const empty = !overview.sources.length && !overview.notes.length;

  return (
    <section className="panel-col sp" aria-label={t("srcNotes")}>
      <PanelHead title={t("srcNotes")} />
      {empty ? <p className="sp-none panel-body">{t("srcEmpty")}</p> : <>
        <div className="sp-tabs">
          <div className="chart-switch" role="group">
            {(["sources", "notes"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={tab === k} className={tab === k ? "on" : undefined}
                      onClick={() => { setTab(k); setOpen(null); }}>
                {t(k)} {overview[k].length}</button>
            ))}
          </div>
        </div>
        <div className="finder">
          <ListFilter className="icon" aria-hidden="true" />
          <input type="search" placeholder={t("srcFilter")} autoComplete="off" value={query}
                 onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }} />
        </div>
        <ul className="sp-list panel-body">
          {tab === "sources" && sources.map((s) => (
            <li key={s.key} className={open === s.key ? "open" : undefined}>
              <button type="button" className="sp-row" aria-expanded={open === s.key} onClick={() => toggle(s.key)}>
                <BookMarked className="icon" aria-hidden="true" />
                <span className="sp-main">
                  <span className="sp-title">{s.citation.title}</span>
                  <span className="sp-sub">{[s.citation.author, t("srcPeople", { n: s.people.length })].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="sp-count">{s.citations}×</span>
              </button>
              {open === s.key && <div className="sp-more">
                {s.citation.repository && <div className="src-line"><span>{t("srcRepository")}:</span> <Linked text={s.citation.repository} /></div>}
                {s.citation.publication && <div className="src-line"><span>{t("srcPublication")}:</span> <Linked text={s.citation.publication} /></div>}
                <People ids={s.people} data={data} onPerson={onPerson} t={t} />
              </div>}
            </li>
          ))}
          {tab === "notes" && notes.map((n) => (
            <li key={n.text} className={open === n.text ? "open" : undefined}>
              <button type="button" className="sp-row" aria-expanded={open === n.text} onClick={() => toggle(n.text)}>
                <StickyNote className="icon" aria-hidden="true" />
                <span className="sp-main">
                  <span className={`sp-note${open === n.text ? "" : " clamp"}`}>{open === n.text ? <Linked text={n.text} /> : n.text}</span>
                  <span className="sp-sub">{t("srcPeople", { n: n.people.length })}</span>
                </span>
              </button>
              {open === n.text && <div className="sp-more"><People ids={n.people} data={data} onPerson={onPerson} t={t} /></div>}
            </li>
          ))}
          {!shown && <li className="sp-none">{t("srcNothing")}</li>}
        </ul>
      </>}
    </section>
  );
}
