import { BookMarked, ExternalLink, StickyNote } from "lucide-react";
import { useState } from "react";
import { citationFields, citationLinks, hasAnnotations, linkParts, readableNotes, withoutLinks, type Annotations, type Citation, type CitationField } from "../core/sources";
import type { StringKey } from "./i18n";
import { SectionHead } from "./Section";

type T = (key: StringKey) => string;

/** text in which web addresses are links */
export const Linked = ({ text }: { text: string }) => <>{linkParts(text).map((p, i) => p.href
  ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">{p.text}</a> : p.text)}</>;

/** the filled fields of a citation as labelled lines, then its links as small chips */
export function CitationFields({ c, t }: { c: Citation; t: T }) {
  const links = citationLinks(c);
  return <>
    {citationFields(c).map((f) => <div key={f.key} className="src-line"><span>{t(FIELD_LABEL[f.key])}:</span> {f.text}</div>)}
    {c.text && <blockquote className="src-text"><Linked text={c.text} /></blockquote>}
    {readableNotes(c).map((n, i) => <div key={i} className="src-note">{n}</div>)}
    {links.length > 0 && <div className="src-links">{links.map((l) =>
      <a key={l.href} className="src-chip" href={l.href} target="_blank" rel="noopener noreferrer" title={l.href}>
        {l.label}{l.suffix && <span> · {l.suffix}</span>}<ExternalLink className="icon" aria-hidden="true" /></a>)}</div>}
  </>;
}

const FIELD_LABEL: Record<CitationField["key"], StringKey> = {
  page: "srcPage", author: "srcAuthor", publication: "srcPublication", repository: "srcRepository", quality: "srcQuality" };

/** one cited source: the title, then every filled field */
function CitationView({ c, t }: { c: Citation; t: T }) {
  return <li className="src-item">
    <div className="src-title">{withoutLinks(c.title) || c.title}</div>
    <CitationFields c={c} t={t} />
  </li>;
}

/** the sources and notes themselves */
function Entries({ a, t }: { a: Annotations; t: T }) {
  return <div className="src-entries">
    {a.sources.length > 0 && <ul className="src-list" aria-label={t("sources")}>
      {a.sources.map((c, i) => <CitationView key={i} c={c} t={t} />)}</ul>}
    {a.notes.map((n, i) => <div key={i} className="note-text src-note"><Linked text={n} /></div>)}
  </div>;
}

const count = (a: Annotations) => a.sources.length + a.notes.length;

/** The block under the timeline: everything that belongs to the person as a whole. */
export function PersonSources({ a, t }: { a: Annotations; t: T }) {
  if (!hasAnnotations(a)) return null;
  return <details className="sources section" open>
    <summary className="sec-head"><SectionHead icon={BookMarked} title={t("srcNotes")} extra={`· ${count(a)}`} /></summary>
    <div className="sec-body"><Entries a={a} t={t} /></div>
  </details>;
}

/** A small button on a timeline event; it opens the event's sources and notes below it. */
export function EventSources({ a, t }: { a: Annotations; t: T }) {
  const [open, setOpen] = useState(false);
  if (!hasAnnotations(a)) return null;
  return <div className="tl-extra">
    <button type="button" className="src-toggle" aria-expanded={open} onClick={() => setOpen(!open)}
            title={t("srcNotes")}>
      {a.sources.length > 0 && <span><BookMarked className="icon" aria-hidden="true" />{a.sources.length}</span>}
      {a.notes.length > 0 && <span><StickyNote className="icon" aria-hidden="true" />{a.notes.length}</span>}
    </button>
    {open && <Entries a={a} t={t} />}
  </div>;
}
