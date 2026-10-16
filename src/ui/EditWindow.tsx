import { BookOpen, CalendarDays, Check, Ellipsis, Link2, Tags, UserRound, Users, X, type LucideIcon } from "lucide-react";
import { useEffect, useEffectEvent } from "react";
import { EDIT_SECTIONS, mayClose, type EditSection } from "./editWindow";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { Section } from "./Section";

/** the section titles and icons; the icons are the ones the detail uses for the same things */
const SECTIONS: Record<EditSection, { title: StringKey; icon: LucideIcon }> = {
  name: { title: "esName", icon: UserRound },
  basic: { title: "esBasic", icon: Tags },
  events: { title: "esEvents", icon: CalendarDays },
  notes: { title: "esNotes", icon: BookOpen },
  families: { title: "esFamilies", icon: Users },
  parents: { title: "esParents", icon: Link2 },
  other: { title: "esOther", icon: Ellipsis },
};

interface Props {
  /** the person's name for the heading */
  name: string;
  /** the window closes; nothing is changed in the file */
  onClose: () => void;
  /** Save: the changes of the sections, as one undo step (the sections come with the next versions) */
  onSave: () => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** a part of the window the user may not reach now, e.g. a wide tool panel is open */
  hidden?: boolean;
}

/**
 * The edit window of a person (docs/design-guidelines.md, section 7). It lies over the right half of the
 * viewer, so the tree stays visible on the left; the pencil in the person detail opens it.
 * It knows whether anything was changed (`dirty`); Esc, the X and Cancel ask before they drop changes.
 */
export function EditWindow({ name, onClose, onSave, t, hidden }: Props) {
  // the sections will set this when their fields change; nothing is editable here yet
  const dirty: boolean = false;
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
        {EDIT_SECTIONS.map((key) => <Section key={key} icon={SECTIONS[key].icon} title={t(SECTIONS[key].title)}>
          <p className="muted">{t("esSoon")}</p>
        </Section>)}
      </div>
      <div className="edit-foot">
        <span className="bulk-sum" role="status">{dirty ? t("unsaved") : ""}</span>
        <button type="button" onClick={close}>{t("cancel")}</button>
        <button type="button" className="primary" disabled={!dirty} onClick={onSave}>
          <Check className="icon" aria-hidden="true" />{t("save")}</button>
      </div>
    </section>
  </div>;
}
