import { useState, type DragEvent, type ReactNode } from "react";

interface Props {
  /** class names of the box, "over" is added while a file is dragged over it */
  className: string;
  title?: string;
  onFile: (file: File | undefined) => void;
  children: ReactNode;
}

/** A box that takes a GEDCOM file by click (the file dialog) or by dropping it. */
export function FileDrop({ className, title, onFile, children }: Props) {
  const [over, setOver] = useState(false);
  const drag = (e: DragEvent, on: boolean) => { e.preventDefault(); setOver(on); };
  return (
    <label className={over ? `${className} over` : className} title={title}
           onDragEnter={(e) => drag(e, true)} onDragOver={(e) => drag(e, true)} onDragLeave={(e) => drag(e, false)}
           onDrop={(e) => { drag(e, false); onFile(e.dataTransfer.files[0]); }}>
      <input type="file" accept=".ged,.GED,.gedcom,text/plain" hidden
             onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {children}
    </label>
  );
}
