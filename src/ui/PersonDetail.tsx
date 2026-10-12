import {
  Baby, Briefcase, Check, X, Church, Cross, Crosshair, Droplets, Flower2, Heart, HeartCrack, Mars, Pencil, StickyNote, Users,
  Venus, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { personFields, type EventFields } from "../core/edit";
import { formatDate } from "../core/format";
import type { GedNode, GedcomData, Person } from "../core/gedcom";
import { TEXTS, type Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import { EDITOR_FORM } from "./PersonEditor";

interface Props {
  data: GedcomData;
  id: string;
  /** the person's GEDCOM record, read the same way as the edit form reads it */
  record?: GedNode;
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

/** Facts and close family of one person, in the order of the edit form; relatives are links. */
export function PersonDetail({ data, id, record, rootId, lang, onFocus, onMakeRoot, onEdit, onCancelEdit, editor, t }: Props) {
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
  const link = (pid: string | null) => {
    const q = pid ? data.people[pid] : null;
    if (!q) return <span className="muted">?</span>;
    return <>
      <button className="link" type="button" onClick={() => onFocus(q.id)}>{q.name || "?"}</button>
      {years(q) && <span className="muted"> {years(q)}</span>}
    </>;
  };

  const birthFam = p.famc.length ? data.families[p.famc[0]] : null;
  const parents = birthFam ? [birthFam.husb, birthFam.wife].filter((x): x is string => !!x) : [];
  const marriages = p.fams.map((fid) => data.families[fid]).filter(Boolean);
  const birth = f ? f.birth : p.birth, death = f ? f.death : p.death;
  const deceased = f ? f.deceased : !!p.death;
  const SexIcon = p.sex === "M" ? Mars : p.sex === "F" ? Venus : null;

  return (
    <aside className="detail" aria-live="polite">
      <div className="detail-head">
        <h3>{p.name || "?"}
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
        {when(birth) && <Fact icon={Baby} label={t("thBirth")}>{when(birth)}</Fact>}
        {f && when(f.christening) && <Fact icon={Droplets} label={t("christening")}>{when(f.christening)}</Fact>}
        {p.religion && <Fact icon={Church} label={t("religion")}><div className="fact-value">{p.religion}</div></Fact>}
        {parents.length > 0 && <Fact icon={Users} label={t("parents")}>
          <ul>{parents.map((pid) => <li key={pid}>{link(pid)}</li>)}</ul>
        </Fact>}
        {marriages.map((fam) => {
          const kids = fam.children.filter((c) => c in data.people);
          const m = fam.marriage;
          return <Fact key={fam.id} icon={fam.divorced ? HeartCrack : Heart} label={t("marriage")}>
            <div>{link(fam.husb === id ? fam.wife : fam.husb)}</div>
            {when(m && { date: m.date, place: m.place })}
            {fam.divorced && <div className="muted">{TEXTS[lang].divorced}</div>}
            {kids.length > 0 && <>
              <div className="fact-sub">{t("children")}</div>
              <ul className="kids">{kids.map((c) => <li key={c}>{link(c)}</li>)}</ul>
            </>}
          </Fact>;
        })}
        {f && f.occupations.length > 0 && <Fact icon={Briefcase} label={t("occupation")}>
          {f.occupations.map((o) => <div key={o.origin}>
            <div className="fact-value">{o.value}</div>{when(o)}
          </div>)}
        </Fact>}
        {!f && p.occupation && <Fact icon={Briefcase} label={t("occupation")}>
          <div className="fact-value">{p.occupation}</div></Fact>}
        {f?.note && <Fact icon={StickyNote} label={t("note")}><div className="note-text">{f.note}</div></Fact>}
        {deceased && <Fact icon={Cross} label={when(death) ? t("thDeath")
          : t(p.sex === "M" ? "deceasedM" : p.sex === "F" ? "deceasedF" : "deceased")}>{when(death)}</Fact>}
        {f && when(f.burial) && <Fact icon={Flower2} label={t("burial")}>{when(f.burial)}</Fact>}
      </div>}
    </aside>
  );
}
