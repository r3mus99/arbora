import {
  Award, Baby, Briefcase, CalendarClock, Check, X, Church, Cross, Crosshair, Droplets, Flag, Flower2, GraduationCap, MapPin, Handshake, Hash, Heart, HeartCrack, Home, Landmark, Mars, Pencil,
  StickyNote, Star, Tag, Users, Venus, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { personFields, type EventFields } from "../core/edit";
import { associationsOf, type Association } from "../core/associations";
import { recordInfo } from "../core/info";
import { mapUrl } from "../core/places";
import { nameDetails } from "../core/names";
import { personAttributes } from "../core/facts";
import { fmt, formatDate } from "../core/format";
import type { GedNode, GedcomData, Person } from "../core/gedcom";
import { TEXTS, type Lang } from "../core/texts";
import { annotations, eventAnnotations, marriageAnnotations, personAnnotations, type Lookup } from "../core/sources";
import { timeline, type TimelineKind } from "../core/timeline";
import type { StringKey } from "./i18n";
import { EDITOR_FORM } from "./PersonEditor";
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
  lang: Lang;
  onFocus: (id: string) => void;
  onMakeRoot: (id: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  /** the edit form, shown instead of the facts */
  editor: ReactNode;
  t: (key: StringKey) => string;
}

/** one fact: an icon, a small label and the value below it */
function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children?: ReactNode }) {
  return <div className="fact">
    <span className="fact-icon"><Icon className="icon" aria-hidden="true" /></span>
    <div className="fact-body">
      <div className="fact-label">{label}</div>
      {children}
    </div>
  </div>;
}

const DETAIL_KEYS = { age: "detAge", cause: "detCause", agency: "detAgency", address: "detAddress" } as const;

const ATTRIBUTE_ICONS: Record<string, LucideIcon> = {
  EDUC: GraduationCap, NATI: Flag, TITL: Award, PROP: Landmark, NCHI: Users, IDNO: Hash,
};

const ICONS: Record<TimelineKind, LucideIcon> = {
  birth: Baby, christening: Droplets, residence: Home, event: Star, famEvent: Heart, marriage: Heart, child: Baby, death: Cross, burial: Flower2,
};

