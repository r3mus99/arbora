import type { ReactNode } from "react";

/**
 * The title row of a tool panel. It is fixed at the top of the panel (the body below it scrolls), as high as the
 * header rows of the chart and of the person detail, so the three columns share one line. Every panel of the
 * tool bar uses it; do not write a title row of your own.
 */
export function PanelHead({ title, className, children }: { title: ReactNode; className?: string; children?: ReactNode }) {
  return <div className={`panel-head${className ? ` ${className}` : ""}`}><h2>{title}</h2>{children}</div>;
}
