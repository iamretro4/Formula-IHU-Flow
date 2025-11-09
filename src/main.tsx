// Ensure React is loaded and initialized first before any other imports
// This prevents "forwardRef" and "Children" undefined errors in vendor chunks
import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Explicitly ensure React is available globally before rendering
// This ensures React.Children and React.forwardRef are available
// when vendor chunks (like chart-vendor) execute
if (typeof window !== "undefined") {
  (window as any).React = React;
}

createRoot(document.getElementById("root")!).render(<App />);