/** Facts and close family of one person, with their life as a timeline; relatives are links. */
export function PersonDetail({ data, id, record, lookup, inbound, rootId, lang, onFocus, onMakeRoot, onEdit, onCancelEdit, editor, t }: Props) {
  const p = data.people[id];
  if (!p) return null;
  const f = record ? personFields(record) : null;
  const when = (e: EventFields | null) => e && (e.date || e.place) ? <div className="fact-value">
    {e.date && <span>{formatDate(e.date, true, lang)}</span>}
    {e.place && <span className="place">{e.place}</span>}
  </div> : null;
  const years = (q: Person) => {
    const b = q.birth ? formatDate(q.birth.date, false, lang) : "";
    const d = q.death ? formatDate(q.death.date, false, lang) : "";
    return d ? `${b}–${d}` : b;
  };
  const link = (pid: string | null, withYears = true) => {
    const q = pid ? data.people[pid] : null;
    if (!q) return <span className="muted">?</span>;
    return <>
      <button className="link" type="button" onClick={() => onFocus(q.id)}>{q.name || "?"}</button>
      {withYears && years(q) && <span className="muted"> {years(q)}</span>}
    </>;
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
        <h3>{prefix && `${prefix} `}{p.name || "?"}
          {SexIcon && <SexIcon className={`icon sex-${p.sex}`} aria-label={t(p.sex === "M" ? "male" : "female")} />}
        </h3>
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
      <p className="id">
        {/* other forms of the name (aka), quietly before the ID */}
        {f && f.aliases.length > 0 && <span className="aka" title={t("aka")}>
          aka {f.aliases.map((a) => [a.given, a.surname].filter(Boolean).join(" ")).join(", ")} · </span>}
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
        {parents.length > 0 && <Fact icon={Users} label={t("parents")}>
          <ul>{parents.map((pid) => <li key={pid}>{link(pid)}</li>)}</ul>
        </Fact>}
        {life.length > 0 && <section className="timeline">
          <h4><CalendarClock className="icon" aria-hidden="true" />{t("timeline")}</h4>
          <ol>{life.map((e) => {
            const Icon = (e.kind === "marriage" && e.divorced) || e.tag === "DIV" ? HeartCrack : ICONS[e.kind];
            return <li key={e.key} className={`tl-${e.kind}`}>
              <span className="tl-dot" aria-hidden="true" />
              <Icon className="icon tl-icon" aria-hidden="true" />
              <div className="tl-body">
                {e.date && <div className="tl-date">{formatDate(e.date, true, lang)}
                  {e.age !== null && <span className="muted"> · {fmt(t("ageAt"), { n: e.age })}</span>}</div>}
                <div className="tl-what">
                  {label(e.kind, !!e.date, e.other, e.title, e.tag)}
                  {e.other && <>: {link(e.other, e.kind === "marriage")}</>}
                  {e.detail && <>: {e.detail}</>}
                  {e.divorced && <span className="muted"> · {TEXTS[lang].divorced}</span>}
                  {e.place && <span className="muted"> · {e.place}</span>}
                  {e.coords && <a className="map-link" href={mapUrl(e.coords)} target="_blank" rel="noopener noreferrer"
                                  title={t("showOnMap")} aria-label={t("showOnMap")}>
                    <MapPin className="icon" aria-hidden="true" /></a>}
                </div>
                {e.witnesses && <div className="tl-details"><span>{t("witnesses")}:</span>{" "}
                  {e.witnesses.map((w, i) => <span key={w}>{i > 0 && ", "}{link(w, false)}</span>)}</div>}
                {e.details && <div className="tl-details">{e.details.map((d) => <div key={d.key}>
                  <span>{t(DETAIL_KEYS[d.key])}:</span> {d.value}</div>)}</div>}
                {(() => { const a = extras(e.kind, e.key, e.node); return a && <EventSources a={a} t={t} />; })()}
              </div>
            </li>;
          })}</ol>
        </section>}
        {p.religion && <Fact icon={Church} label={t("religion")}><div className="fact-value">{p.religion}</div></Fact>}
        {f && f.occupations.length > 0 && <Fact icon={Briefcase} label={t("occupation")}>
          {f.occupations.map((o) => <div key={o.origin}>
            <div className="fact-value">{o.value}</div>{when(o)}
          </div>)}
        </Fact>}
        {!f && p.occupation && <Fact icon={Briefcase} label={t("occupation")}>
          <div className="fact-value">{p.occupation}</div></Fact>}
        {record && personAttributes(record).map((a, i) => <Fact key={i} icon={ATTRIBUTE_ICONS[a.tag] || Tag}
                                                              label={t(`attr${a.tag}` as StringKey)}>
          {a.value && <div className="fact-value">{a.value}</div>}{when(a)}
        </Fact>)}
        {(() => {
          const roleText = (r: string) => r === "godparent" ? t("roleGodparent") : r === "witness" ? t("roleWitness")
            : r ? r[0].toUpperCase() + r.slice(1) : t("associations");
          const rows = [...(record ? associationsOf(record) : []).map((a) => ({ ...a, inbound: false })),
                        ...inbound.map((a) => ({ ...a, inbound: true }))].filter((a) => a.id in data.people);
          return rows.length > 0 && <Fact icon={Handshake} label={t("associations")}>
            <ul>{rows.map((a, i) => <li key={i}>
              <span className="muted">{roleText(a.role)}{a.inbound ? ` ${t("assocFor")}` : ""}:</span> {link(a.id, false)}
            </li>)}</ul>
          </Fact>;
        })()}
        {f?.note && <Fact icon={StickyNote} label={t("note")}><div className="note-text"><Linked text={f.note} /></div></Fact>}
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
