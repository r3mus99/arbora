import svg from "../assets/apple-tree.svg?raw";

/** Review page for the hand-drawn apple tree, opened with `?tree`. */
export function TreeIllustration() {
  return (
    <div style={{ background: "#efe3cc", minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(100vw, 150vh)" }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
