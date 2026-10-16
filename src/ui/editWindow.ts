/* Logic of the wide edit window (EditWindow.tsx): kept free of React so it can be tested. */

/** half of the browser width (the tree stays visible) or the whole width right of the tool bar */
export type EditWidth = "half" | "full";

export const otherWidth = (w: EditWidth): EditWidth => (w === "half" ? "full" : "half");

/** the stored choice; anything unknown means half */
export const editWidthOf = (v: unknown): EditWidth => (v === "full" ? "full" : "half");

/** the parts of a person the window will edit, in this order; each is one later subtask */
export const EDIT_SECTIONS = ["name", "basic", "events", "notes", "families", "parents", "other"] as const;
export type EditSection = (typeof EDIT_SECTIONS)[number];

/** closing needs no question when nothing changed; otherwise the user decides (ask returns true = discard) */
export const mayClose = (dirty: boolean, ask: () => boolean): boolean => !dirty || ask();
