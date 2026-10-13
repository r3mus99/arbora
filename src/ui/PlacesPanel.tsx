import { ListFilter, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import type { GedcomData } from "../core/gedcom";
import { fold } from "../core/gedcom";
import type { PlaceEntry } from "../core/placelist";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";
import { People } from "./SourcesPanel";

interface Props {
  places: PlaceEntry[];
  data: GedcomData;
  onPerson: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** Every place of the file with its people and events, read-only; a click on a place shows its people. */
export function PlacesPanel({ places, data, onPerson, t }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const q = fold(query.trim());
  const shown = useMemo(() => places.filter((p) => !q || fold(p.name).includes(q)), [places, q]);
  // the house number of each person at the open place
  const houses = useMemo(() => {
    const out: Record<string, string> = {};
    const entry = places.find((p) => p.name === open);
    if (entry) for (const [house, ids] of entry.houses) for (const id of ids) out[id] = out[id] ? `${out[id]}, ${house}` : house;
    return out;
  }, [places, open]);

  return (
    <section className="panel-col sp" aria-label={t("places")}>
      <PanelHead title={t("places")} />
      {!places.length ? <p className="sp-none panel-body">{t("placesEmpty")}</p> : <>
        <div className="finder">
          <ListFilter className="icon" aria-hidden="true" />
          <input type="search" placeholder={t("srcFilter")} autoComplete="off" value={query}
                 onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }} />
        </div>
        <ul className="sp-list panel-body">
          {shown.map((p) => (
            <li key={p.name} className={open === p.name ? "open" : undefined}>
              <button type="button" className="sp-row" aria-expanded={open === p.name} onClick={() => setOpen(open === p.name ? null : p.name)}>
                <MapPin className="icon" aria-hidden="true" />
                <span className="sp-main">
                  <span className="sp-title">{p.name}</span>
                  <span className="sp-sub">{t("srcPeople", { n: p.people.length })} · {t("placeEvents", { n: p.events })}</span>
                </span>
              </button>
              {open === p.name && <div className="sp-more"><People ids={p.people} data={data} onPerson={onPerson} t={t} notes={houses} /></div>}
            </li>
          ))}
          {!shown.length && <li className="sp-none">{t("srcNothing")}</li>}
        </ul>
      </>}
    </section>
  );
}
