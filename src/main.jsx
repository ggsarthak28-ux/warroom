import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

window.addEventListener("error", (event) => {
  console.error("Global App Error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promise Error:", event.reason);
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
