import { ArrowRight, Check, ChevronDown, ChevronRight, Eye, EyeOff, SpellCheck, WandSparkles, X } from "lucide-react";
import { useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { keptByDefault, type VariantGroup, type VariantKind } from "../core/variants";
import type { StringKey } from "./i18n";

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

interface Props {
  kind: VariantKind;
  groups: VariantGroup[];
  /** every spelling in the file, for suggestions in the batch rename */
  values: string[];
  data: GedcomData;
  hidden: boolean;
  onRename: (kind: VariantKind, from: string[], to: string) => void;
  onHide: (key: string, hide: boolean) => void;
  onFocus: (id: string) => void;
  /** surnames: keep the old spelling as another name of the person (TYPE aka) */
  keepAka: boolean;
  onKeepAka: (on: boolean) => void;
  t: T;
}

/** A person, or a family as its husband or wife, as a link. */
function RecordLink({ id, data, onFocus, t }: { id: string; data: GedcomData; onFocus: (id: string) => void; t: T }) {
  const person = data.people[id];
  const family = data.families[id];
  const target = person ? id : family ? family.husb || family.wife : null;
  const label = person ? person.name || "?" : t("family", { id: id.replace(/@/g, "") });
  return target ? <button type="button" className="link" onClick={() => onFocus(target)}>{label}</button>
                : <span>{label}</span>;
}

/** One group of spellings: which to keep, which to replace, and the records it changes. */
function Group({ group, data, hidden, onRename, onHide, onFocus, t, listId }:
               Omit<Props, "groups" | "values" | "kind" | "keepAka" | "onKeepAka"> & { group: VariantGroup; listId: string }) {
  const [target, setTarget] = useState(group.variants[0].value);
  const [kept, setKept] = useState<Set<string>>(() => keptByDefault(group, group.variants[0].value));
  const [open, setOpen] = useState(false);
  const replaced = group.variants.filter((v) => v.value !== target.trim() && !kept.has(v.value));
  const affected = [...new Set(replaced.flatMap((v) => v.records))];
  const keep = (value: string, on: boolean) => {
    const next = new Set(kept);
    if (on) next.add(value); else next.delete(value);
    setKept(next);
  };

  return (
    <li className="variant">
      <div className="variant-row">
        <span className="chips">{group.variants.map((v) => {
          const chosen = v.value === target.trim(), out = kept.has(v.value);
          return <span key={v.value} className={chosen ? "chip picked" : out ? "chip kept" : "chip replaced"}>
            <button type="button" onClick={() => { setTarget(v.value); keep(v.value, false); }} disabled={hidden}
                    title={t("pickVariant")}>{v.value} <small>{v.records.length}</small></button>
            {!chosen && !hidden && <button type="button" className="chip-x" onClick={() => keep(v.value, !out)}
                                           title={out ? t("pickVariant") : t("keepVariant")}
                                           aria-label={`${out ? t("pickVariant") : t("keepVariant")}: ${v.value}`}>
              {out ? <X className="icon" aria-hidden="true" /> : <Check className="icon" aria-hidden="true" />}</button>}
          </span>;
        })}</span>
        {!hidden && <>
          <ArrowRight className="icon arrow" aria-hidden="true" />
          <input className="target" value={target} list={listId} onChange={(e) => setTarget(e.target.value)}
                 aria-label={t("batchTo")} />
        </>}
        <button type="button" className="affected" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown className="icon" aria-hidden="true" /> : <ChevronRight className="icon" aria-hidden="true" />}
          {t("affected", { n: hidden ? new Set(group.variants.flatMap((v) => v.records)).size : affected.length })}</button>
        <span className="variant-tools">
          <button type="button" className="icon-btn" onClick={() => onHide(group.key, !hidden)}
                  title={hidden ? t("unhideGroup") : t("hideGroup")} aria-label={hidden ? t("unhideGroup") : t("hideGroup")}>
            {hidden ? <Eye className="icon" aria-hidden="true" /> : <EyeOff className="icon" aria-hidden="true" />}</button>
          {!hidden && <button type="button" className="primary unify" disabled={!target.trim() || !replaced.length}
                              onClick={() => onRename(group.kind, replaced.map((v) => v.value), target)}>
            <SpellCheck className="icon" aria-hidden="true" />{t("unify")}</button>}
        </span>
      </div>
      {open && <ul className="affected-list">
        {(hidden ? group.variants : replaced).map((v) => <li key={v.value}>
          <strong>{v.value}</strong>: {v.records.map((id, k) => <span key={id}>{k > 0 && ", "}
            <RecordLink id={id} data={data} onFocus={onFocus} t={t} /></span>)}
        </li>)}
      </ul>}
    </li>
  );
}

/** Spelling variants of surnames or places, with a free "from → to" rename above them. */
export function Variants({ kind, groups, values, data, hidden, onRename, onHide, onFocus, keepAka, onKeepAka, t }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const listId = `variants-${kind}${hidden ? "-hidden" : ""}`;
  const known = values.includes(from.trim());
  return (
    <div className="variants">
      <datalist id={listId}>{values.map((v) => <option key={v} value={v} />)}</datalist>
      {!hidden && <form className="batch" onSubmit={(e) => {
        e.preventDefault();
        if (!known || !to.trim()) return;
        onRename(kind, [from.trim()], to);
        setFrom(""); setTo("");
      }}>
        <WandSparkles className="icon" aria-hidden="true" /><strong>{t("batchRename")}</strong>
        <input value={from} list={listId} placeholder={t("batchFrom")} aria-label={t("batchFrom")}
               onChange={(e) => setFrom(e.target.value)} />
        <ArrowRight className="icon arrow" aria-hidden="true" />
        <input value={to} list={listId} placeholder={t("batchTo")} aria-label={t("batchTo")}
               onChange={(e) => setTo(e.target.value)} />
        <button type="submit" className="primary unify" disabled={!known || !to.trim() || from.trim() === to.trim()}>
          <SpellCheck className="icon" aria-hidden="true" />{t("unify")}</button>
      </form>}
      {!hidden && <p className="hint">{t(kind === "surname" ? "variantsSurname" : "variantsPlace")}</p>}
      {!hidden && kind === "surname" && <label className="keep-aka">
        <input type="checkbox" checked={keepAka} onChange={(e) => onKeepAka(e.target.checked)} />
        <span>{t("keepAka")}</span></label>}
      {groups.length === 0 ? <p className="hint">{t("noVariants")}</p>
        : <ul className="variant-list">{groups.map((g) =>
          <Group key={g.key} group={g} data={data} hidden={hidden} listId={listId}
                 onRename={onRename} onHide={onHide} onFocus={onFocus} t={t} />)}</ul>}
    </div>
  );
}
