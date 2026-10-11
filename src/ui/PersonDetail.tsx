import { Crosshair, Pencil } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { formatDate } from "../core/format";
import type { GedEvent, GedcomData, Person } from "../core/gedcom";
import { TEXTS, type Lang } from "../core/texts";
import type { StringKey } from "./i18n";

interface Props {
  data: GedcomData;
  id: string;
  rootId: string;
  lang: Lang;
  onFocus: (id: string) => void;
  onMakeRoot: (id: string) => void;
  onEdit: () => void;
  /** the edit form, shown instead of the facts */
  editor: ReactNode;
  t: (key: StringKey) => string;
}

const SEX: Record<string, string> = { M: "♂", F: "♀" };

/** Facts and close family of one person; relatives are links. */
export function PersonDetail({ data, id, rootId, lang, onFocus, onMakeRoot, onEdit, editor, t }: Props) {
  const p = data.people[id];
  if (!p) return null;
  const event = (ev: GedEvent | null) =>
    ev ? [formatDate(ev.date, true, lang), ev.place].filter(Boolean).join(", ") : "";
  const years = (q: Person) => {
    const b = q.birth ? formatDate(q.birth.date, false, lang) : "";
    const d = q.death ? formatDate(q.death.date, false, lang) : "";
    return b || d ? `${b}–${d}` : "";
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
  const marriages = p.fams.map((f) => data.families[f]).filter(Boolean);
  const facts: [string, string][] = [
    [t("thBirth"), event(p.birth)], [t("thDeath"), event(p.death)], [t("occupation"), p.occupation],
  ];

  return (
    <aside className="detail" aria-live="polite">
      <h3>{p.name || "?"} {SEX[p.sex] && <span className="muted">{SEX[p.sex]}</span>}</h3>
      <p className="id">{p.id.replace(/@/g, "")}</p>
      {editor || <>
        <dl>
          {facts.filter(([, v]) => v).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
        </dl>
        {parents.length > 0 && <>
          <h4>{t("parents")}</h4>
          <ul>{parents.map((pid) => <li key={pid}>{link(pid)}</li>)}</ul>
      </>}
      {marriages.length > 0 && <>
        <h4>{t("spouses")}</h4>
        <ul>{marriages.map((f) => {
          const marr = [event(f.marriage), f.divorced ? TEXTS[lang].divorced : ""].filter(Boolean).join(", ");
          const kids = f.children.filter((c) => c in data.people);
          return <li key={f.id}>
            {link(f.husb === id ? f.wife : f.husb)}
            {marr && <div className="muted">∞ {marr}</div>}
            {kids.length > 0 && <>
              <div className="muted">{t("children")}:</div>
              <ul>{kids.map((c) => <li key={c}>{link(c)}</li>)}</ul>
            </>}
          </li>;
        })}</ul>
      </>}
      <div className="actions">
        <button type="button" onClick={onEdit}><Pencil className="icon" aria-hidden="true" />{t("edit")}</button>
        {id !== rootId && <button type="button" onClick={() => onMakeRoot(id)}>
          <Crosshair className="icon" aria-hidden="true" />{t("makeRoot")}</button>}
      </div>
      </>}
    </aside>
  );
}
