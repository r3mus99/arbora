import { BookMarked } from "lucide-react";
import { linkParts, type Annotations } from "../core/sources";
import type { StringKey } from "./i18n";

type T = (key: StringKey) => string;

/** text in which web addresses are links */
export const Linked = ({ text }: { text: string }) => <>{linkParts(text).map((p, i) => p.href
  ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">{p.text}</a> : p.text)}</>;

/**
 * The small sources button on a timeline event: it opens the (first) source of the event in the Sources panel, where it is read and
 * edited. The event's note is not here: it is always written under the event.
 */
export function EventSources({ a, onSource, t }: { a: Annotations; onSource: (key: string) => void; t: T }) {
  const first = a.sources[0];
  if (!first) return null;
  return <div className="tl-extra">
    <span className="src-toggle">
      <button type="button" className="src-btn" title={t("srcOpen")} aria-label={t("srcOpen")}
              onClick={() => onSource(first.xref || first.title)}><BookMarked className="icon" aria-hidden="true" />{a.sources.length}</button>
    </span>
  </div>;
}
