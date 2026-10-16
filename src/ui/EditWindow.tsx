import { Check, X } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import type { GedNode, GedcomData } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { Suggestions } from "../core/edit";
import { SECTIONS } from "./editSections";
import { mayClose } from "./editWindow";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { EDITOR_FORM, PersonEditor } from "./PersonEditor";
import { Section } from "./Section";

interface Props {
  data: GedcomData;
  /** the person's name for the heading */
  name: string;
  /** the person's record and the records of the families where they are a spouse */
  record: GedNode;
  families: GedNode[];
  lang: Lang;
  suggest: Suggestions;
  /** the changed records (one undo step); the window closes after it */
  onSave: (changed: GedNode[]) => void;
  /** the window closes; nothing is changed in the file */
  onClose: () => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** a part of the window the user may not reach now, e.g. a wide tool panel is open */
  hidden?: boolean;
}

/**
 * The edit window of a person (docs/design-guidelines.md, section 7). It lies over the right half of the viewer, so
 * the tree stays visible on the left; the pencil in the person detail opens it. The form is split into the parts of
 * a person (name, basic facts, events, …); Esc, the X and Cancel ask before they drop changes.
 */
export function EditWindow({ data, name, record, families, lang, suggest, onSave, onClose, t, hidden }: Props) {
  const [dirty, setDirty] = useState(false);
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
          <button type="button" className="icon-btn" onClick={close} title={`${t("editClose")} (Esc)`} aria-label={t("editClose")}>
            <X className="icon" aria-hidden="true" /></button>
        </div>
      </PanelHead>
      <div className="panel-body edit-body">
        <PersonEditor data={data} record={record} families={families} lang={lang} suggest={suggest}
                      onSave={onSave} onCancel={close} onDirty={setDirty} t={t} />
        {/* parts that come with the next versions */}
        {(["parents", "other"] as const).map((key) => <Section key={key} icon={SECTIONS[key].icon} title={t(SECTIONS[key].title)}>
          <p className="muted">{t("esSoon")}</p>
        </Section>)}
      </div>
      <div className="edit-foot">
        <span className="bulk-sum" role="status">{dirty ? t("unsaved") : ""}</span>
        <button type="button" onClick={close}>{t("cancel")}</button>
        <button type="submit" form={EDITOR_FORM} className="primary" disabled={!dirty} title="Ctrl+Enter">
          <Check className="icon" aria-hidden="true" />{t("save")}</button>
      </div>
    </section>
  </div>;
}
