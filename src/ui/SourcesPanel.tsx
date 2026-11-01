import { ArrowRight, BookMarked, ListFilter, StickyNote, WandSparkles } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import type { SourceOverview } from "../core/sources";
import type { SourceRename } from "../core/sourceTitles";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { CitationFields, Linked } from "./Sources";

interface Props {
  overview: SourceOverview;
  data: GedcomData;
  onPerson: (id: string) => void;
  /** sources that can be renamed like a new one, and the rename of the chosen ones (one undo step) */
  renames: SourceRename[];
  onRename: (list: SourceRename[]) => void;
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

/** One line of the rename preview; memoised so that ticking one of hundreds of sources does not redraw them all. */
const RenameRow = memo(function RenameRow({ r, on, onToggle, weak }: { r: SourceRename; on: boolean; onToggle: (xref: string, on: boolean) => void; weak: string }) {
  return <li><label className="sp-rename">
    <input type="checkbox" checked={on} onChange={(e) => onToggle(r.xref, e.target.checked)} />
    <span className="sp-main">
      <span className="sp-sub">{r.from || "–"}</span>
      <span className="sp-title"><ArrowRight className="icon" aria-hidden="true" />{r.to}
        {r.weak && <span className="chip warn">{weak}</span>}</span>
    </span></label></li>;
});

/** Overview of all sources (with the people citing them) and all notes of the file, read-only. */
export function SourcesPanel({ overview, data, onPerson, renames, onRename, t }: Props) {
  const [tab, setTab] = useState<Tab>("sources");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  /** the preview of renaming all: the sources left out (cited on a person only are left out at first) */
  const [preview, setPreview] = useState<Set<string> | null>(null);
  const toggleRename = useCallback((xref: string, on: boolean) => setPreview((p) => { const n = new Set(p); if (on) n.add(xref); else n.delete(xref); return n; }), []);
  const rename = new Map(renames.map((r) => [r.xref, r]));
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
        {tab === "sources" && !preview && renames.length > 0 && <div className="sp-wandbar">
          <button type="button" className="sp-wand" title={t("srcRenameTip")}
                  onClick={() => setPreview(new Set(renames.filter((r) => !r.weak).map((r) => r.xref)))}>
            <WandSparkles className="icon" aria-hidden="true" />{t("srcRenameBtn", { n: renames.length })}</button></div>}
        {tab === "sources" && preview ? <>
          <p className="sp-hint">{t("srcRenameHint")}</p>
          <div className="sp-selbar">
            <span className="sp-count-sel" aria-live="polite">{t("srcRenameSelected", { n: preview.size, m: renames.length })}</span>
            <button type="button" className="link" disabled={preview.size === renames.length}
                    onClick={() => setPreview(new Set(renames.map((r) => r.xref)))}>{t("srcSelAll")}</button>
            <button type="button" className="link" disabled={!preview.size} onClick={() => setPreview(new Set())}>{t("srcSelNone")}</button>
          </div>
          <ul className="sp-list panel-body sp-renames">{renames.map((r) => (
            <RenameRow key={r.xref} r={r} on={preview.has(r.xref)} onToggle={toggleRename} weak={t("srcRenameWeak")} />
          ))}</ul>
          <div className="bulk-foot">
            <button type="button" onClick={() => setPreview(null)}>{t("cancel")}</button>
            <button type="button" className="primary" disabled={!preview.size}
                    onClick={() => { onRename(renames.filter((r) => preview.has(r.xref))); setPreview(null); }}>
              <WandSparkles className="icon" aria-hidden="true" />{t("srcRenameDo", { n: preview.size })}</button>
          </div>
        </> : <ul className="sp-list panel-body">
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
                {rename.has(s.key) && <button type="button" className="link sp-wand-one" title={t("srcRenameTip")} aria-label={t("srcRenameTip")}
                        onClick={() => onRename([rename.get(s.key)!])}>
                  <WandSparkles className="icon" aria-hidden="true" />{rename.get(s.key)!.to}</button>}
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
        </ul>}
      </>}
    </section>
  );
}
