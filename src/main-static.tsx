import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppStatic } from "./AppStatic";
import "./index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root was not found");
}

// The cPanel build has no cart, so there is no CartProvider here. Layout and the
// menu cards still read cart state; on this build they read the inert stub that
// vite.config.ts resolves in place of the real store.
createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AppStatic />
    </BrowserRouter>
  </StrictMode>,
);
