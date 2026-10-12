import { CircleAlert, EyeOff, MapPin, ShieldCheck, Tag, TriangleAlert, WandSparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Issue } from "../core/check";
import type { GedcomData } from "../core/gedcom";
import type { VariantGroup, VariantKind } from "../core/variants";
import type { StringKey } from "./i18n";
import { Variants } from "./Variants";

export type CheckTab = "issues" | "surname" | "place" | "hidden";

interface Props {
  issues: Issue[];
  data: GedcomData;
  onFocus: (id: string) => void;
  /** repair one issue (only those marked fixable) */
  onFix: (issue: Issue) => void;
  onClose: () => void;
  /** bulk fix: groups of spellings of one surname or place, and every spelling in the file */
  variants: Record<VariantKind, VariantGroup[]>;
  values: Record<VariantKind, string[]>;
  /** keys of the groups marked "not the same" */
  hidden: Set<string>;
  onRename: (kind: VariantKind, from: string[], to: string) => void;
  onHide: (key: string, hide: boolean) => void;
  keepAka: boolean;
  onKeepAka: (on: boolean) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** names of the events a date belongs to, the GEDCOM tag otherwise */
const EVENT: Record<string, StringKey> = {
  BIRT: "thBirth", CHR: "christening", DEAT: "thDeath", BURI: "burial", MARR: "marriage", OCCU: "occupation",
};
const WHO = "\u0000who\u0000", OTHER = "\u0000other\u0000";

/** The file check: problems found (people in them are links) and the bulk fix of spellings. */
export function CheckPanel({ issues, data, onFocus, onFix, onClose, variants, values, hidden, onRename, onHide,
                            keepAka, onKeepAka, t }: Props) {
  const shown = (kind: VariantKind) => variants[kind].filter((g) => !hidden.has(g.key));
  const hiddenGroups = (kind: VariantKind) => variants[kind].filter((g) => hidden.has(g.key));
  const counts: Record<CheckTab, number> = {
    issues: issues.length, surname: shown("surname").length, place: shown("place").length,
    hidden: hiddenGroups("surname").length + hiddenGroups("place").length,
  };
  const [tab, setTab] = useState<CheckTab>(() =>
    (["issues", "surname", "place"] as CheckTab[]).find((k) => counts[k]) || "issues");

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

  const tabs: [CheckTab, StringKey, ReactNode][] = [
    ["issues", "tabIssues", <TriangleAlert className="icon" aria-hidden="true" />],
    ["surname", "tabSurnames", <Tag className="icon" aria-hidden="true" />],
    ["place", "tabPlaces", <MapPin className="icon" aria-hidden="true" />],
    ["hidden", "tabHidden", <EyeOff className="icon" aria-hidden="true" />],
  ];
  const common = { data, onRename, onHide, onFocus, keepAka, onKeepAka, t };

  return (
    <section className="check" aria-label={t("check")}>
      <div className="check-head">
        <div className="check-tabs" role="tablist">{tabs.map(([key, label, icon]) =>
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "on" : ""}
                  onClick={() => setTab(key)}>
            {icon}{t(label)}<span className={counts[key] ? "n" : "n zero"}>{counts[key]}</span></button>)}
        </div>
        <button type="button" className="icon-btn" onClick={onClose} title={t("cancel")} aria-label={t("cancel")}>
          <X className="icon" aria-hidden="true" /></button>
      </div>
      {(tab === "surname" || tab === "place") &&
        <Variants kind={tab} groups={shown(tab)} values={values[tab]} hidden={false} {...common} />}
      {tab === "hidden" && (counts.hidden === 0 ? <p className="hint">{t("noVariants")}</p>
        : (["surname", "place"] as VariantKind[]).filter((k) => hiddenGroups(k).length).map((k) =>
          <Variants key={k} kind={k} groups={hiddenGroups(k)} values={[]} hidden {...common} />))}
      {tab === "issues" && (issues.length === 0 ? <p className="check-ok"><ShieldCheck className="icon" aria-hidden="true" />{t("checkOk")}</p> : <>
        <ul>{sorted.map((i, k) => <li key={k} className={i.level}>
          {i.level === "error" ? <CircleAlert className="icon" aria-hidden="true" />
                               : <TriangleAlert className="icon" aria-hidden="true" />}
          <span>{message(i)}</span>
          {i.fixable && <button type="button" className="icon-btn fix" onClick={() => onFix(i)}
                                title={t("fix")} aria-label={t("fix")}>
            <WandSparkles className="icon" aria-hidden="true" /></button>}
        </li>)}</ul>
      </>)}
    </section>
  );
}
