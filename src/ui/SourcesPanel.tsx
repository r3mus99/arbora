import { BookMarked, ExternalLink, ListFilter, Pencil, Plus, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import type { CitationLinkLine } from "../core/citationLinks";
import { citeKey, type CiteEvent, type SourceCite } from "../core/sourceLinks";
import { SOURCE_KINDS, type SourceKind, type SourceOverview } from "../core/sources";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { Linked } from "./Sources";
import { EVENT_LABEL } from "./SourceWindow";

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
  /** where a source is cited and the web addresses written in those citations, for the citations part of an opened source */
  citationsOf?: (xref: string) => { cites: SourceCite[]; links: CitationLinkLine[] };
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


const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** One web address of a citation as a small chip. */
const LinkChip = ({ url }: { url: string }) => <a className="src-chip" href={url} target="_blank" rel="noopener noreferrer" title={url}>
  {hostOf(url)}<span> · {url.split(/[/:]/).filter(Boolean).pop()}</span><ExternalLink className="icon" aria-hidden="true" /></a>;

/** The citations of an opened source: who it is cited for, under which event, and the address written in that citation. */
function Citations({ xref, ids, data, citationsOf, onPerson, t }: { xref: string; ids: string[]; data: GedcomData; citationsOf: NonNullable<Props["citationsOf"]> } & Pick<Props, "onPerson" | "t">) {
  const { cites, links } = citationsOf(xref);
  const nameOf = (id: string) => data.people[id]?.name || "?";
  const familyName = (id: string) => [data.families[id]?.husb, data.families[id]?.wife].map((p) => (p ? nameOf(p) : "?")).join(" & ");
  const linksAt = (holder: string, event: string) => links.filter((l) => l.holder === holder && l.event === event);
  const eventName = (event: string) => (EVENT_LABEL[event as CiteEvent] ? t(EVENT_LABEL[event as CiteEvent]) : event);
  const shown = new Set<string>();
  const rows = cites.map((c) => {
    const holder = c.family || c.person;
    shown.add(`${holder}|${c.event}`);
    return { key: citeKey(c), person: c.person, label: c.family ? familyName(c.family) : nameOf(c.person), event: c.event ? eventName(c.event) : t("srcCitePerson"), urls: linksAt(holder, c.event).map((l) => l.url) };
  });
  // addresses under lines the list above does not name (another kind of event)
  const rest = links.filter((l) => !shown.has(`${l.holder}|${l.event}`)).map((l) => ({
    key: l.key, person: data.people[l.holder] ? l.holder : "", label: data.people[l.holder] ? nameOf(l.holder) : familyName(l.holder), event: l.event ? eventName(l.event) : t("srcCitePerson"), urls: [l.url] }));
  const named = new Set([...rows, ...rest].map((r) => r.person).filter(Boolean));
  // people who cite the source on a line that is not listed above
  const others = ids.filter((id) => data.people[id] && !named.has(id)).map((id) => ({ key: id, person: id, label: nameOf(id), event: "", urls: [] as string[] }));
  // laid out like the file: the person (or family), under it the event, under it the address
  const tree: { id: string; person: string; label: string; events: { key: string; event: string; urls: string[] }[] }[] = [];
  for (const r of [...rows, ...rest, ...others]) {
    const id = r.person || r.label;
    let p = tree.find((x) => x.id === id);
    if (!p) tree.push(p = { id, person: r.person, label: r.label, events: [] });
    if (r.event) p.events.push({ key: r.key, event: r.event, urls: r.urls });
  }
  return <ul className="sp-cites" aria-label={t("srcGroupCitations")}>
    {tree.map((p) => <li key={p.id}>
      <div className="src-line"><span>{t("srcCitationPerson")}:</span> {p.person ? <button type="button" className="link" onClick={() => onPerson(p.person)}>{p.label}</button> : p.label}</div>
      {p.events.map((e) => <div key={e.key} className="cite-event">
        <div className="src-line"><span>{t("event")}:</span> {e.event}</div>
        {e.urls.length > 0 && <div className="src-line"><span>{t("srcCitationLink")}:</span> <span className="src-links inline">{e.urls.map((u, i) => <LinkChip key={i} url={u} />)}</span></div>}
      </div>)}
    </li>)}
  </ul>;
}

/** Overview of all sources (with the people citing them) and all notes of the file, read-only. */
export function SourcesPanel({ overview, data, onPerson, onEdit, editDisabled, citationsOf, personId = null, t }: Props) {
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
                </span>
                <span className="sp-count">{s.citations}×</span>
              </button>
              {open === s.key && <div className="sp-more">
                <div className="sp-group">
                  {onEdit && s.key.startsWith("@") && <button type="button" className="icon-btn sp-edit-btn" title={t("srcEditSource")} aria-label={t("srcEditSource")}
                          disabled={editDisabled} onClick={() => onEdit(s.key)}><Pencil className="icon" aria-hidden="true" /></button>}
                  {s.fields.author && <div className="src-line"><span>{t("srcAuthor")}:</span> <Linked text={s.fields.author} /></div>}
                  {s.fields.publication && <div className="src-line"><span>{t("srcPublication")}:</span> <Linked text={s.fields.publication} /></div>}
                  {s.fields.notes.length > 0 && <div className="src-line"><span>{t("notes")}:</span> {s.fields.notes.map((n, i) => <span key={i}>{i > 0 && "; "}<Linked text={n} /></span>)}</div>}
                  {s.fields.links.length > 0 && <div className="src-line"><span>{t("srcLinks")}:</span> <span className="src-links inline">{s.fields.links.map((u) => <LinkChip key={u} url={u} />)}</span></div>}
                </div>
                <div className="sp-group"><div className="sp-group-title">{t("srcGroupCitations")}</div>
                  {citationsOf && s.key.startsWith("@") ? <Citations xref={s.key} ids={s.people} data={data} citationsOf={citationsOf} onPerson={onPerson} t={t} />
                    : <People ids={s.people} data={data} onPerson={onPerson} t={t} />}
                </div>
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
