import { Check, GitMerge, Trash2, X } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import type { GedNode, GedcomData } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { Suggestions } from "../core/edit";
import type { SourceChoice } from "../core/sources";
import { mayClose } from "./editWindow";
import type { StringKey } from "./i18n";
import { MergePanel } from "./MergePanel";
import type { MergePick } from "../core/merge";
import { PanelHead } from "./PanelHead";
import { EDITOR_FORM, OPEN_AT_START, PersonEditor } from "./PersonEditor";

interface Props {
  data: GedcomData;
  /** the person's name for the heading */
  name: string;
  /** the person's record and the records of the families where they are a spouse */
  record: GedNode;
  families: GedNode[];
  lang: Lang;
  suggest: Suggestions;
  recordOf: (id: string) => GedNode | undefined;
  sources: SourceChoice[];
  /** the changed records (one undo step); the window closes after it */
  onSave: (changed: GedNode[], added?: GedNode[]) => void;
  /** a free ID for a new person, given the IDs already given out in the form */
  allocate: (pending: string[]) => string;
  /** the window closes; nothing is changed in the file */
  onClose: () => void;
  /** the person is deleted with their links (the caller closes the window) */
  onDeletePerson: () => void;
  /** every record of the file, for merging */
  records: GedNode[];
  /** another person is merged into this one (the caller closes the window) */
  onMerge: (dropId: string, pick: MergePick) => void;
  onAddFamily: () => void;
  onDeleteFamily: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** a part of the window the user may not reach now, e.g. a wide tool panel is open */
  hidden?: boolean;
}

/**
 * The edit window of a person (docs/design-guidelines.md, section 7). It lies over the right half of the viewer, so
 * the tree stays visible on the left; the pencil in the person detail opens it. The form is split into the parts of
 * a person (name, basic facts, events, …); Esc, the X and Cancel ask before they drop changes.
 */
export function EditWindow({ data, name, record, families, lang, suggest, recordOf, sources, onSave, allocate, onClose, onDeletePerson, records, onMerge, onAddFamily, onDeleteFamily, t, hidden }: Props) {
  const [dirty, setDirty] = useState(false);
  const [merging, setMerging] = useState(false);
  // the form is rebuilt when the families change; the open parts and the place in the window stay
  const [open, setOpen] = useState<Set<string> | undefined>();
  const body = useRef<HTMLDivElement>(null);
  const scrolled = useRef(0);
  const formKey = families.map((f) => f.xref).join(" ");
  const first = useRef(formKey);
  useLayoutEffect(() => { if (first.current !== formKey && body.current) body.current.scrollTop = scrolled.current; }, [formKey]);
  const close = () => { if (mayClose(dirty, () => window.confirm(t("discard")))) onClose(); };
  const onKey = useEffectEvent((e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); close(); } });
  useEffect(() => {
    const handle = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  return <div className="edit-layer" hidden={hidden}>
    <section className="edit-window" aria-label={name}>
      <PanelHead title={name}>
        <div className="tools">
          <button type="button" className="icon-btn" title={t("mergeWith")} aria-label={t("mergeWith")} aria-pressed={merging}
                  onClick={() => { if (!merging && dirty && !window.confirm(t("discard"))) return; setDirty(false); setMerging(!merging); }}>
            <GitMerge className="icon" aria-hidden="true" /></button>
          <button type="button" className="icon-btn" title={t("deletePerson")} aria-label={t("deletePerson")}
                  onClick={() => { if (window.confirm(t("confirmDeletePerson", { name }))) onDeletePerson(); }}>
            <Trash2 className="icon" aria-hidden="true" /></button>
          <button type="button" className="icon-btn" onClick={close} title={`${t("editClose")} (Esc)`} aria-label={t("editClose")}>
            <X className="icon" aria-hidden="true" /></button>
        </div>
      </PanelHead>
      <div className="panel-body edit-body" ref={body} onScroll={(e) => { scrolled.current = e.currentTarget.scrollTop; }}>
        {merging ? <MergePanel data={data} records={records} keepId={record.xref!} lang={lang} onMerge={onMerge} onCancel={() => setMerging(false)} t={t} /> : <PersonEditor key={formKey} open={open} onToggleSection={(k, on) => setOpen((o) => { const s = new Set(o ?? OPEN_AT_START); if (on) s.add(k); else s.delete(k); return s; })} data={data} record={record} families={families} lang={lang} suggest={suggest} recordOf={recordOf} sources={sources}
                      onSave={onSave} allocate={allocate} onCancel={close} onAddFamily={onAddFamily} onDeleteFamily={onDeleteFamily} onDirty={setDirty} t={t} />}
      </div>
      {!merging && <div className="edit-foot">
        <span className="bulk-sum" role="status">{dirty ? t("unsaved") : ""}</span>
        <button type="button" onClick={close}>{t("cancel")}</button>
        <button type="submit" form={EDITOR_FORM} className="primary" disabled={!dirty} title="Ctrl+Enter">
          <Check className="icon" aria-hidden="true" />{t("save")}</button>
      </div>}
    </section>
  </div>;
}
