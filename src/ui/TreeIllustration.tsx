import { posterSvg, POSTER_COLORS } from "../core/poster";
import { buildTreeIllustration } from "../core/treeIllustration";

/** Review page for the static apple tree, opened with `?tree`. */
export function TreeIllustration() {
  const svg = posterSvg(buildTreeIllustration());
  return (
    <div style={{ background: POSTER_COLORS.paper, minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(100vw, 133vh)" }} dangerouslySetInnerHTML={{ __html: svg.replace(/ width="\d+" height="\d+"/, ' width="100%"') }} />
    </div>
  );
}
