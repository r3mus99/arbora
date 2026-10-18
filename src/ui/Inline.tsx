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

/** A text field exactly as wide as its text: a hidden copy of the text sets the width, the input covers it. */
function FitInput({ value, list, label, tip, onChange }: { value: string; list?: string; label: string; tip?: string; onChange: (v: string) => void }) {
  return <span className="fit">
    <span className="fit-ghost" aria-hidden="true">{value}</span>
    <input type="text" autoComplete="off" value={value} list={list} aria-label={label} title={tip ?? label} onChange={(e) => onChange(e.target.value)} />
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
    <FitInput value={g} list={givens} label={givenLabel} onChange={setG} />
    {" "}
    <FitInput value={s} list={surnames} label={surnameLabel} onChange={setS} />
  </>}>
    {children}
  </Inline>;
}

/** One text value (a date, a place) edited in place; `value` is what the field starts with, `children` how it is shown. */
export function InlineText({ value, label, list, hint, tip, onCommit, children }: {
  value: string; label: string; list?: string; onCommit: (value: string) => void; children: ReactNode;
  /** a line under the field while it is edited, e.g. how a typed date is understood */
  hint?: (typed: string) => { text: string; warn: boolean } | null;
  /** tooltip of the open field, when it says more than the label */
  tip?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <Inline label={label} onClose={(ok) => { if (ok) onCommit(v); else setV(value); }}
                 edit={() => {
                   const h = hint?.(v);
                   return <>
                     <FitInput value={v} list={list} label={label} tip={tip} onChange={setV} />
                     {h && <small className={h.warn ? "inline-hint warn" : "inline-hint"}>{h.text}</small>}
                   </>;
                 }}>
    {children}
  </Inline>;
}

/** A note edited in place: shown as text (links stay clickable), a click opens a text area of the same size. */
export function InlineNote({ value, label, onCommit, className, children }: {
  value: string; label: string; onCommit: (value: string) => void; className?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const done = (ok: boolean) => { setOpen(false); if (ok) onCommit(v); else setV(value); };
  if (!open) {
    return <div className={`${className || ""} inline-note`} title={label} onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) setOpen(true); }}>
      {children}</div>;
  }
  return <textarea autoComplete="off" className={`${className || ""} inline-note-field`} value={v} aria-label={label} autoFocus rows={Math.max(2, v.split("\n").length)}
                   onChange={(e) => setV(e.target.value)} onBlur={() => done(true)}
                   onKeyDown={(e) => {
                     if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); }
                     else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done(true); }
                   }} />;
}
