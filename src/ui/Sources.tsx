import { BookMarked, StickyNote } from "lucide-react";
import { useState } from "react";
import { hasAnnotations, linkParts, type Annotations, type Citation } from "../core/sources";
import type { StringKey } from "./i18n";

type T = (key: StringKey) => string;

/** text in which web addresses are links */
export const Linked = ({ text }: { text: string }) => <>{linkParts(text).map((p, i) => p.href
  ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">{p.text}</a> : p.text)}</>;

/** one cited source: its title, then what is known about it as small labelled lines */
function CitationView({ c, t }: { c: Citation; t: T }) {
  const lines: [StringKey, string][] = [["srcPage", c.page], ["srcAuthor", c.author],
                                        ["srcPublication", c.publication], ["srcRepository", c.repository]];
  return <li className="src-item">
    <div className="src-title"><Linked text={c.title} /></div>
    {lines.filter(([, v]) => v).map(([k, v]) => <div key={k} className="src-line"><span>{t(k)}:</span> <Linked text={v} /></div>)}
    {c.text && <blockquote className="src-text"><Linked text={c.text} /></blockquote>}
    {c.notes.map((n, i) => <div key={i} className="src-note"><Linked text={n} /></div>)}
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
  return <details className="sources" open>
    <summary><BookMarked className="icon" aria-hidden="true" />{t("srcNotes")}
      <span className="muted"> · {count(a)}</span></summary>
    <Entries a={a} t={t} />
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
