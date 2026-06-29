import "./styles.css";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { App } from "./index.js";
import { EditApp } from "./edit.js";
import type { IRPayload } from "@structurizr-presenter/core";

declare global {
  interface Window {
    __SP_IR__?: IRPayload;
    __SP_EDIT__?: boolean;
  }
}

function boot(): void {
  const payload = window.__SP_IR__;
  const root = document.getElementById("root");
  if (!payload) {
    if (root) root.textContent = "structurizr-presenter: window.__SP_IR__ is missing.";
    return;
  }
  if (!root) {
    console.error("structurizr-presenter: no #root element in the page.");
    return;
  }
  const component = window.__SP_EDIT__ ? EditApp : App;
  createRoot(root).render(createElement(component, { ir: payload }));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
