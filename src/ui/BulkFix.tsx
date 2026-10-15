import { ArrowRight, Eye, EyeOff, MapPin, Search, SpellCheck, Tag, TriangleAlert, User } from "lucide-react";
import { useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { keptByDefault, type VariantGroup, type VariantKind } from "../core/variants";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";

type T = (key: StringKey, vars?: Record<string, string | number>) => string;
type Tab = VariantKind | "hidden";

interface Props {
  data: GedcomData;
  /** groups of spellings of one surname, given name or place, and every spelling in the file */
  variants: Record<VariantKind, VariantGroup[]>;
  values: Record<VariantKind, string[]>;
  /** keys of the groups marked "not the same" */
  hidden: Set<string>;
  onRename: (kind: VariantKind, from: string[], to: string) => void;
  onHide: (key: string, hide: boolean) => void;
  onFocus: (id: string) => void;
  /** surnames: keep the old spelling as another name of the person (TYPE aka) */
  keepAka: boolean;
  onKeepAka: (on: boolean) => void;
  t: T;
}

/** Records shown in the preview of one group, the rest is only counted. */
const PREVIEW = 8;

/** A person, or a family as its husband or wife, as a link. */
function RecordLink({ id, data, onFocus, t }: { id: string; data: GedcomData; onFocus: (id: string) => void; t: T }) {
  const person = data.people[id];
  const family = data.families[id];
  const target = person ? id : family ? family.husb || family.wife : null;
  const label = person ? person.name || "?" : t("family", { id: id.replace(/@/g, "") });
  return target ? <button type="button" className="link person" onClick={() => onFocus(target)}>{label}</button>
                : <span>{label}</span>;
}

const groupName = (g: VariantGroup) => g.variants[0].value;
const groupCount = (g: VariantGroup) => new Set(g.variants.flatMap((v) => v.records)).size;

/** One group: the spelling that stays, which others are replaced, and the records that change. */
function Detail({ group, listId, data, onRename, onHide, onFocus, keepAka, onKeepAka, t }:
                { group: VariantGroup; listId: string } & Pick<Props, "data" | "onRename" | "onHide" | "onFocus" | "keepAka" | "onKeepAka" | "t">) {
  const [target, setTarget] = useState(group.variants[0].value);
  const [kept, setKept] = useState<Set<string>>(() => keptByDefault(group, group.variants[0].value));
  const to = target.trim();
  const replaced = group.variants.filter((v) => v.value !== to && !kept.has(v.value));
  const affected = [...new Set(replaced.flatMap((v) => v.records))];
  const origin = new Map(replaced.flatMap((v) => v.records.map((id) => [id, v.value] as const)));
  const pick = (value: string) => { setTarget(value); setKept((k) => { const n = new Set(k); n.delete(value); return n; }); };
  const toggle = (value: string, replace: boolean) =>
    setKept((k) => { const n = new Set(k); if (replace) n.delete(value); else n.add(value); return n; });
  const otherCountry = (v: VariantGroup["variants"][number]) =>
    group.kind === "place" && !!v.country && group.variants.some((x) => x.value === to && x.country && x.country !== v.country);

  return (
    <div className="bulk-detail">
      <div className="bulk-scroll">
        <div className="bulk-block">
          <div className="bulk-label">{t("bulkTarget")}</div>
          <input type="text" className="bulk-target" value={target} list={listId} aria-label={t("bulkTarget")}
                 onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="bulk-block">
          <div className="bulk-label">{t("bulkSpellings")}</div>
          <div className="bulk-table">{group.variants.map((v) => {
            const isTarget = v.value === to, on = !isTarget && !kept.has(v.value);
            return <div key={v.value} className={`bulk-row${isTarget ? " target" : on ? "" : " kept"}`}>
              <input type="radio" name="bulk-target" checked={isTarget} onChange={() => pick(v.value)}
                     aria-label={t("pickVariant")} />
              <span className="bulk-sp">{v.value}{otherCountry(v) &&
                <span className="chip warn"><TriangleAlert className="icon" aria-hidden="true" />{t("bulkOtherCountry")}</span>}</span>
              <label className="bulk-n"><input type="checkbox" checked={on} disabled={isTarget}
                     onChange={(e) => toggle(v.value, e.target.checked)} aria-label={t("keepVariant")} />{v.records.length}</label>
              <span className="bulk-state">{t(isTarget ? "bulkStateTarget" : on ? "bulkStateReplace" : "bulkStateKeep")}</span>
            </div>;
          })}</div>
        </div>
        {group.kind === "surname" && <div className="bulk-block">
          <label className="keep-aka">
            <input type="checkbox" checked={keepAka} onChange={(e) => onKeepAka(e.target.checked)} />
            <span>{t("keepAka")}</span></label>
        </div>}
        <div className="bulk-block">
          <div className="bulk-label">{t("bulkPreview", { n: affected.length })}</div>
          {affected.length === 0 ? <p className="bulk-hint">{t("bulkNothing")}</p> : <ul className="bulk-people">
            {affected.slice(0, PREVIEW).map((id) => <li key={id}>
              <RecordLink id={id} data={data} onFocus={onFocus} t={t} />
              <span className="bulk-change"><del>{origin.get(id)}</del> <ArrowRight className="icon" aria-hidden="true" /> <ins>{to}</ins></span>
            </li>)}
            {affected.length > PREVIEW && <li className="bulk-more">{t("bulkMore", { n: affected.length - PREVIEW })}</li>}
          </ul>}
        </div>
      </div>
      <div className="bulk-foot">
        <span className="bulk-sum">{t("affected", { n: affected.length })}</span>
        <button type="button" onClick={() => onHide(group.key, true)}>
          <EyeOff className="icon" aria-hidden="true" />{t("hideGroup")}</button>
        <button type="button" className="primary" disabled={!to || !replaced.length}
                onClick={() => onRename(group.kind, replaced.map((v) => v.value), to)}>
          <SpellCheck className="icon" aria-hidden="true" />{t("bulkMerge", { to, n: affected.length })}</button>
      </div>
    </div>
  );
}

/** Bulk fix of spellings, a tool panel across the whole width: tabs, groups of one tab, the open group. */
export function BulkFix({ data, variants, values, hidden, onRename, onHide, onFocus, keepAka, onKeepAka, t }: Props) {
  const shown = (kind: VariantKind) => variants[kind].filter((g) => !hidden.has(g.key));
  const hiddenGroups = [...variants.surname, ...variants.given, ...variants.place].filter((g) => hidden.has(g.key));
  const counts: Record<Tab, number> = { surname: shown("surname").length, given: shown("given").length, place: shown("place").length, hidden: hiddenGroups.length };
  const [tab, setTab] = useState<Tab>(() => (["surname", "given", "place", "hidden"] as Tab[]).find((k) => counts[k]) || "surname");
  const [find, setFind] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const kind: VariantKind = tab === "place" || tab === "given" ? tab : "surname";
  const list = tab === "hidden" ? hiddenGroups : shown(kind);
  const q = find.trim().toLowerCase();
  const filtered = q ? list.filter((g) => g.variants.some((v) => v.value.toLowerCase().includes(q))) : list;
  const group = tab === "hidden" ? undefined : filtered.find((g) => g.key === open) || filtered[0];
  const listId = `bulk-${kind}`;
  const known = values[kind].includes(from.trim());
  const tabs: [Tab, StringKey, typeof Tag][] = [["surname", "tabSurnames", Tag], ["given", "tabGivenNames", User], ["place", "tabPlaces", MapPin], ["hidden", "tabHidden", EyeOff]];

  return (
    <section className="bulk" aria-label={t("batchRename")}>
      <PanelHead className="bulk-head" title={t("batchRename")}><span className="bulk-save">{t("bulkSaveHint")}</span></PanelHead>
      <div className="check-tabs" role="tablist" aria-orientation="vertical">{tabs.map(([key, label, Icon]) =>
        <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "on" : ""}
                onClick={() => { setTab(key); setFind(""); }}>
          <Icon className="icon" aria-hidden="true" />{t(label)}<span className={counts[key] ? "n" : "n zero"}>{counts[key]}</span></button>)}
        <p className="bulk-hint">{t(tab === "place" ? "variantsPlace" : tab === "given" ? "variantsGiven" : "variantsSurname")}</p>
      </div>
      <div className="bulk-list">
        <div className="finder"><Search className="icon" aria-hidden="true" />
          <input type="search" value={find} placeholder={t("bulkFind")} aria-label={t("bulkFind")} onChange={(e) => setFind(e.target.value)} /></div>
        <div className="panel-body">
          {filtered.length === 0 ? <p className="bulk-empty">{t("noVariants")}</p>
            : filtered.map((g) => <div key={g.key} className={`bulk-group${group === g ? " sel" : ""}`}>
              <button type="button" className="bulk-pick" disabled={tab === "hidden"} onClick={() => setOpen(g.key)}>
                <span className="bulk-name">{groupName(g)}<span className="bulk-count">{groupCount(g)}</span></span>
                <span className="bulk-others">{g.variants.slice(1).map((v) => `${v.value} ${v.records.length}`).join(" · ")}</span>
              </button>
              {tab === "hidden" && <button type="button" className="icon-btn" onClick={() => onHide(g.key, false)}
                                           title={t("unhideGroup")} aria-label={t("unhideGroup")}>
                <Eye className="icon" aria-hidden="true" /></button>}
            </div>)}
        </div>
        {tab !== "hidden" && <form className="bulk-batch" onSubmit={(e) => {
          e.preventDefault();
          if (!known || !to.trim()) return;
          onRename(kind, [from.trim()], to);
          setFrom(""); setTo("");
        }}>
          <datalist id={listId}>{values[kind].map((v) => <option key={v} value={v} />)}</datalist>
          <input type="text" value={from} list={listId} placeholder={t("batchFrom")} aria-label={t("batchFrom")}
                 onChange={(e) => setFrom(e.target.value)} />
          <input type="text" value={to} list={listId} placeholder={t("batchTo")} aria-label={t("batchTo")}
                 onChange={(e) => setTo(e.target.value)} />
          <button type="submit" disabled={!known || !to.trim() || from.trim() === to.trim()}>
            <SpellCheck className="icon" aria-hidden="true" />{t("unify")}</button>
        </form>}
      </div>
      {group ? <Detail key={group.key} group={group} listId={listId} data={data} onRename={onRename} onHide={onHide}
                       onFocus={onFocus} keepAka={keepAka} onKeepAka={onKeepAka} t={t} />
        : <div className="bulk-detail"><p className="bulk-empty">{t(tab === "hidden" ? "bulkHiddenHint" : "noVariants")}</p></div>}
    </section>
  );
}
