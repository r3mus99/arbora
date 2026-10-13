import { CalendarRange, GitBranch, Hourglass, House, MapPin, ShieldAlert, ShieldCheck, Tag, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { GedcomData } from "../core/gedcom";
import type { Count, Overview as Stats } from "../core/stats";
import type { StringKey } from "./i18n";
import { PanelHead } from "./PanelHead";

interface Props {
  stats: Stats;
  data: GedcomData;
  /** what the file check found: issues and groups of surname and place spellings */
  problems: { issues: number; surname: number; place: number };
  onProblems: () => void;
  onPerson: (id: string) => void;
  onSurname: (surname: string) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

function Tile({ icon, label, value, sub, onClick, title }:
              { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void; title?: string }) {
  const body = <>
    <span className="ov-icon">{icon}</span>
    <span className="ov-body">
      <span className="ov-label">{label}</span>
      <span className="ov-value">{value}</span>
      {sub && <span className="ov-sub">{sub}</span>}
    </span>
  </>;
  return onClick
    ? <button type="button" className="ov-tile" onClick={onClick} title={title}>{body}</button>
    : <div className="ov-tile">{body}</div>;
}

/** Ranked list with a bar for each count. */
function Ranking({ icon, label, items, onPick, tip }:
                 { icon: ReactNode; label: string; items: Count[]; onPick?: (v: string) => void; tip?: string }) {
  if (!items.length) return null;
  const most = items[0].count;
  return (
    <div className="ov-rank">
      <h3>{icon}{label}</h3>
      <ol>{items.map((c) => {
        const inner = <>
          <span className="ov-name">{c.value}</span><span className="ov-count">{c.count}</span>
          <span className="ov-bar" style={{ width: `${(100 * c.count) / most}%` }} />
        </>;
        return <li key={c.value}>{onPick
          ? <button type="button" onClick={() => onPick(c.value)} title={tip}>{inner}</button>
          : <div>{inner}</div>}</li>;
      })}</ol>
    </div>
  );
}

/** Counts and most common names and places of the loaded file, shown after it is opened. */
export function Overview({ stats: s, data, problems: found, onProblems, onPerson, onSurname, t }: Props) {
  const problems = found.issues + found.surname + found.place;
  const parts = ([["tabIssues", found.issues], ["tabSurnames", found.surname], ["tabPlaces", found.place]] as const)
    .filter(([, n]) => n).map(([key, n]) => `${t(key).toLowerCase()} ${n}`).join(" · ");
  const oldest = s.oldest && data.people[s.oldest.id];
  const span = s.firstYear === null ? "–" : s.firstYear === s.lastYear ? String(s.firstYear) : `${s.firstYear}–${s.lastYear}`;
  return (
    <section className="panel-col overview" aria-label={t("overview")}>
      <PanelHead title={t("overview")} />
      <div className="panel-body">
      <div className="ov-tiles">
        <Tile icon={<Users className="icon" aria-hidden="true" />} label={t("ovPeople")} value={s.people}
              sub={t("ovSex", { m: s.men, f: s.women })} />
        <Tile icon={<House className="icon" aria-hidden="true" />} label={t("ovFamilies")} value={s.families} />
        <Tile icon={<GitBranch className="icon" aria-hidden="true" />} label={t("ovGens")} value={s.generations}
              sub={t("ovGensSub")} />
        <Tile icon={<CalendarRange className="icon" aria-hidden="true" />} label={t("ovSpan")} value={span}
              sub={t("ovSpanSub")} />
        {oldest && <Tile icon={<Hourglass className="icon" aria-hidden="true" />} label={t("ovOldest")}
                         value={<span className="ov-person">{oldest.name || "?"}</span>} sub={`* ${s.oldest!.year}`}
                         onClick={() => onPerson(oldest.id)} title={t("makeRoot")} />}
        <Tile icon={problems ? <ShieldAlert className="icon warn" aria-hidden="true" />
                             : <ShieldCheck className="icon" aria-hidden="true" />}
              label={t("ovProblems")} value={problems || t("ovNone")} sub={parts || undefined}
              onClick={problems ? onProblems : undefined} title={problems ? t("check") : undefined} />
      </div>
      <div className="ov-ranks">
        <Ranking icon={<Tag className="icon" aria-hidden="true" />} label={t("ovSurnames")} items={s.surnames}
                 onPick={onSurname} tip={t("ovSurnameTip")} />
        <Ranking icon={<MapPin className="icon" aria-hidden="true" />} label={t("ovPlaces")} items={s.places} />
      </div>
      </div>
    </section>
  );
}
