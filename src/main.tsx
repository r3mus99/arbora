import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { TreeIllustration } from "./ui/TreeIllustration";
import "@fontsource/spectral/600.css";
import "./ui/styles.css";
import { applyTheme, chosenTheme } from "./ui/theme";

const App = lazy(() => import("./ui/App").then((m) => ({ default: m.App })));

// before the first render, so the page does not flash in the wrong theme
applyTheme(chosenTheme());

createRoot(document.getElementById("root")!).render(<StrictMode>{new URLSearchParams(location.search).has("tree") ? <TreeIllustration /> : <Suspense><App /></Suspense>}</StrictMode>);
