import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import "@fontsource/spectral/600.css";
import "./ui/styles.css";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
