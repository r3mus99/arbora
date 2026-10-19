import { mockTreePoster } from "../core/treePoster";

function download() {
  const url = URL.createObjectURL(new Blob([mockTreePoster()], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "apple-tree-poster.svg";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Review page for the mock poster with the hand-drawn apple tree, opened with `?tree`. */
export function TreeIllustration() {
  return (
    <div style={{ background: "#efe3cc", minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <button onClick={download} style={{ position: "fixed", top: 12, right: 12, padding: "8px 14px" }}>Stiahnuť SVG</button>
      <div style={{ width: "min(100vw, 150vh)" }} dangerouslySetInnerHTML={{ __html: mockTreePoster() }} />
    </div>
  );
}
