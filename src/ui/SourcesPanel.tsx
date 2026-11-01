import { BookMarked, ListFilter, Pencil, Plus, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import { SOURCE_KINDS, type SourceKind, type SourceOverview } from "../core/sources";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { CitationFields, Linked } from "./Sources";

interface Props {
  overview: SourceOverview;
  data: GedcomData;
  onPerson: (id: string) => void;
  /** the person selected in the tree: their sources and notes are shown first, the rest one click away */
  personId?: string | null;
  /** opens the source window for a source record (its xref) or for a new one (null); the one place where sources are edited */
  onEdit?: (xref: string | null) => void;
  /** a window of the person is open, so a source cannot be edited now */
  editDisabled?: boolean;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

type Tab = "sources" | "notes";

const KIND_KEY = { birth: "srcKindBirth", death: "srcKindDeath", marriage: "srcKindMarriage", other: "srcKindOther" } as const;

/** The people under one entry, as links. */
export function People({ ids, data, onPerson, t }: { ids: string[]; data: GedcomData } & Pick<Props, "onPerson" | "t">) {
  const people = ids.map((id) => data.people[id]).filter(Boolean).sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
  return <ul className="sp-people" aria-label={t("srcPeople", { n: people.length })}>
    {people.map((p) => <li key={p.id}><button type="button" className="link" onClick={() => onPerson(p.id)}>{p.name || "?"}</button></li>)}
  </ul>;
}


/** Overview of all sources (with the people citing them) and all notes of the file, read-only. */
export function SourcesPanel({ overview, data, onPerson, onEdit, editDisabled, personId = null, t }: Props) {
  const [tab, setTab] = useState<Tab>("sources");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [kinds, setKinds] = useState<SourceKind[]>([]);
  // on by default whenever a person is selected; the chip switches it off to see the whole file
  const [allFile, setAllFile] = useState(false);
  const scoped = personId !== null && !allFile;
  const personName = personId ? data.people[personId]?.name || "?" : "";
  const q = fold(query.trim());
  // how many sources are cited under each kind of event; a filter only makes sense with at least two kinds in the file
  const kindCounts = useMemo(() => SOURCE_KINDS.map((k) => ({ kind: k, n: overview.sources.filter((s) => s.kinds.includes(k)).length })).filter((k) => k.n), [overview]);
  const sources = useMemo(() => overview.sources.filter((s) => (!scoped || s.people.includes(personId!))
    && (!kinds.length || kinds.some((k) => s.kinds.includes(k))) && (!q
    || fold([s.citation.title, s.citation.author, s.citation.publication, s.citation.repository].join(" ")).includes(q))), [overview, q, kinds, scoped, personId]);
  const toggleKind = (k: SourceKind) => { setKinds(kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k]); setOpen(null); };
  const notes = useMemo(() => overview.notes.filter((n) => (!scoped || n.people.includes(personId!)) && (!q || fold(n.text).includes(q))), [overview, q, scoped, personId]);
  const toggle = (key: string) => setOpen(open === key ? null : key);
  const shown = tab === "sources" ? sources.length : notes.length;
  const empty = !overview.sources.length && !overview.notes.length;

  return (
    <section className="panel-col sp" aria-label={t("srcNotes")}>
      <PanelHead title={t("srcNotes")}>
        {onEdit && <div className="tools"><button type="button" className="icon-btn" title={t("srcNew")} aria-label={t("srcNew")} disabled={editDisabled}
                onClick={() => onEdit(null)}><Plus className="icon" aria-hidden="true" /></button></div>}
      </PanelHead>
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
        {tab === "sources" && kindCounts.length > 1 && <div className="sp-kinds" role="group" aria-label={t("event")}>
          {kindCounts.map(({ kind, n }) => (
            <button key={kind} type="button" className="chip" aria-pressed={kinds.includes(kind)} onClick={() => toggleKind(kind)}>
              {t(KIND_KEY[kind])} {n}</button>
          ))}
        </div>}
        {personId !== null && <div className="sp-kinds" role="group" aria-label={personName}>
          <button type="button" className="chip" aria-pressed={scoped} onClick={() => setAllFile(scoped)}>{personName}</button>
        </div>}
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
                <CitationFields c={s.citation} t={t} />
                {onEdit && s.key.startsWith("@") && <button type="button" className="sp-edit" disabled={editDisabled} onClick={() => onEdit(s.key)}>
                  <Pencil className="icon" aria-hidden="true" />{t("srcEditSource")}</button>}
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
