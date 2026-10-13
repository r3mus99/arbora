import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import "@fontsource/spectral/600.css";
import "./ui/styles.css";
import { applyTheme, chosenTheme } from "./ui/theme";

// before the first render, so the page does not flash in the wrong theme
applyTheme(chosenTheme());

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
