// Ensure React is loaded first before any other imports
import "react";
import "react-dom";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
