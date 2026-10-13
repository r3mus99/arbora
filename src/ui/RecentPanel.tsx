import type { GedcomData } from "../core/gedcom";
import type { Lang } from "../core/texts";
import type { StringKey } from "./i18n";
import type { Entry } from "./marks";
import { PanelHead } from "./PanelHead";
import { PersonRow } from "./PersonRow";

interface Props {
  entries: Entry[];
  data: GedcomData;
  lang: Lang;
  selectedId: string | null;
  onPerson: (id: string) => void;
  onStar: (id: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

/** Favourite people on top, then the most recently visited ones; a click opens a person, the star marks a favourite. */
export function RecentPanel({ entries, data, lang, selectedId, onPerson, onStar, t }: Props) {
  return (
    <section className="panel-col" aria-label={t("recent")}>
      <PanelHead title={t("recent")} />
      {!entries.length ? <p className="sp-none panel-body">{t("recentEmpty")}</p> : <ul className="rail panel-body">
        {entries.map(({ id, fav }) => (
          <PersonRow key={id} person={data.people[id]} lang={lang} selected={id === selectedId} favourite={fav}
                     onSelect={onPerson} onStar={onStar} t={t} />
        ))}
      </ul>}
    </section>
  );
}
