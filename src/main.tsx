// CRITICAL: Import react-init FIRST to ensure React is globally available
// This MUST execute before any other code, including vendor chunks
import "./react-init";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
