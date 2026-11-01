import { ArrowRight, BookMarked, ListFilter, StickyNote, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import type { SourceOverview } from "../core/sources";
import type { SourceRename } from "../core/sourceTitles";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { Linked } from "./Sources";

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

/** Overview of all sources (with the people citing them) and all notes of the file, read-only. */
export function SourcesPanel({ overview, data, onPerson, renames, onRename, t }: Props) {
  const [tab, setTab] = useState<Tab>("sources");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  /** the preview of renaming all: the sources left out (cited on a person only are left out at first) */
  const [preview, setPreview] = useState<Set<string> | null>(null);
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
        {tab === "sources" && !preview && renames.length > 0 && <div className="sp-wand">
          <button type="button" onClick={() => setPreview(new Set(renames.filter((r) => !r.weak).map((r) => r.xref)))}>
            <WandSparkles className="icon" aria-hidden="true" />{t("srcRenameAll", { n: renames.length })}</button></div>}
        {tab === "sources" && preview ? <>
          <p className="sp-hint">{t("srcRenameHint")}</p>
          <ul className="sp-list panel-body sp-renames">{renames.map((r) => (
            <li key={r.xref}><label className="sp-rename">
              <input type="checkbox" checked={preview.has(r.xref)} onChange={(e) => setPreview((p) => { const n = new Set(p); if (e.target.checked) n.add(r.xref); else n.delete(r.xref); return n; })} />
              <span className="sp-main">
                <span className="sp-sub">{r.from || "–"}</span>
                <span className="sp-title"><ArrowRight className="icon" aria-hidden="true" />{r.to}
                  {r.weak && <span className="chip warn">{t("srcRenameWeak")}</span>}</span>
              </span></label></li>
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
                {s.citation.repository && <div className="src-line"><span>{t("srcRepository")}:</span> <Linked text={s.citation.repository} /></div>}
                {s.citation.publication && <div className="src-line"><span>{t("srcPublication")}:</span> <Linked text={s.citation.publication} /></div>}
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
