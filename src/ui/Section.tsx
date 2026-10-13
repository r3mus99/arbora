import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/*
 * The building blocks of the person detail. Every block of the detail is a Section and every line with an
 * icon is a Row; the sizes, spacing and colours come from the tokens at the top of the detail rules in
 * styles.css (--d-icon, --d-col, --d-gap, --d-section-gap), so a new block looks right without its own CSS.
 *
 *   Section  title row: icon in the icon column, title in the text column, an optional extra on the right
 *   rows     lines that carry their own icon (parents, timeline): the icon sits in the same icon column
 *   body     text without icons (note, employment): starts in the text column, under the title
 */

interface SectionProps {
  icon: LucideIcon;
  title: ReactNode;
  /** something small after the title, such as a count or an "add" button */
  extra?: ReactNode;
  /** the content is made of Rows (with their own icons) instead of plain text */
  rows?: boolean;
  className?: string;
  children?: ReactNode;
}

/** The title row of a section; also the <summary> of a collapsible one. */
export function SectionHead({ icon: Icon, title, extra }: Pick<SectionProps, "icon" | "title" | "extra">) {
  return <>
    <span className="sec-icon"><Icon className="icon" aria-hidden="true" /></span>
    <span className="sec-title">{title}</span>
    {extra && <span className="sec-extra">{extra}</span>}
  </>;
}

export function Section({ icon, title, extra, rows, className, children }: SectionProps) {
  return <section className={`section${className ? ` ${className}` : ""}`}>
    <h4 className="sec-head"><SectionHead icon={icon} title={title} extra={extra} /></h4>
    <div className={rows ? "sec-rows" : "sec-body"}>{children}</div>
  </section>;
}

interface RowProps {
  /** the icon in the icon column; leave out for a line that only needs the indent */
  icon?: LucideIcon;
  /** a CSS class that sets --row-color for the icon */
  tone?: string;
  className?: string;
  children?: ReactNode;
}

/** One line of a section: an icon in the icon column and the content in the text column. */
export function Row({ icon: Icon, tone, className, children }: RowProps) {
  return <div className={`row${tone ? ` ${tone}` : ""}${className ? ` ${className}` : ""}`}>
    <span className="row-icon">{Icon && <Icon className="icon" aria-hidden="true" />}</span>
    <div className="row-body">{children}</div>
  </div>;
}
