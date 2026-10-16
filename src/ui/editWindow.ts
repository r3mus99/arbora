/* Logic of the edit window (EditWindow.tsx): kept free of React so it can be tested. */

/** the parts of a person the window will edit, in this order; each is one later subtask */
export const EDIT_SECTIONS = ["name", "basic", "events", "notes", "families", "parents", "other"] as const;
export type EditSection = (typeof EDIT_SECTIONS)[number];

/** closing needs no question when nothing changed; otherwise the user decides (ask returns true = discard) */
export const mayClose = (dirty: boolean, ask: () => boolean): boolean => !dirty || ask();
