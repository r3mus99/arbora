import {
  Award, Baby, Briefcase, Check, CircleHelp, X, Church, Cross, Crosshair, Droplets, Flag, Flower2, GraduationCap, MapPin, Handshake, Hash, History, Heart, HeartCrack, Home, Landmark, Mars, Pencil,
  StickyNote, Star, CalendarDays, Tag, Users, Venus, type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { applyAttribute, applyEventLine, applyEventNode, applyFamily, applyPerson, type AttributeFields, dateInput, familyFields, parseDate, personFields, type EventFields, type PersonFields, type Suggestions } from "../core/edit";
import { associationsOf, type Association } from "../core/associations";
import { recordInfo } from "../core/info";
import { mapUrl, municipality } from "../core/places";
import { nameDetails } from "../core/names";
import { personAttributes, type Attribute } from "../core/facts";
import { dateParts } from "../core/date";
import { fmt, formatDate } from "../core/format";
import { childOf, type GedNode, type GedcomData, type Person } from "../core/gedcom";
import { TEXTS, type Lang } from "../core/texts";
import { annotations, eventAnnotations, hasAnnotations, marriageAnnotations, personAnnotations, type Lookup } from "../core/sources";
import { timeline, type TimelineItem, type TimelineKind } from "../core/timeline";
import type { StringKey } from "./i18n";
import { EDITOR_FORM, givenList, PLACES, RELIGIONS, surnameList, SuggestLists } from "./PersonEditor";
import { InlineName, InlineNote, InlineText } from "./Inline";
import { Row, Section } from "./Section";
import { EventSources, Linked, PersonSources } from "./Sources";

interface Props {
  data: GedcomData;
  id: string;
  /** the person's GEDCOM record, read the same way as the edit form reads it */
  record?: GedNode;
  /** the record behind an xref, for the sources and notes it points to */
  lookup: Lookup;
  /** the people whose ASSO lines name this person */
  inbound: Association[];
  rootId: string;
  /** favourite person: the star next to the name */
  starred: boolean;
  onStar: () => void;
  lang: Lang;
  onFocus: (id: string) => void;
  onMakeRoot: (id: string) => void;
  /** inline edits: the changed records, one undo step each */
  onChange: (changed: GedNode[]) => void;
  /** surnames and places in the file, offered while typing */
  suggest: Suggestions;
  onEdit: () => void;
  onCancelEdit: () => void;
  /** the edit form, shown instead of the facts */
  editor: ReactNode;
  t: (key: StringKey) => string;
}

/** one fact (employment, religion, …): a section with the common title and the value in the text column */
function Fact({ icon, label, children }: { icon: LucideIcon; label: string; children?: ReactNode }) {
  return <Section icon={icon} title={label}>{children}</Section>;
}

const DETAIL_KEYS = { age: "detAge", cause: "detCause", agency: "detAgency", address: "detAddress" } as const;

const ATTRIBUTE_ICONS: Record<string, LucideIcon> = {
  EDUC: GraduationCap, NATI: Flag, TITL: Award, PROP: Landmark, NCHI: Users, IDNO: Hash,
};

const ICONS: Record<TimelineKind, LucideIcon> = {
  birth: Baby, christening: Droplets, residence: Home, event: CalendarDays, famEvent: Heart, marriage: Heart, child: Baby, death: Cross, burial: Flower2,
};

/** Facts and close family of one person, with their life as a timeline; relatives are links. */
export function PersonDetail({ data, id, record, lookup, inbound, rootId, starred, onStar, lang, onFocus, onMakeRoot, onChange, suggest, onEdit, onCancelEdit, editor, t }: Props) {
  const p = data.people[id];
  if (!p) return null;
  const f = record ? personFields(record) : null;
  /** an inline edit: the fields that changed, applied the same way as the form applies them */
  const change = (patch: Partial<PersonFields>) => {
    if (!record || !f) return;
    const next = applyPerson(record, f, { ...f, ...patch });
    if (next !== record) onChange([next]);
  };
  const live = !editor && !!record;
  /** a changed date or place of a timeline event, written to the record that holds the event */
  const changeEvent = (e: TimelineItem, patch: Partial<EventFields>) => {
    const before = { date: e.date, place: e.place };
    const after = { ...before, ...patch };
    if (e.kind === "birth" || e.kind === "christening" || e.kind === "death" || e.kind === "burial") {
      change({ [e.kind]: after });
    } else if (e.kind === "marriage") {
      const fam = lookup(e.key);
      if (!fam) return;
      const ff = familyFields(fam);
      const next = applyFamily(fam, ff, { ...ff, marriage: after });
      if (next !== fam) onChange([next]);
    } else if (e.node) {
      const owner = e.family ? lookup(e.family) : record;
      const next = owner && applyEventNode(owner, e.node, before, after);
      if (next && next !== owner) onChange([next]);
    }
  };
  /** whether the date and place of a timeline item can be edited here */
  const editable = (e: TimelineItem) => live && e.kind !== "child" && (e.kind === "marriage" ? !!lookup(e.key)
    : e.kind === "residence" || e.kind === "event" || e.kind === "famEvent" ? !!e.node && (!e.family || !!lookup(e.family)) : true);
  /** a date shown as text that can be changed in place; `set` gets the new date as GEDCOM */
  const dateInline = (stored: string, set: (date: string) => void) => {
    const shown = dateInput(stored, lang);
    return <InlineText value={shown} label={t("date")} onCommit={(v) => { if (v !== shown) set(parseDate(v, lang).value); }}>
      {formatDate(stored, true, lang)}</InlineText>;
  };
  const placeInline = (stored: string, set: (place: string) => void) =>
    <InlineText value={stored} label={t("place")} list={PLACES} onCommit={(v) => { if (v !== stored) set(v); }}>
      {municipality(stored)}</InlineText>;
  const dateField = (e: TimelineItem) => dateInline(e.date, (date) => changeEvent(e, { date }));
  const placeField = (e: TimelineItem) => placeInline(e.place, (place) => changeEvent(e, { place }));
  /** a changed value, date or place of an attribute line (EDUC, TITL, …) */
  const changeAttribute = (a: Attribute, patch: Partial<AttributeFields>) => {
    if (!record) return;
    const before = { value: a.value, date: a.date, place: a.place };
    const next = applyAttribute(record, a.node, before, { ...before, ...patch });
    if (next !== record) onChange([next]);
  };
  /** the event line of a timeline item and the record it is in, for its sub-lines (AGE, CAUS, AGNC) */
  const eventLine = (e: TimelineItem): { owner: GedNode; node: GedNode } | null => {
    if (e.kind === "birth" || e.kind === "christening" || e.kind === "death" || e.kind === "burial") {
      const node = record && childOf(record, EVENT_TAG[e.kind]!);
      return record && node ? { owner: record, node } : null;
    }
    if (e.kind === "marriage") {
      const fam = lookup(e.key), node = fam && childOf(fam, "MARR");
      return fam && node ? { owner: fam, node } : null;
    }
    const owner = e.family ? lookup(e.family) : record;
    return owner && e.node ? { owner, node: e.node } : null;
  };
  const LINE_TAGS = { age: "AGE", cause: "CAUS", agency: "AGNC" } as const;
  /** date and place of a fact; with `set` (and an open detail) they can be changed in place */
  const when = (e: EventFields | null, set?: (patch: Partial<EventFields>) => void) => e && (e.date || e.place) ? <div className="fact-value">
    {e.date && <span>{live && set ? dateInline(e.date, (date) => set({ date })) : formatDate(e.date, true, lang)}</span>}
    {e.place && <span className="place">{live && set ? placeInline(e.place, (place) => set({ place })) : municipality(e.place)}</span>}
  </div> : null;
  const years = (q: Person) => {
    const b = q.birth ? formatDate(q.birth.date, false, lang) : "";
    const d = q.death ? formatDate(q.death.date, false, lang) : "";
    return d ? `${b}–${d}` : b;
  };
  /** a reference to a person: name, year of birth in brackets and the municipality of birth */
  const link = (pid: string | null, withPlace = true) => {
    const q = pid ? data.people[pid] : null;
    if (!q) return <span className="muted">?</span>;
    const year = q.birth ? formatDate(q.birth.date, false, lang) : "";
    const place = withPlace && q.birth ? municipality(q.birth.place) : "";
    return <span className="person-ref">
      <button className="link person" type="button" onClick={() => onFocus(q.id)}>{q.name || "?"}</button>
      {(year || place) && <span> (<span className="s-birt">{year}</span>{year && place && " "}<span className="s-place">{place}</span>)</span>}
    </span>;
  };

  const birthFam = p.famc.length ? data.families[p.famc[0]] : null;
  const parents = birthFam ? [birthFam.husb, birthFam.wife].filter((x): x is string => !!x) : [];
  const life = timeline(data, id, f, record, lookup);
  // the tag of the person's own line, or the marriage family, that a timeline item shows
  const EVENT_TAG: Partial<Record<TimelineKind, string>> = { birth: "BIRT", christening: "CHR", death: "DEAT", burial: "BURI" };
  const extras = (kind: TimelineKind, key: string, node?: GedNode) => {
    if (node) return annotations(node, lookup);
    if (kind === "marriage") { const fam = lookup(key); return fam ? marriageAnnotations(fam, lookup) : null; }
    const tag = EVENT_TAG[kind];
    return record && tag ? eventAnnotations(record, tag, lookup) : null;
  };
  // a title such as "Dr." is written before the name
  const prefix = record ? nameDetails(record).parts.find((n) => n.kind === "prefix")?.value : "";
  const SexIcon = p.sex === "M" ? Mars : p.sex === "F" ? Venus : null;
  const label = (kind: TimelineKind, dated: boolean, other: string | null, title = "", tag = "") => {
    const sex = other ? data.people[other]?.sex : "";
    switch (kind) {
      case "birth": return t("thBirth");
      case "christening": return t("christening");
      case "marriage": return t("marriage");
      case "child": return t(sex === "M" ? "childBornM" : sex === "F" ? "childBornF" : "childBorn");
      case "burial": return t("burial");
      case "residence": return t("residence");
      case "famEvent": return title || (tag ? t(`ev${tag}` as StringKey) : t("event"));
      case "event": return title || (tag ? t(`ev${tag}` as StringKey) : t("event"));
      case "death": return dated ? t("thDeath") : t(p.sex === "M" ? "deceasedM" : p.sex === "F" ? "deceasedF" : "deceased");
    }
  };

  return (
    <aside className="detail" aria-live="polite">
      <div className="detail-head">
        <div className="detail-name">
        <h3>{prefix && `${prefix} `}
          {live && f ? <InlineName key={`${id}|${f.given}|${f.surname}`} given={f.given} surname={f.surname} label={t("edit")}
                                   givenLabel={t("givenName")} surnameLabel={t("surname")} givens={givenList(f.sex)} surnames={surnameList(f.sex)}
                                   onCommit={(given, surname) => change({ given, surname })}>{p.name || "?"}</InlineName>
            : <>{p.name || "?"}</>}
          {live && f ? <SexPick sex={f.sex} label={t("sex")} t={t} onPick={(sex) => change({ sex })} />
            : SexIcon && <SexIcon className={`icon sex-${p.sex}`} aria-label={t(p.sex === "M" ? "male" : "female")} />}
        </h3>
        <div className="tools">
          <button type="button" className={`icon-btn star-btn${starred ? " on" : ""}`} aria-pressed={starred} onClick={onStar}
                  title={t(starred ? "starRemove" : "starAdd")} aria-label={t(starred ? "starRemove" : "starAdd")}>
            <Star className="icon" aria-hidden="true" /></button>
        </div>
        </div>
        {/* while editing: save and cancel as icons, the same as the buttons below the form */}
        {editor && <div className="tools">
          <button type="submit" form={EDITOR_FORM} className="icon-btn save" title={`${t("save")} (Ctrl+Enter)`}
                  aria-label={t("save")}><Check className="icon" aria-hidden="true" /></button>
          <button type="button" className="icon-btn" onClick={onCancelEdit} title={`${t("cancel")} (Esc)`}
                  aria-label={t("cancel")}><X className="icon" aria-hidden="true" /></button>
        </div>}
        {!editor && <div className="tools">
          <button type="button" className="icon-btn" onClick={onEdit} title={t("edit")} aria-label={t("edit")}>
            <Pencil className="icon" aria-hidden="true" /></button>
          {id !== rootId && <button type="button" className="icon-btn" onClick={() => onMakeRoot(id)}
                                    title={t("makeRoot")} aria-label={t("makeRoot")}>
            <Crosshair className="icon" aria-hidden="true" /></button>}
        </div>}
      </div>
      {live && <SuggestLists suggest={suggest} lang={lang} />}
      <p className="id">
        {years(p) && <span className="lifespan">{years(p)} · </span>}
        {/* other forms of the name (aka), quietly before the ID */}
        {f && f.aliases.length > 0 && <span className="aka" title={t("aka")}>
          aka {f.aliases.map((a, i) => {
            const text = [a.given, a.surname].filter(Boolean).join(" ");
            return <span key={a.origin}>{i > 0 && ", "}{live ? <InlineName key={`${id}|${a.given}|${a.surname}`} given={a.given}
              surname={a.surname} label={t("aka")} givenLabel={t("givenName")} surnameLabel={t("surname")} givens={givenList(f.sex)} surnames={surnameList(f.sex)}
              onCommit={(given, surname) => change({ aliases: f.aliases.map((x) => (x === a ? { ...x, given, surname } : x)) })}>{text}</InlineName>
              : text}</span>;
          })} · </span>}
        {p.id.replace(/@/g, "")}</p>
      {editor || <div className="facts">
        {(() => {
          const names = record ? nameDetails(record) : null;
          const NAME_LABELS: Record<string, StringKey> = { nickname: "nickname", called: "calledName",
                                surnamePrefix: "surnamePrefix", suffix: "nameSuffix" } as const;
          return names && (names.parts.some((n) => n.kind !== "prefix") || names.others.length > 0) && <div className="name-parts">
            {names.parts.filter((n) => n.kind !== "prefix").map((n, i) => <div key={i}><span>{t(NAME_LABELS[n.kind])}:</span> {n.value}</div>)}
            {names.others.map((n, i) => <div key={`o${i}`}><span>{t("otherName")}{n.type ? ` (${n.type})` : ""}:</span> {n.name}</div>)}
          </div>;
        })()}
        {parents.length > 0 && <Section icon={Users} title={t("parents")} rows className="timeline">
          {/* a small timeline: the parent born first, the other parent, the wedding last */}
          {[...parents].sort((x, y) => {
            const key = (id: string) => { const d = dateParts(data.people[id]?.birth?.date); return d ? d.y * 10000 + d.m * 100 + d.d : Infinity; };
            return key(x) === key(y) ? 0 : key(x) < key(y) ? -1 : 1;
          }).map((pid) => {
            const q = data.people[pid];
            return <Row key={pid} icon={Baby} tone={q?.sex ? `tl-birth tl-sex-${q.sex}` : "tl-birth"}>
              <div className="tl-date">{q?.birth?.date && <span>{formatDate(q.birth.date, true, lang)}</span>}
                <span className="tl-label">{q?.birth?.date && " · "}{t("thBirth")}</span></div>
              <div className="tl-what">{link(pid)}</div>
            </Row>;
          })}
          {birthFam?.marriage && (birthFam.marriage.date || birthFam.marriage.place) && <Row icon={Heart} tone="tl-marriage">
            <div className="tl-date">{birthFam.marriage.date && <span>{formatDate(birthFam.marriage.date, true, lang)}</span>}
              <span className="tl-label">{birthFam.marriage.date && " · "}{t("marriage")}</span></div>
            {birthFam.marriage.place && <div className="tl-what muted">{municipality(birthFam.marriage.place)}</div>}
          </Row>}
        </Section>}
        {life.length > 0 && <Section icon={History} title={t("timeline")} rows className="timeline">
          {life.map((e) => {
            const Icon = (e.kind === "marriage" && e.divorced) || e.tag === "DIV" ? HeartCrack : ICONS[e.kind];
            const found = extras(e.kind, e.key, e.node);
            const src = found && hasAnnotations(found) ? found : null;
            const childSex = e.kind === "child" && e.other ? data.people[e.other]?.sex : "";
            return <Row key={e.key} icon={Icon} tone={`tl-${e.kind}${childSex ? ` tl-sex-${childSex}` : ""}`}>
              <div className={`tl-body${src ? " has-src" : ""}`}>
                {/* first line: date, what happened and the age; second line: who and where */}
                <div className="tl-date">
                  {e.date && <span>{editable(e) ? dateField(e) : formatDate(e.date, true, lang)}</span>}
                  <span className="tl-label">{e.date && " · "}{label(e.kind, !!e.date, e.other, e.title, e.tag)}</span>
                  {e.age !== null && <span className="muted"> · {fmt(t("ageAt"), { n: e.age })}</span>}</div>
                {(e.other || e.detail || e.divorced || (e.place && e.kind !== "child") || e.coords) && <div className="tl-what">
                  {e.other && link(e.other)}
                  {e.detail && <>{e.other && " · "}{e.detail}</>}
                  {e.divorced && <span className="muted">{e.other && " · "}{TEXTS[lang].divorced}</span>}
                  {/* a child's birth place is shown with the child's name */}
                  {e.place && e.kind !== "child" && <span className="muted">{(e.other || e.detail || e.divorced) && " · "}{editable(e) ? placeField(e) : municipality(e.place)}</span>}
                  {e.coords && <a className="map-link" href={mapUrl(e.coords)} target="_blank" rel="noopener noreferrer"
                                  title={t("showOnMap")} aria-label={t("showOnMap")}>
                    <MapPin className="icon" aria-hidden="true" /></a>}
                </div>}
                {e.witnesses && <div className="tl-details"><span>{t("witnesses")}:</span>{" "}
                  {e.witnesses.map((w, i) => <span key={w}>{i > 0 && ", "}{link(w)}</span>)}</div>}
                {e.spouseAges && <div className="tl-details"><span>{t("marriageAges")}:</span>{" "}
                  {e.spouseAges.map((a, i) => <span key={i}>{i > 0 && ", "}{a.name} ({a.age}{t("yearsShort")})</span>)}</div>}
                {e.details && <div className="tl-details">{e.details.map((d) => {
                  const line = live && d.key !== "address" ? eventLine(e) : null;
                  const tag = d.key !== "address" ? LINE_TAGS[d.key] : "";
                  return <div key={d.key}><span>{t(DETAIL_KEYS[d.key])}:</span>{" "}
                    {line ? <InlineText value={d.value} label={t(DETAIL_KEYS[d.key])} onCommit={(v) => {
                      const next = applyEventLine(line.owner, line.node, tag, d.value, v);
                      if (next !== line.owner) onChange([next]);
                    }}>{d.value}</InlineText> : d.value}</div>;
                })}</div>}
                {src && <EventSources a={src} t={t} />}
              </div>
            </Row>;
          })}
        </Section>}
        {p.religion && <Fact icon={Church} label={t("religion")}><div className="fact-value">
          {live && f ? <InlineText value={f.religion} label={t("religion")} list={RELIGIONS}
                                   onCommit={(v) => { if (v.trim() !== f.religion) change({ religion: v }); }}>{p.religion}</InlineText>
            : p.religion}</div></Fact>}
        {f && f.occupations.length > 0 && <Fact icon={Briefcase} label={t("occupation")}>
          {f.occupations.map((o) => <div key={o.origin}>
            <div className="fact-value">{live ? <InlineText value={o.value} label={t("occupation")}
              onCommit={(v) => { if (v.trim() !== o.value) change({ occupations: f.occupations.map((x) => (x === o ? { ...x, value: v } : x)) }); }}>
              {o.value}</InlineText> : o.value}</div>
            {when(o, (patch) => change({ occupations: f.occupations.map((x) => (x === o ? { ...x, ...patch } : x)) }))}
          </div>)}
        </Fact>}
        {!f && p.occupation && <Fact icon={Briefcase} label={t("occupation")}>
          <div className="fact-value">{p.occupation}</div></Fact>}
        {record && personAttributes(record).map((a, i) => <Fact key={i} icon={ATTRIBUTE_ICONS[a.tag] || Tag}
                                                              label={t(`attr${a.tag}` as StringKey)}>
          {a.value && <div className="fact-value">{live ? <InlineText value={a.value} label={t(`attr${a.tag}` as StringKey)}
            onCommit={(v) => changeAttribute(a, { value: v })}>{a.value}</InlineText> : a.value}</div>}
          {when(a, (patch) => changeAttribute(a, patch))}
        </Fact>)}
        {(() => {
          const roleText = (r: string) => r === "godparent" ? t("roleGodparent") : r === "witness" ? t("roleWitness")
            : r ? r[0].toUpperCase() + r.slice(1) : t("associations");
          const rows = [...(record ? associationsOf(record) : []).map((a) => ({ ...a, inbound: false })),
                        ...inbound.map((a) => ({ ...a, inbound: true }))].filter((a) => a.id in data.people);
          return rows.length > 0 && <Fact icon={Handshake} label={t("associations")}>
            <ul>{rows.map((a, i) => <li key={i}>
              <span className="muted">{roleText(a.role)}{a.inbound ? ` ${t("assocFor")}` : ""}:</span> {link(a.id)}
            </li>)}</ul>
          </Fact>;
        })()}
        {f?.note && <Section icon={StickyNote} title={t("note")}>{live ? <InlineNote className="note-text" value={f.note} label={t("note")} onCommit={(v) => { if (v.trim() !== f.note.trim()) change({ note: v }); }}>
            <Linked text={f.note} /></InlineNote> : <div className="note-text"><Linked text={f.note} /></div>}</Section>}
        {record && <PersonSources t={t} a={(({ sources, notes }) => ({
          sources, notes: notes.filter((n) => n !== f?.note.trim()) }))(personAnnotations(record, lookup))} />}
        {(() => {
          const info = record ? recordInfo(record) : [];
          const KEYS = { changed: "infoChanged", reference: "infoReference", recordId: "infoRecordId", uid: "infoUid",
                         media: "infoMedia" } as const;
          return info.length > 0 && <details className="record-info">
            <summary>{t("recordInfo")}</summary>
            {info.map((l, i) => <div key={i}><span>{t(KEYS[l.key])}:</span> {l.value}</div>)}
          </details>;
        })()}
      </div>}
    </aside>
  );
}

/** The sex icon next to the name; a click opens the three choices in a small popover, so nothing moves. */
function SexPick({ sex, label, onPick, t }: { sex: string; label: string; onPick: (sex: string) => void; t: (key: StringKey) => string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const Icon = sex === "M" ? Mars : sex === "F" ? Venus : CircleHelp;
  const choices: [string, StringKey][] = [["M", "male"], ["F", "female"], [sex === "" ? "" : "U", "sexUnknown"]];
  return <span ref={box} className="inline-sex"
               onKeyDown={(e) => { if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); } }}
               onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
    <button type="button" className="inline-value" title={label} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
      <Icon className={`icon sex-${sex}`} aria-hidden="true" /></button>
    {open && <span className="chart-switch inline-pop" role="group" aria-label={label}>
      {choices.map(([value, key]) => <button key={key} type="button" className={sex === value ? "on" : undefined}
                                             aria-pressed={sex === value} autoFocus={sex === value}
                                             onClick={() => { if (value !== sex) onPick(value); setOpen(false); }}>{t(key)}</button>)}
    </span>}
  </span>;
}
