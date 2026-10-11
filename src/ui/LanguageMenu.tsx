import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Lang } from "../core/texts";
import { ORDER, STRINGS, flagSvg } from "./i18n";

function Flag({ lang }: { lang: Lang }) {
  return <svg className="flag" viewBox="0 0 30 20" aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: flagSvg(lang) }} />;
}

interface Props {
  lang: Lang;
  label: string;
  onChange: (lang: Lang) => void;
}

/** Flag button with a list of languages. */
export function LanguageMenu({ lang, label, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const items = Array.from(menu.current?.querySelectorAll("button") || []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  };

  const name = STRINGS[lang].name;
  return (
    <div className="lang" ref={root}>
      <button type="button" ref={button} aria-haspopup="listbox" aria-expanded={open}
              title={label} aria-label={`${label}: ${name}`} onClick={() => setOpen(!open)}>
        <Flag lang={lang} /><span className="lname">{name}</span><span className="caret">▾</span>
      </button>
      <ul role="listbox" ref={menu} hidden={!open} onKeyDown={onMenuKey}>
        {ORDER.map((code) => (
          <li key={code}>
            <button type="button" role="option" aria-selected={code === lang}
                    onClick={() => { setOpen(false); onChange(code); button.current?.focus(); }}>
              <Flag lang={code} />{STRINGS[code].name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
