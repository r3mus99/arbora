import { BookMarked, Check, Link2, Plus, StickyNote, Trash2, User, Users, X, type LucideIcon } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import type { GedcomData } from "../core/gedcom";
import type { CitationLinkChange, CitationLinkLine } from "../core/citationLinks";
import { citeKey, isWebAddress, type CiteEvent, type SourceCite } from "../core/sourceLinks";
import type { SourceFields } from "../core/sources";
import { mayClose } from "./editWindow";
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
  /** the fields, the citations and the changed citation addresses as the window leaves them (one undo step); the window closes after it */
  onSave: (fields: SourceFields, cites: SourceCite[], linkChanges: CitationLinkChange[]) => void;
  onDelete: () => void;
  onClose: () => void;
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

/** The heading of a group of parts; what the parts below it are about is its tooltip (no always-visible hint text). */
function Group({ title, hint }: { title: string; hint: string }) {
  return <div className="part-group" title={hint}><h3>{title}</h3></div>;
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
export function SourceWindow({ data, xref, fields, cites, citeLinks, cited, onSave, onDelete, onClose, hidden, t }: Props) {
  const [form, setForm] = useState<SourceFields>(fields);
  const [list, setList] = useState<SourceCite[]>(cites);
  // the address of each citation line as the window has it (key of the line to text)
  const [urls, setUrls] = useState<Record<string, string>>({});
  const urlOf = (l: CitationLinkLine) => urls[l.key] ?? l.url;
  const linkChanges = citeLinks.filter((l) => urlOf(l).trim() !== l.url && (urlOf(l).trim() === "" || isWebAddress(urlOf(l)))).map((l) => ({ key: l.key, url: urlOf(l).trim() }));
  const badUrl = citeLinks.some((l) => urlOf(l).trim() !== "" && !isWebAddress(urlOf(l)));
  const [adding, setAdding] = useState(false);
  const [person, setPerson] = useState("");
  const [event, setEvent] = useState<CiteEvent>("");
  const [family, setFamily] = useState("");
  const changes = (["title", "author", "publication"] as const).filter((k) => form[k] !== fields[k]).length
    + (same(form.links, fields.links) ? 0 : 1) + (same(form.notes, fields.notes) ? 0 : 1)
    + (same(list.map(citeKey).sort(), cites.map(citeKey).sort()) ? 0 : 1) + (linkChanges.length ? 1 : 0);
  const dirty = changes > 0 || !xref;
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
  const whoOf = (l: CitationLinkLine) => {
    const fam = data.families[l.holder];
    return fam ? [fam.husb, fam.wife].map((id) => (id ? nameOf(id) : "?")).join(" & ") : nameOf(l.holder);
  };
  const eventOf = (l: CitationLinkLine) => (l.event ? (EVENT_LABEL[l.event as CiteEvent] ? t(EVENT_LABEL[l.event as CiteEvent]) : l.event) : t("srcCitePerson"));
  const whereOf = (l: CitationLinkLine) => `${whoOf(l)} · ${eventOf(l)}`;
  // the addresses as the file holds them: a person (or family), under it the event, under it the citation with its address
  const citeTree = useMemo(() => {
    const out: { holder: string; family: boolean; who: string; events: { event: string; label: string; lines: CitationLinkLine[] }[] }[] = [];
    for (const l of citeLinks) {
      let p = out.find((x) => x.holder === l.holder);
      if (!p) out.push(p = { holder: l.holder, family: !!data.families[l.holder], who: whoOf(l), events: [] });
      let e = p.events.find((x) => x.event === l.event);
      if (!e) p.events.push(e = { event: l.event, label: eventOf(l), lines: [] });
      e.lines.push(l);
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citeLinks, data]);
  const label = (c: SourceCite) => c.family
    ? `${t(EVENT_LABEL[c.event])} · ${[data.families[c.family]?.husb, data.families[c.family]?.wife].map((id) => (id ? nameOf(id) : "?")).join(" & ")}`
    : `${nameOf(c.person)} · ${t(EVENT_LABEL[c.event])}`;
  const addCite = () => {
    const next: SourceCite = onFamily ? { event, person: "", family: chosenFamily } : { event, person, family: "" };
    if (!list.some((c) => citeKey(c) === citeKey(next))) setList([...list, next]);
    setAdding(false); setPerson(""); setEvent(""); setFamily("");
  };
  const ready = !!form.title.trim() && !badUrl;
  const save = () => {
    if (!ready || !dirty) return;
    onSave({ ...form, title: form.title.trim(), notes: form.notes.map((n) => n.trim()).filter(Boolean), links: form.links.map((l) => l.trim()).filter(isWebAddress) }, list, linkChanges);
  };
  const close = () => { if (mayClose(changes > 0, () => window.confirm(t("discard")))) onClose(); };
  const onKey = useEffectEvent((e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); close(); } });
  useEffect(() => {
    const handle = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const name = form.title.trim() || t("srcNew");
  return <div className="edit-layer" hidden={hidden}>
    <section className="edit-window" aria-label={name}>
      <PanelHead title={name}>
        <div className="tools">
          {xref && <button type="button" className="icon-btn" title={t("srcDelete")} aria-label={t("srcDelete")}
                  onClick={() => { if (window.confirm(t("srcConfirmDelete", { name, n: cited }))) onDelete(); }}>{ico(Trash2)}</button>}
          <button type="button" className="icon-btn" onClick={close} title={`${t("editClose")} (Esc)`} aria-label={t("editClose")}>{ico(X)}</button>
        </div>
      </PanelHead>
      <div className="panel-body edit-body">
        <form id={SOURCE_FORM} className="editor" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }}
              onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Part icon={BookMarked} title={t("srcSection")}>
            <label title={t("srcFieldTitle")} data-cap={t("srcFieldTitle")}><input placeholder={t("srcFieldTitle")} aria-label={t("srcFieldTitle")} type="text" autoComplete="off" autoFocus={!xref}
                   value={form.title} onChange={(e) => set({ title: e.target.value })} /></label>
            <label title={t("srcAuthor")} data-cap={t("srcAuthor")}><input placeholder={t("srcAuthor")} aria-label={t("srcAuthor")} type="text" autoComplete="off"
                   value={form.author} onChange={(e) => set({ author: e.target.value })} /></label>
            <label title={t("srcPublication")} data-cap={t("srcPublication")}><input placeholder={t("srcPublication")} aria-label={t("srcPublication")} type="text" autoComplete="off"
                   value={form.publication} onChange={(e) => set({ publication: e.target.value })} /></label>
          </Part>
          <Part icon={Link2} title={t("srcLinks")} extra={<AddAct onAdd={() => set({ links: [...form.links, ""] })}>{ico(Plus)}{t("srcAddLink")}</AddAct>}>
            <fieldset className="list">
              {form.links.map((url, i) => (
                <div className="item" key={i}>
                  <div className="item-head">
                    <input type="text" inputMode="url" autoComplete="off" autoFocus={!url} className={url.trim() && !isWebAddress(url) ? "invalid" : undefined}
                           placeholder={t("srcLinkPlaceholder")} aria-label={t("srcLinkPlaceholder")} title={t("srcLinkInvalid")} value={url}
                           onChange={(e) => set({ links: form.links.map((l, j) => (j === i ? e.target.value : l)) })} />
                    <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                            onClick={() => set({ links: form.links.filter((_, j) => j !== i) })}>{ico(Trash2)}</button>
                  </div>
                </div>
              ))}
            </fieldset>
          </Part>
          <Part icon={StickyNote} title={t("notes")} extra={<AddAct onAdd={() => set({ notes: [...form.notes, ""] })}>{ico(Plus)}{t("srcAddNote")}</AddAct>}>
            <fieldset className="list">
              {form.notes.map((note, i) => (
                <div className="item" key={i}>
                  <div className="item-head">
                    <textarea rows={2} autoFocus={!note} placeholder={t("srcNotePlaceholder")} aria-label={t("srcNotePlaceholder")} title={t("srcNotePlaceholder")} value={note}
                              onChange={(e) => set({ notes: form.notes.map((n, j) => (j === i ? e.target.value : n)) })} />
                    <button type="button" className="icon-btn" title={t("remove")} aria-label={t("remove")}
                            onClick={() => set({ notes: form.notes.filter((_, j) => j !== i) })}>{ico(Trash2)}</button>
                  </div>
                </div>
              ))}
            </fieldset>
          </Part>
          <Group title={t("srcGroupCitations")} hint={t("srcGroupCitationsHint")} />
          {citeLinks.length > 0 && <Part icon={Link2} title={t("srcCitationLinks")}>
            <fieldset className="list" title={t("srcCitationLinksTip")}>
              {citeTree.map((p) => (
                <div className="cite-person" key={p.holder}>
                  <div className="cite-head">{ico(p.family ? Users : User)}{p.who}</div>
                  {p.events.map((e) => (
                    <div className="cite-event" key={e.event}>
                      <div className="cite-head sub">{e.label}</div>
                      {e.lines.map((l) => (
                        <label className="cite-link" key={l.key} data-cap={t("srcCitationLink")}>
                          <input type="text" inputMode="url" autoComplete="off" className={urlOf(l).trim() && !isWebAddress(urlOf(l)) ? "invalid" : undefined}
                                 placeholder={t("srcLinkPlaceholder")} aria-label={whereOf(l)} title={t("srcCitationLinkTip", { who: whereOf(l) })} value={urlOf(l)}
                                 onChange={(e) => setUrls({ ...urls, [l.key]: e.target.value })} />
                          <button type="button" className="icon-btn" title={t("srcRemoveCitationLink")} aria-label={`${t("srcRemoveCitationLink")}: ${whereOf(l)}`}
                                  onClick={() => setUrls({ ...urls, [l.key]: "" })}>{ico(Trash2)}</button>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </fieldset>
          </Part>}
          <Part icon={Users} title={t("srcCitedFor")} extra={<AddAct expanded={adding} onAdd={() => setAdding(!adding)}>{ico(Plus)}{t("srcAddCite")}</AddAct>}>
            <fieldset className="list">
              {adding && <div className="new-child">
                <div className="card-head">{ico(Users)}{t("srcCiteFor")}</div>
                <PersonPick choices={choices} exclude={[]} value={person} label="" placeholder={t("srcPersonPlaceholder")} tip={t("srcPersonPlaceholder")} focus onPick={setPerson} />
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
              {list.map((c) => (
                <div className="item" key={citeKey(c)}>
                  <div className="item-head">
                    <span className="grow">{label(c)}</span>
                    <button type="button" className="icon-btn" title={t("remove")} aria-label={`${t("remove")}: ${label(c)}`}
                            onClick={() => setList(list.filter((x) => citeKey(x) !== citeKey(c)))}>{ico(Trash2)}</button>
                  </div>
                </div>
              ))}
              {!list.length && !adding && <p className="hint">{t("srcCitedEmpty")}</p>}
            </fieldset>
          </Part>
        </form>
      </div>
      <div className="edit-foot">
        <span className="bulk-sum" role="status">{changes > 0 ? `${t("unsaved")} (${changes})` : ""}</span>
        <button type="button" onClick={close}>{t("cancel")}</button>
        <button type="submit" form={SOURCE_FORM} className="primary" disabled={!dirty || !ready} title={ready ? "Ctrl+Enter" : t("srcFieldTitle")}>
          {ico(Check)}{t("save")}</button>
      </div>
    </section>
  </div>;
}
