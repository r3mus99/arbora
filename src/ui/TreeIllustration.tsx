import { mockTreePoster } from "../core/treePoster";

/** Review page for the mock poster with the hand-drawn apple tree, opened with `?tree`. */
export function TreeIllustration() {
  return (
    <div style={{ background: "#efe3cc", minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(100vw, 150vh)" }} dangerouslySetInnerHTML={{ __html: mockTreePoster() }} />
    </div>
  );
}
