import { BookOpen, CalendarDays, Ellipsis, Link2, Tags, UserRound, Users, type LucideIcon } from "lucide-react";
import type { StringKey } from "./i18n";
import type { EditSection } from "./editWindow";

/** the title and the icon of each part of the edit window; the icons are the ones the detail uses for the same things */
export const SECTIONS: Record<EditSection, { title: StringKey; icon: LucideIcon }> = {
  name: { title: "esName", icon: UserRound },
  basic: { title: "esBasic", icon: Tags },
  events: { title: "esEvents", icon: CalendarDays },
  notes: { title: "esNotes", icon: BookOpen },
  families: { title: "esFamilies", icon: Users },
  parents: { title: "esParents", icon: Link2 },
  other: { title: "esOther", icon: Ellipsis },
};
