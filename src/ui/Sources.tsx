import { BookMarked, StickyNote } from "lucide-react";
import { useState } from "react";
import { hasAnnotations, linkParts, type Annotations } from "../core/sources";
import type { StringKey } from "./i18n";

type T = (key: StringKey) => string;

/** text in which web addresses are links */
export const Linked = ({ text }: { text: string }) => <>{linkParts(text).map((p, i) => p.href
  ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">{p.text}</a> : p.text)}</>;

/** the notes written under an event, as text */
function Entries({ a }: { a: Annotations }) {
  return <div className="src-entries">
    {a.notes.map((n, i) => <div key={i} className="note-text src-note"><Linked text={n} /></div>)}
  </div>;
}

/**
 * The small buttons on a timeline event: the sources button opens the (first) source of the event in the Sources panel, where it is
 * read and edited; the notes button unfolds the notes below the event.
 */
export function EventSources({ a, onSource, t }: { a: Annotations; onSource: (key: string) => void; t: T }) {
  const [open, setOpen] = useState(false);
  if (!hasAnnotations(a)) return null;
  const first = a.sources[0];
  return <div className="tl-extra">
    <span className="src-toggle">
      {first && <button type="button" className="src-btn" title={t("srcOpen")} aria-label={t("srcOpen")}
                        onClick={() => onSource(first.xref || first.title)}><BookMarked className="icon" aria-hidden="true" />{a.sources.length}</button>}
      {a.notes.length > 0 && <button type="button" className="src-btn" aria-expanded={open} title={t("note")} aria-label={t("note")}
                                     onClick={() => setOpen(!open)}><StickyNote className="icon" aria-hidden="true" />{a.notes.length}</button>}
    </span>
    {open && <Entries a={a} />}
  </div>;
}
