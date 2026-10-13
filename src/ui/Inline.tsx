import { useEffect, useRef, useState, type ReactNode } from "react";

/** The click-to-edit pattern of the detail: the value looks like text, a click turns it into fields. */
interface Props {
  /** how the value is shown at rest */
  children: ReactNode;
  /** tooltip and accessible name of the value, e.g. "Edit" */
  label: string;
  /** the fields while editing; call `done()` to commit and `cancel()` to drop */
  edit: (api: { done: () => void; cancel: () => void }) => ReactNode;
  /** called once when editing ends by Enter or by leaving the fields; false = Esc */
  onClose: (commit: boolean) => void;
  className?: string;
}

/**
 * Enter or leaving the group of fields commits, Esc cancels. While open, the fields are in a
 * wrapper that tells blur between moving to another field of the group and leaving it.
 */
export function Inline({ children, label, edit, onClose, className }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const closed = useRef(false);
  useEffect(() => { if (open) { closed.current = false; box.current?.querySelector<HTMLElement>("input,textarea,button")?.focus(); } }, [open]);
  const finish = (commit: boolean) => {
    if (closed.current) return;
    closed.current = true;
    setOpen(false);
    onClose(commit);
  };
  if (!open) {
    return <button type="button" className={`inline-value${className ? ` ${className}` : ""}`} title={label} aria-label={label}
                   onClick={() => setOpen(true)}>{children}</button>;
  }
  return <span ref={box} className={`inline-fields${className ? ` ${className}` : ""}`}
               onKeyDown={(e) => {
                 if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); }
                 else if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement && !e.ctrlKey && !e.metaKey)) {
                   e.preventDefault(); finish(true);
                 }
               }}
               onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node | null)) finish(true); }}>
    {edit({ done: () => finish(true), cancel: () => finish(false) })}
  </span>;
}

/** A name in two fields (given name, surname) edited in place; give it a `key` that changes with the stored name. */
export function InlineName({ given, surname, label, givenLabel, surnameLabel, givens, surnames, onCommit, children }: {
  given: string; surname: string; label: string; givenLabel: string; surnameLabel: string;
  givens: string; surnames: string; onCommit: (given: string, surname: string) => void; children: ReactNode;
}) {
  const [g, setG] = useState(given);
  const [s, setS] = useState(surname);
  return <Inline label={label} className="inline-name" onClose={(ok) => { if (ok) onCommit(g, s); }}
                 edit={() => <>
    <input type="text" value={g} list={givens} aria-label={givenLabel} placeholder={givenLabel}
           size={Math.max(g.length, givenLabel.length - 2, 3)} onChange={(e) => setG(e.target.value)} />
    {" "}
    <input type="text" value={s} list={surnames} aria-label={surnameLabel} placeholder={surnameLabel}
           size={Math.max(s.length, surnameLabel.length - 2, 3)} onChange={(e) => setS(e.target.value)} />
  </>}>
    {children}
  </Inline>;
}

/** One text value (a date, a place) edited in place; `value` is what the field starts with, `children` how it is shown. */
export function InlineText({ value, label, list, onCommit, children }: {
  value: string; label: string; list?: string; onCommit: (value: string) => void; children: ReactNode;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <Inline label={label} onClose={(ok) => { if (ok) onCommit(v); else setV(value); }}
                 edit={() => <input type="text" value={v} list={list} aria-label={label} size={Math.max(v.length, 4)}
                                    onChange={(e) => setV(e.target.value)} />}>
    {children}
  </Inline>;
}
