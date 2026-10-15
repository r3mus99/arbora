import { CircleAlert, ShieldCheck, TriangleAlert, WandSparkles } from "lucide-react";
import type { Issue } from "../core/check";
import type { GedcomData } from "../core/gedcom";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";

interface Props {
  issues: Issue[];
  data: GedcomData;
  onFocus: (id: string) => void;
  /** repair one issue (only those marked fixable) */
  onFix: (issue: Issue) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** names of the events a date belongs to, the GEDCOM tag otherwise */
const EVENT: Record<string, StringKey> = {
  BIRT: "thBirth", CHR: "christening", DEAT: "thDeath", BURI: "burial", MARR: "marriage", OCCU: "occupation",
};
const WHO = "\u0000who\u0000", OTHER = "\u0000other\u0000";

/** The file check: problems found; the people in them are links. */
export function CheckPanel({ issues, data, onFocus, onFix, t }: Props) {
  const person = (id: string | null | undefined, key: string) => {
    const p = id ? data.people[id] : null;
    if (!p) return <span key={key}>{id ? id.replace(/@/g, "") : "?"}</span>;
    return <button key={key} type="button" className="link" onClick={() => onFocus(p.id)}>{p.name || "?"}</button>;
  };
  const message = (i: Issue) => {
    const a = i.args;
    const family = a.id && data.families[a.id];
    const text = t(i.kind as StringKey, {
      ...a, id: (a.id || "").replace(/@/g, ""), value: a.value || "",
      event: EVENT[a.tag] ? t(EVENT[a.tag]) : a.tag, who: WHO, other: OTHER,
    });
    // eslint-disable-next-line no-control-regex -- the markers are NUL characters on purpose, never in a text
    return text.split(/(\u0000who\u0000|\u0000other\u0000)/).map((part, k) => {
      if (part === WHO) {
        return family ? <button key={k} type="button" className="link" disabled={!i.person}
                                onClick={() => i.person && onFocus(i.person)}>
          {t("family", { id: a.id.replace(/@/g, "") })}</button> : person(a.id, String(k));
      }
      if (part === OTHER) return person(a.other, String(k));
      return part;
    });
  };
  // errors first
  const sorted = [...issues].sort((x, y) => (x.level === y.level ? 0 : x.level === "error" ? -1 : 1));

  return (
    <section className="check" aria-label={t("check")}>
      <PanelHead className="check-head" title={t("check")} />
      <div className="check-body">
      {(issues.length === 0 ? <p className="check-ok"><ShieldCheck className="icon" aria-hidden="true" />{t("checkOk")}</p> : <>
        <ul>{sorted.map((i, k) => <li key={k} className={i.level}>
          {i.level === "error" ? <CircleAlert className="icon" aria-hidden="true" />
                               : <TriangleAlert className="icon" aria-hidden="true" />}
          <span>{message(i)}</span>
          {i.fixable && <button type="button" className="icon-btn fix" onClick={() => onFix(i)}
                                title={t("fix")} aria-label={t("fix")}>
            <WandSparkles className="icon" aria-hidden="true" /></button>}
        </li>)}</ul>
      </>)}
      </div>
    </section>
  );
}
