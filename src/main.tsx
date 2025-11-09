// CRITICAL: Import react-init FIRST to ensure React is globally available
// This MUST execute before any other code, including vendor chunks
import "./react-init";

// Ensure React is set up synchronously before any async imports
// This is a critical step to prevent "React.Children is undefined" errors
if (typeof window !== "undefined") {
  // Double-check that React is available
  if (!(window as any).React || !(window as any).React.Children) {
    // If React isn't available, import it directly
    import("react").then((ReactModule) => {
      (window as any).React = ReactModule;
      if (ReactModule.Children) {
        (window as any).React.Children = ReactModule.Children;
        (window as any).__REACT_CHILDREN__ = ReactModule.Children;
      }
    });
  }
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
