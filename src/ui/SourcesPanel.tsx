import { BookMarked, ListFilter, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import { SOURCE_KINDS, type SourceFields, type SourceKind, type SourceOverview } from "../core/sources";
import { isWebAddress, type CiteEvent } from "../core/sourceLinks";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { CitationFields, Linked } from "./Sources";

interface Props {
  overview: SourceOverview;
  data: GedcomData;
  onPerson: (id: string) => void;
  /** the person selected in the tree: their sources and notes are shown first, the rest one click away */
  personId?: string | null;
  /** saves the text of a source record (its xref, then the new fields) */
  onSave?: (xref: string, fields: SourceFields) => void;
  /** cites the source for a person: the whole person ("") or one of its events */
  onCite?: (xref: string, person: string, event: CiteEvent) => void;
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

type T = Props["t"];

/** The text of a source record, edited in place: title, author, publication, notes and web addresses. Save writes the record once. */
function SourceForm({ value, onSave, onCancel, t }: { value: SourceFields; onSave: (f: SourceFields) => void; onCancel: () => void; t: T }) {
  const [f, setF] = useState<SourceFields>(value);
  const [link, setLink] = useState("");
  const [linkBad, setLinkBad] = useState(false);
  const [note, setNote] = useState("");
  const addLink = () => {
    const url = link.trim();
    if (!url) return;
    if (!isWebAddress(url)) { setLinkBad(true); return; }
    setF((x) => ({ ...x, links: [...x.links.filter((l) => l !== url), url] }));
    setLink("");
    setLinkBad(false);
  };
  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    setF((x) => ({ ...x, notes: [...x.notes, text] }));
    setNote("");
  };
  const save = () => {
    // a web address still typed in the field is added too, so Save never drops it
    const url = link.trim();
    const links = url && isWebAddress(url) ? [...f.links.filter((l) => l !== url), url] : f.links;
    onSave({ ...f, notes: f.notes.map((n) => n.trim()).filter(Boolean), links });
  };
  return <form className="sp-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
    <label className="sp-field"><span className="sp-label">{t("srcFieldTitle")}</span>
      <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
    <label className="sp-field"><span className="sp-label">{t("srcAuthor")}</span>
      <input value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} /></label>
    <label className="sp-field"><span className="sp-label">{t("srcPublication")}</span>
      <input value={f.publication} onChange={(e) => setF({ ...f, publication: e.target.value })} /></label>
    <div className="sp-field"><span className="sp-label">{t("srcLinks")}</span>
      {f.links.length > 0 && <div className="src-links">{f.links.map((url) => (
        <span key={url} className="chip">{url.replace(/^https?:\/\//, "")}
          <button type="button" className="icon-btn" aria-label={`${t("srcRemoveLink")}: ${url}`} title={t("srcRemoveLink")}
                  onClick={() => setF((x) => ({ ...x, links: x.links.filter((l) => l !== url) }))}>×</button></span>
      ))}</div>}
      <div className="finder sp-add">
        <input type="url" inputMode="url" placeholder={t("srcLinkPlaceholder")} aria-label={t("srcLinkPlaceholder")} aria-invalid={linkBad || undefined}
               value={link} onChange={(e) => { setLink(e.target.value); setLinkBad(false); }}
               onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
        <button type="button" className="chip" onClick={addLink}>{t("srcAddLink")}</button>
      </div>
      {linkBad && <div className="sp-error" role="alert">{t("srcLinkInvalid")}</div>}
    </div>
    <div className="sp-field"><span className="sp-label">{t("srcNotes")}</span>
      {f.notes.map((n, i) => (
        <div key={i} className="sp-note-row"><span>{n}</span>
          <button type="button" className="icon-btn" aria-label={t("srcRemoveNote")} title={t("srcRemoveNote")}
                  onClick={() => setF((x) => ({ ...x, notes: x.notes.filter((_, j) => j !== i) }))}>×</button></div>
      ))}
      <div className="finder sp-add">
        <input placeholder={t("srcNotePlaceholder")} aria-label={t("srcNotePlaceholder")} value={note}
               onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNote(); } }} />
        <button type="button" className="chip" onClick={addNote}>{t("srcAddNote")}</button>
      </div>
    </div>
    <div className="sp-actions">
      <button type="button" className="chip" onClick={onCancel}>{t("cancel")}</button>
      <button type="submit" className="chip sp-save" aria-pressed="true">{t("save")}</button>
    </div>
  </form>;
}

const CITE_EVENTS: { event: CiteEvent; label: StringKey }[] = [
  { event: "", label: "srcCitePerson" }, { event: "BIRT", label: "thBirth" }, { event: "CHR", label: "christening" },
  { event: "DEAT", label: "thDeath" }, { event: "BURI", label: "burial" },
];

/** Cites this source for one person and one of their events, picked from the file's people. */
function CiteFor({ xref, data, t, onCite }: { xref: string; data: GedcomData; t: T; onCite: NonNullable<Props["onCite"]> }) {
  const people = useMemo(() => Object.values(data.people).sort((a, b) => fold(a.name).localeCompare(fold(b.name))), [data]);
  const [person, setPerson] = useState(people[0]?.id ?? "");
  const [event, setEvent] = useState<CiteEvent>("");
  return <div className="sp-field sp-cite">
    <span className="sp-label">{t("srcCiteFor")}</span>
    <div className="sp-add">
      <select aria-label={t("srcCiteFor")} value={person} onChange={(e) => setPerson(e.target.value)}>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name || "?"}</option>)}
      </select>
      <select aria-label={t("event")} value={event} onChange={(e) => setEvent(e.target.value as CiteEvent)}>
        {CITE_EVENTS.map((c) => <option key={c.event} value={c.event}>{t(c.label)}</option>)}
      </select>
      <button type="button" className="chip" disabled={!person} onClick={() => onCite(xref, person, event)}>{t("srcCiteAdd")}</button>
    </div>
  </div>;
}

/** Overview of all sources (with the people citing them) and all notes of the file, read-only. */
export function SourcesPanel({ overview, data, onPerson, onSave, onCite, personId = null, t }: Props) {
  const [tab, setTab] = useState<Tab>("sources");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  // the source whose text is being edited in the panel (one at a time)
  const [editing, setEditing] = useState<string | null>(null);
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
  const toggle = (key: string) => { setEditing(null); setOpen(open === key ? null : key); };
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
                {editing === s.key && onSave ? <SourceForm value={s.fields} t={t}
                    onSave={(f) => { onSave(s.key, f); setEditing(null); }} onCancel={() => setEditing(null)} />
                  : <>
                    <CitationFields c={s.citation} t={t} />
                    {onSave && s.key.startsWith("@") && <button type="button" className="chip sp-edit" onClick={() => setEditing(s.key)}>{t("srcEditSource")}</button>}
                    {onCite && s.key.startsWith("@") && <CiteFor xref={s.key} data={data} t={t} onCite={onCite} />}
                  </>}
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
