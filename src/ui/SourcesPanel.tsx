import { BookMarked, ExternalLink, Plus, Search, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import type { CitationLinkLine } from "../core/citationLinks";
import { citeKey, type CiteEvent, type SourceCite } from "../core/sourceLinks";
import type { SourceOverview } from "../core/sources";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { Linked } from "./Sources";
import { EVENT_LABEL } from "./SourceWindow";

interface Props {
  overview: SourceOverview;
  data: GedcomData;
  onPerson: (id: string) => void;
  /** opens the source window for a source record (its xref) or for a new one (null); the one place where sources are edited */
  onEdit?: (xref: string | null) => void;
  /** the source whose window is open on the right: its row is marked in the list */
  activeXref?: string | null;
  /** a window of the person is open, so a source cannot be edited now */
  editDisabled?: boolean;
  /** where a source is cited and the web addresses written in those citations, for the citations part of an opened source */
  citationsOf?: (xref: string) => { cites: SourceCite[]; links: CitationLinkLine[] };
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

type Tab = "sources" | "notes";

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
    return { key: citeKey(c), person: c.person, label: c.family ? familyName(c.family) : nameOf(c.person), event: c.event ? eventName(c.event) : "", urls: linksAt(holder, c.event).map((l) => l.url) };
  });
  // addresses under lines the list above does not name (another kind of event)
  const rest = links.filter((l) => !shown.has(`${l.holder}|${l.event}`)).map((l) => ({
    key: l.key, person: data.people[l.holder] ? l.holder : "", label: data.people[l.holder] ? nameOf(l.holder) : familyName(l.holder), event: l.event ? eventName(l.event) : "", urls: [l.url] }));
  const named = new Set([...rows, ...rest].map((r) => r.person).filter(Boolean));
  // people who cite the source on a line that is not listed above
  const others = ids.filter((id) => data.people[id] && !named.has(id)).map((id) => ({ key: id, person: id, label: nameOf(id), event: "", urls: [] as string[] }));
  // one entry per citation, without labels: "person · event", under it the address
  return <ul className="sp-cites" aria-label={t("srcGroupCitations")}>
    {[...rows, ...rest, ...others].map((r) => <li key={r.key}>
      <div>{r.person ? <button type="button" className="link" onClick={() => onPerson(r.person)}>{r.label}</button> : r.label}{r.event && <span className="cite-ev"> · {r.event}</span>}</div>
      {r.urls.length > 0 && <span className="src-links">{r.urls.map((u, i) => <LinkChip key={i} url={u} />)}</span>}
    </li>)}
  </ul>;
}

/** Overview of all sources (with the people citing them) and all notes of the file, read-only. */
export function SourcesPanel({ overview, data, onPerson, onEdit, editDisabled, activeXref = null, citationsOf, t }: Props) {
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
        <div className="finder">
          <Search className="icon" aria-hidden="true" />
          <input type="search" placeholder={t("srcFilter")} autoComplete="off" value={query}
                 onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }} />
        </div>
        <ul className="sp-list panel-body">
          {tab === "sources" && sources.map((s) => (
            <li key={s.key} className={open === s.key || activeXref === s.key ? "open" : undefined}>
              {/* a source of the file opens in the window on the right (one place to read and edit it); only a source written inline in a citation still unfolds here */}
              <button type="button" className={`sp-row${activeXref === s.key ? " active" : ""}`} disabled={!!onEdit && s.key.startsWith("@") && editDisabled}
                      aria-expanded={onEdit && s.key.startsWith("@") ? undefined : open === s.key} aria-current={activeXref === s.key ? "true" : undefined}
                      onClick={() => (onEdit && s.key.startsWith("@") ? onEdit(s.key) : toggle(s.key))}>
                <BookMarked className="icon" aria-hidden="true" />
                <span className="sp-main">
                  <span className="sp-title">{s.citation.title}</span>
                  {s.fields.author && <span className="sp-sub">{s.fields.author}</span>}
                </span>
                {open !== s.key && <span className="sp-count">{s.citations}×</span>}
              </button>
              {open === s.key && <div className="sp-more">
                <div className="sp-group">
                  {s.fields.publication && <div className="sp-pub"><Linked text={s.fields.publication} /></div>}
                  {s.fields.notes.length > 0 && <div className="sp-notes">{s.fields.notes.map((n, i) => <span key={i}>{i > 0 && "; "}<Linked text={n} /></span>)}</div>}
                  {s.fields.links.length > 0 && <span className="src-links">{s.fields.links.map((u) => <LinkChip key={u} url={u} />)}</span>}
                </div>
                <div className="sp-group"><div className="sp-group-title">{t("srcGroupCitations")} {s.citations}</div>
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
