import { BookMarked, Check, Plus, Trash2, Users, WandSparkles, X, type LucideIcon } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import type { GedcomData } from "../core/gedcom";
import type { CitationAddress, CitationLinkChange, CitationLinkLine, CitationPageChange, CitationPageLine } from "../core/citationLinks";
import { citeKey, isWebAddress, type CiteEvent, type SourceCite } from "../core/sourceLinks";
import type { SourceFields } from "../core/sources";
import { formatDate } from "../core/format";
import type { Lang } from "../core/texts";
import { mayClose } from "./editWindow";
import { sourceTitle } from "../core/sources";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { PersonPick } from "./PersonEditor";
import { SectionHead } from "./Section";

export const SOURCE_FORM = "source-editor";

interface Props {
  data: GedcomData;
  /** the source record's xref; null for a new source */
  xref: string | null;
  fields: SourceFields;
  /** where the source is cited now, as the panel lists it */
  cites: SourceCite[];
  /** how many lines cite the source in the file, for the question before it is deleted */
  cited: number;
  /** the web addresses written in the citations of the source */
  citeLinks: CitationLinkLine[];
  /** the page texts (without an address) written in the citations of the source */
  citePages: CitationPageLine[];
  /** the fields, the citations, the changed citation addresses and page texts as the window leaves them (one undo step); the window closes after it */
  onSave: (fields: SourceFields, cites: SourceCite[], linkChanges: CitationLinkChange[], addresses: CitationAddress[], pageChanges: CitationPageChange[]) => void;
  onDelete: () => void;
  onClose: () => void;
  /** tells the app whether the window holds unsaved changes, so another source is not opened over them without asking */
  onDirty?: (dirty: boolean) => void;
  /** a click on a person's name in a citation selects that person in the tree */
  onPerson?: (id: string) => void;
  /** a citation the new source starts with (the shortcut next to an event of the person edit window) */
  first?: SourceCite;
  /** the person selected in the tree: offered as the first citation of a new source */
  person: string | null;
  /** the language of the generated source title */
  lang: string;
  /** a wide tool panel is open, so the window is hidden but keeps its content */
  hidden?: boolean;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

export const EVENT_LABEL: Record<CiteEvent, StringKey> = {
  "": "srcCitePerson", BIRT: "thBirth", CHR: "christening", DEAT: "thDeath", BURI: "burial", MARR: "marriage", DIV: "divorce", RESI: "residence",
};
const EVENTS = Object.keys(EVENT_LABEL) as CiteEvent[];
const ico = (Icon: LucideIcon) => <Icon className="icon" aria-hidden="true" />;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The "add" text action at the right end of a part's header: it does not fold the part, and it opens it. */
function AddAct({ children, onAdd, expanded }: { children: ReactNode; onAdd: () => void; expanded?: boolean }) {
  return <button type="button" className="head-act" aria-expanded={expanded}
                 onClick={(e) => { e.preventDefault(); e.stopPropagation(); const part = e.currentTarget.closest("details"); if (part) part.open = true; onAdd(); }}>
    {children}</button>;
}

/** A collapsible part of the window, built like the parts of the person's edit window. */
function Part({ icon, title, extra, children }: { icon: LucideIcon; title: string; extra?: ReactNode; children: ReactNode }) {
  return <details className="section collapsible" open>
    <summary className="sec-head"><SectionHead icon={icon} title={title} extra={extra} /></summary>
    <div className="sec-fields">{children}</div>
  </details>;
}

/**
 * The edit window of a source (docs/design-guidelines.md, section 7): the text of the source record, its web links and notes,
 * and the people and events it is cited for. It is the one place where sources are edited; the Sources panel and the timeline show what it saves.
 */
export function SourceWindow({ data, xref, fields, cites, citeLinks, citePages, cited, person: selected, first, lang, onSave, onDelete, onClose, onDirty, onPerson, hidden, t }: Props) {
  const [form, setForm] = useState<SourceFields>(fields);
  const [list, setList] = useState<SourceCite[]>(first ? [first] : cites);
  // the address of each citation line as the window has it (key of the line to text)
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlOf = (l: CitationLinkLine) => urls[l.key] ?? l.url;
  const linkChanges = citeLinks.filter((l) => urlOf(l).trim() !== l.url && (urlOf(l).trim() === "" || isWebAddress(urlOf(l)))).map((l) => ({ key: l.key, url: urlOf(l).trim() }));
  // the page text of each citation as the window has it (key of the line to text)
  const [pageTexts, setPageTexts] = useState<Record<string, string>>({});
  const pageOf = (l: CitationPageLine) => pageTexts[l.key] ?? l.text;
  const pageChanges = citePages.filter((l) => pageOf(l).trim() !== l.text && pageOf(l).trim() !== "").map((l) => ({ key: l.key, text: pageOf(l).trim() }));
  // an address typed for a citation that has none yet, by place (citeKey)
  const [added, setAdded] = useState<Record<string, string>>({});
  const addedOf = (c: SourceCite) => (added[citeKey(c)] ?? "").trim();
  const badUrl = citeLinks.some((l) => urlOf(l).trim() !== "" && !isWebAddress(urlOf(l))) || Object.values(added).some((u) => u.trim() !== "" && !isWebAddress(u));
  const [adding, setAdding] = useState(false);
  const [person, setPerson] = useState("");
  const [event, setEvent] = useState<CiteEvent>("");
  const [family, setFamily] = useState("");
  // the title of a new source is suggested from its first citation until it is typed
  const [typedTitle, setTypedTitle] = useState<string | null>(xref ? fields.title : null);
  // the title generated from a citation: the event word and the people ("Baptism Jan Novak 1850"); a citation of a concrete event is
  // preferred over one on the person record, which says nothing about the event
  const generatedTitle = () => {
    const c = list.find((x) => x.event && ["BIRT", "CHR", "DEAT", "BURI", "MARR", "DIV"].includes(x.event)) ?? list[0];
    if (!c) return "";
    const year = (date?: string) => (date?.trim() ? formatDate(date.trim(), true, lang as Lang) : "");
    const kind = ({ BIRT: "birth", CHR: "christening", DEAT: "death", BURI: "burial", MARR: "marriage", DIV: "divorce" } as const)[c.event as "BIRT"];
    if (!kind) return "";
    if (c.family) {
      const fam = data.families[c.family];
      const names = [fam?.husb, fam?.wife].map((id) => (id ? data.people[id]?.name ?? "" : ""));
      return [sourceTitle(lang, kind, ...names), c.event === "MARR" ? year(fam?.marriage?.date) : ""].filter(Boolean).join(" ");
    }
    const who = data.people[c.person];
    if (!who) return "";
    return [sourceTitle(lang, kind, who.name), c.event === "BIRT" || c.event === "CHR" ? year(who.birth?.date) : c.event === "DEAT" || c.event === "BURI" ? year(who.death?.date) : ""].filter(Boolean).join(" ");
  };
  // a new source takes the generated title until one is typed
  const suggestedTitle = () => (xref ? "" : generatedTitle());
  const title = typedTitle ?? suggestedTitle();
  const generated = generatedTitle();
  const changes = (["author", "publication"] as const).filter((k) => form[k] !== fields[k]).length + (title !== fields.title ? 1 : 0)
    + (same(form.links.filter((l) => l.trim()), fields.links) ? 0 : 1) + (same(form.notes.filter((n) => n.trim()), fields.notes) ? 0 : 1)
    + (same(list.map(citeKey).sort(), cites.map(citeKey).sort()) ? 0 : 1) + (linkChanges.length ? 1 : 0) + (pageChanges.length ? 1 : 0) + (list.some((c) => addedOf(c)) ? 1 : 0);
  const dirty = changes > 0 || !xref;
  // the link and note rows are always there: an empty one when the source has none; the + at the end of the last row adds another
  const linkRows = form.links.length ? form.links : [""];
  const noteRows = form.notes.length ? form.notes : [""];
  const set = (patch: Partial<SourceFields>) => setForm({ ...form, ...patch });
  const choices = useMemo(() => Object.values(data.people).sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
    const year = /\d{4}/.exec(p.birth?.date ?? "")?.[0];
    return { id: p.id, label: `${p.name || "?"}${year ? ` (${year})` : ""}` };
  }), [data]);
  const nameOf = (id: string) => data.people[id]?.name || "?";
  const familiesOf = (id: string) => (data.people[id]?.fams ?? []).map((f) => {
    const fam = data.families[f];
    const spouse = fam && (fam.husb === id ? fam.wife : fam.husb);
    return { id: f, name: spouse ? nameOf(spouse) : "?" };
  });
  const onFamily = event === "MARR" || event === "DIV";
  const families = person ? familiesOf(person) : [];
  const chosenFamily = families.some((f) => f.id === family) ? family : families[0]?.id ?? "";
  const holderName = (holder: string) => {
    const fam = data.families[holder];
    return fam ? [fam.husb, fam.wife].map((id) => (id ? nameOf(id) : "?")).join(" & ") : nameOf(holder);
  };
  // the name of a person is a link that selects them; a family shows both spouses, each one a link
  const holderLinks = (holder: string): ReactNode => {
    const fam = data.families[holder];
    const person = (id: string | null | undefined) => {
      if (!id || !data.people[id]) return "?";
      const year = /\d{4}/.exec(data.people[id].birth?.date ?? "")?.[0];
      return <>{onPerson ? <button type="button" className="link person" title={nameOf(id)} onClick={() => onPerson(id)}>{nameOf(id)}</button> : nameOf(id)}{year && <span className="cite-year"> ({year})</span>}</>;
    };
    return fam ? <>{person(fam.husb)} &amp; {person(fam.wife)}</> : person(holder);
  };
  const eventName = (ev: string) => (ev ? (EVENT_LABEL[ev as CiteEvent] ? t(EVENT_LABEL[ev as CiteEvent]) : ev) : t("srcCitePerson"));
  // the citations as the file holds them: a person (or family), under it the event, under it the citation with its address (an empty row when it has none)
  const citeTree = useMemo(() => {
    type Place = { event: string; cite: SourceCite | null; lines: CitationLinkLine[]; pages: CitationPageLine[] };
    const out: { holder: string; family: boolean; places: Place[] }[] = [];
    const group = (holder: string) => {
      let p = out.find((x) => x.holder === holder);
      if (!p) out.push(p = { holder, family: !!data.families[holder], places: [] });
      return p;
    };
    for (const c of list) {
      const holder = c.family || c.person;
      group(holder).places.push({ event: c.event, cite: c, lines: citeLinks.filter((l) => l.holder === holder && l.event === c.event),
        pages: citePages.filter((l) => l.holder === holder && l.event === c.event) });
    }
    // addresses under lines of the file that the list does not name (another kind of event); a citation taken out of the list takes its addresses with it
    const kept = new Set(list.map(citeKey));
    const removed = cites.filter((c) => !kept.has(citeKey(c)));
    for (const l of citeLinks) {
      if (removed.some((c) => (c.family || c.person) === l.holder && c.event === l.event)) continue;
      const p = group(l.holder);
      const at = p.places.find((x) => x.event === l.event);
      if (!at) p.places.push({ event: l.event, cite: null, lines: [l], pages: [] });
      else if (!at.lines.includes(l) && !at.cite) at.lines.push(l);
    }
    return out;
  }, [list, cites, citeLinks, citePages, data]);
  // the parents of the person a birth or christening is cited for: offered as one click each; a parent already cited stays in place, marked, so the buttons do not move under the pointer
  const parentsOf = (c: SourceCite | null) => {
    if (!c || c.family || (c.event !== "BIRT" && c.event !== "CHR")) return [];
    const fam = data.families[data.people[c.person]?.famc[0] ?? ""];
    return [fam?.husb, fam?.wife].filter((id): id is string => !!id && !!data.people[id]);
  };
  const citedPerson = (id: string) => list.some((x) => !x.family && x.event === "" && x.person === id);
  // a citation added in this window has nothing written yet, so its event can still be chosen; saved citations keep theirs (their page and address belong to it)
  const eventChoices = (c: SourceCite) => EVENTS.filter((ev) => (c.family ? ev === "" || ev === "MARR" || ev === "DIV" : ev !== "MARR" && ev !== "DIV")
    && (ev === c.event || !list.some((x) => x !== c && !x.family === !c.family && x.person === c.person && x.family === c.family && x.event === ev)));
  const changeEvent = (c: SourceCite, event: CiteEvent) => setList(list.map((x) => (x === c ? { ...c, event } : x)));
  const addCite = () => {
    const next: SourceCite = onFamily ? { event, person: "", family: chosenFamily } : { event, person, family: "" };
    if (!list.some((c) => citeKey(c) === citeKey(next))) setList([...list, next]);
    setAdding(false); setPerson(""); setEvent(""); setFamily("");
  };
  const ready = !!title.trim() && !badUrl;
  const save = () => {
    if (!ready || !dirty) return;
    onSave({ ...form, title: title.trim(), notes: form.notes.map((n) => n.trim()).filter(Boolean), links: form.links.map((l) => l.trim()).filter(isWebAddress) }, list, linkChanges,
      list.filter((c) => addedOf(c)).map((c) => ({ cite: c, url: addedOf(c) })), pageChanges);
  };
  useEffect(() => { onDirty?.(changes > 0); }, [changes, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  const close = () => { if (mayClose(changes > 0, () => window.confirm(t("discard")))) onClose(); };
  const onKey = useEffectEvent((e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); close(); } });
  useEffect(() => {
    const handle = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const name = title.trim() || t("srcNew");
  return <div className="edit-layer centre" hidden={hidden}>
    <section className="edit-window" aria-label={name}>
      <PanelHead title={name}>
        <div className="tools">
          <button type="button" className="icon-btn" onClick={close} title={`${t("editClose")} (Esc)`} aria-label={t("editClose")}>{ico(X)}</button>
        </div>
      </PanelHead>
      <div className="panel-body edit-body">
        <form id={SOURCE_FORM} className="editor" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }}
              onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Part icon={BookMarked} title={t("srcSection")}>
            <div className="cite-block link-row">
              <label title={t("srcFieldTitle")} data-cap={t("srcFieldTitle")}><input placeholder={t("srcFieldTitle")} aria-label={t("srcFieldTitle")} type="text" autoComplete="off" autoFocus={!xref}
                     value={title} onChange={(e) => setTypedTitle(e.target.value)} /></label>
              <button type="button" className="icon-btn" title={generated ? t("srcGenerateTitle", { title: generated }) : t("srcGenerateTitleNone")} aria-label={t("srcGenerateTitleNone")}
                      disabled={!generated || generated === title} onClick={() => setTypedTitle(generated)}>{ico(WandSparkles)}</button>
            </div>
            <label title={t("srcAuthor")} data-cap={t("srcAuthor")}><input placeholder={t("srcAuthor")} aria-label={t("srcAuthor")} type="text" autoComplete="off"
                   value={form.author} onChange={(e) => set({ author: e.target.value })} /></label>
            <label title={t("srcPublication")} data-cap={t("srcPublication")}><input placeholder={t("srcPublication")} aria-label={t("srcPublication")} type="text" autoComplete="off"
                   value={form.publication} onChange={(e) => set({ publication: e.target.value })} /></label>
            {linkRows.map((url, i) => (
              <div className="cite-block link-row" key={`l${i}`}>
                <label data-cap={t("srcCitationLink")}><input type="text" inputMode="url" autoComplete="off" className={url.trim() && !isWebAddress(url) ? "invalid" : undefined}
                       placeholder={t("srcLinkPlaceholder")} aria-label={t("srcLinkPlaceholder")} title={t("srcLinkInvalid")} value={url}
                       onChange={(e) => set({ links: i < form.links.length ? form.links.map((l, j) => (j === i ? e.target.value : l)) : [e.target.value] })} /></label>
                {i < form.links.length && <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                        onClick={() => set({ links: form.links.filter((_, j) => j !== i) })}>{ico(Trash2)}</button>}
                {i === linkRows.length - 1 && url.trim() !== "" && <button type="button" className="icon-btn" title={t("srcAddLink")} aria-label={t("srcAddLink")}
                        onClick={() => set({ links: [...form.links, ""] })}>{ico(Plus)}</button>}
              </div>
            ))}
            {noteRows.map((note, i) => (
              <div className="cite-block link-row" key={`n${i}`}>
                <label data-cap={t("note")}><textarea rows={2} placeholder={t("srcNotePlaceholder")} aria-label={t("srcNotePlaceholder")} title={t("srcNotePlaceholder")} value={note}
                       onChange={(e) => set({ notes: i < form.notes.length ? form.notes.map((n, j) => (j === i ? e.target.value : n)) : [e.target.value] })} /></label>
                {i < form.notes.length && <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                        onClick={() => set({ notes: form.notes.filter((_, j) => j !== i) })}>{ico(Trash2)}</button>}
                {i === noteRows.length - 1 && note.trim() !== "" && <button type="button" className="icon-btn" title={t("srcAddNote")} aria-label={t("srcAddNote")}
                        onClick={() => set({ notes: [...form.notes, ""] })}>{ico(Plus)}</button>}
              </div>
            ))}
          </Part>
          <Part icon={Users} title={t("srcCitedFor")} extra={<AddAct expanded={adding} onAdd={() => setAdding(!adding)}>{ico(Plus)}{t("srcAddCite")}</AddAct>}>
            <fieldset className="list">
              {adding && <div className="new-child">
                <div className="card-head">{ico(Users)}{t("srcCiteFor")}</div>
                <PersonPick choices={choices} exclude={[]} value={person} label="" placeholder={t("srcPersonPlaceholder")} tip={t("srcPersonPlaceholder")} cap={t("srcCitationPerson")} focus onPick={setPerson} />
                <label><span>{t("event")}</span>
                  <select value={event} onChange={(e) => setEvent(e.target.value as CiteEvent)}>
                    {EVENTS.map((ev) => <option key={ev || "person"} value={ev}>{t(EVENT_LABEL[ev])}</option>)}
                  </select></label>
                {onFamily && <label><span>{t("srcCiteFamily")}</span>
                  <select value={chosenFamily} disabled={!families.length} onChange={(e) => setFamily(e.target.value)}>
                    {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select></label>}
                <div className="kid-actions">
                  <button type="button" onClick={() => setAdding(false)}>{t("cancel")}</button>
                  <button type="button" className="primary" disabled={!person || (onFamily && !chosenFamily)} onClick={addCite}>{t("srcCiteAdd")}</button>
                </div>
              </div>}
              {!xref && !list.length && !adding && selected && data.people[selected] && <label data-cap={t("srcCiteForPerson")}>
                <span className="head-acts"><button type="button" className="head-act" onClick={() => { setPerson(selected); setAdding(true); }}>
                  {ico(Plus)}{nameOf(selected)}</button></span></label>}
              {citeTree.flatMap((p) => p.places.map((pl) => {
                const where = `${holderName(p.holder)} · ${eventName(pl.event)}`;
                return <div className="cite-block" key={`${p.holder}|${pl.event}`}>
                  {pl.cite && <button type="button" className="icon-btn cite-remove" title={t("remove")} aria-label={`${t("remove")}: ${where}`}
                          onClick={() => setList(list.filter((x) => citeKey(x) !== citeKey(pl.cite!)))}>{ico(Trash2)}</button>}
                  <label data-cap={t("srcCitationPerson")}><span className="static strong">{holderLinks(p.holder)}</span></label>
                  {pl.cite && !cites.some((x) => citeKey(x) === citeKey(pl.cite!))
                    ? <label><span>{t("event")}</span>
                        <select value={pl.event} onChange={(e) => changeEvent(pl.cite!, e.target.value as CiteEvent)}>
                          {eventChoices(pl.cite).map((ev) => <option key={ev || "person"} value={ev}>{t(EVENT_LABEL[ev])}</option>)}
                        </select></label>
                    : <label data-cap={t("event")}><span className="static">{eventName(pl.event)}</span></label>}
                  {pl.lines.map((l) => (
                    <label key={l.key} data-cap={t("srcCitationLink")}>
                      <input type="text" inputMode="url" autoComplete="off" className={urlOf(l).trim() && !isWebAddress(urlOf(l)) ? "invalid" : undefined}
                             placeholder={t("srcLinkPlaceholder")} aria-label={where} title={t("srcCitationLinkTip", { who: where })} value={urlOf(l)}
                             onChange={(e) => setUrls({ ...urls, [l.key]: e.target.value })} />
                    </label>
                  ))}
                  {parentsOf(pl.cite).some((id) => !citedPerson(id)) && <label data-cap={t("srcCiteParents")}>
                    <span className="head-acts">{parentsOf(pl.cite).map((id) => (
                      <button type="button" key={id} className="head-act" disabled={citedPerson(id)}
                              onClick={(e) => { e.preventDefault(); if (!citedPerson(id)) setList([...list, { event: "", person: id, family: "" }]); }}>
                        {ico(citedPerson(id) ? Check : Plus)}{nameOf(id)}</button>))}</span>
                  </label>}
                  {pl.pages.map((pg) => (
                    <label key={pg.key} data-cap={t("srcCitationPage")}>
                      <input type="text" autoComplete="off" placeholder={t("srcCitationPage")} aria-label={where} title={t("srcCitationPage")} value={pageOf(pg)}
                             onChange={(e) => setPageTexts({ ...pageTexts, [pg.key]: e.target.value })} />
                    </label>
                  ))}
                  {!pl.lines.length && !pl.pages.length && pl.cite && <label data-cap={t("srcCitationLink")}>
                    <input type="text" inputMode="url" autoComplete="off" className={added[citeKey(pl.cite)]?.trim() && !isWebAddress(added[citeKey(pl.cite)]) ? "invalid" : undefined}
                           placeholder={t("srcLinkPlaceholder")} aria-label={where} title={t("srcCitationLinkTip", { who: where })} value={added[citeKey(pl.cite)] ?? ""}
                           onChange={(e) => setAdded({ ...added, [citeKey(pl.cite!)]: e.target.value })} />
                  </label>}
                </div>;
              }))}
              {!list.length && !adding && <p className="hint">{t("srcCitedEmpty")}</p>}
            </fieldset>
          </Part>
        </form>
      </div>
      <div className="edit-foot">
        {xref && <button type="button" className="foot-delete" title={t("srcDelete")}
                onClick={() => { if (window.confirm(t("srcConfirmDelete", { name, n: cited }))) onDelete(); }}>{ico(Trash2)}{t("srcDelete")}</button>}
        <span className="bulk-sum" role="status">{changes > 0 ? `${t("unsaved")} (${changes})` : ""}</span>
        <button type="button" onClick={close}>{t("cancel")}</button>
        <button type="submit" form={SOURCE_FORM} className="primary" disabled={!dirty || !ready} title={ready ? "Ctrl+Enter" : t("srcFieldTitle")}>
          {ico(Check)}{t("save")}</button>
      </div>
    </section>
  </div>;
}
