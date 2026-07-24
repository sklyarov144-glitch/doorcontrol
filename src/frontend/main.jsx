import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { captureApplicationError, initMonitoring } from "../services/monitoring";
import { safeErrorMessage } from "../services/safeErrorMessage";

const rootElement = document.getElementById("root");

function renderBootstrapScreen({ failed = false, error } = {}) {
  if (!rootElement) {
    throw new Error('Не найден корневой элемент приложения с id="root".');
  }

  rootElement.replaceChildren();

  const screen = document.createElement("main");
  screen.setAttribute("role", failed ? "alert" : "status");
  screen.style.cssText = [
    "min-height:100vh",
    "display:grid",
    "place-items:center",
    "padding:24px",
    "box-sizing:border-box",
    "background:#f3f6fa",
    "font-family:Inter,Arial,sans-serif",
    "color:#172033",
  ].join(";");

  const card = document.createElement("section");
  card.style.cssText = [
    "width:min(100%,480px)",
    "padding:32px",
    "box-sizing:border-box",
    "border:1px solid #dfe5ee",
    "border-radius:16px",
    "background:#fff",
    "box-shadow:0 18px 50px rgba(11,23,42,.12)",
  ].join(";");

  const brand = document.createElement("div");
  brand.textContent = "ГРОСС";
  brand.style.cssText = "margin-bottom:20px;color:#c9202f;font-size:18px;font-weight:800;letter-spacing:.04em";

  const title = document.createElement("h1");
  title.textContent = failed ? "Не удалось запустить приложение" : "Загрузка системы";
  title.style.cssText = "margin:0 0 10px;font-size:24px;line-height:1.25";

  const message = document.createElement("p");
  message.textContent = failed
    ? "Обновите страницу. Если ошибка повторится, передайте текст ниже техническому специалисту."
    : "Подготавливаем рабочее пространство...";
  message.style.cssText = "margin:0;color:#6b778c;font-size:16px;line-height:1.5";

  card.append(brand, title, message);

  if (failed) {
    const details = document.createElement("pre");
    details.textContent = safeErrorMessage(error);
    details.style.cssText = [
      "margin:20px 0 0",
      "padding:12px",
      "overflow:auto",
      "border-radius:8px",
      "background:#fff1f2",
      "color:#9f1522",
      "font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace",
      "white-space:pre-wrap",
    ].join(";");

    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Повторить загрузку";
    retry.style.cssText = [
      "width:100%",
      "margin-top:20px",
      "padding:14px 18px",
      "border:0",
      "border-radius:10px",
      "background:#c9202f",
      "color:#fff",
      "font:700 16px/1 Inter,Arial,sans-serif",
      "cursor:pointer",
    ].join(";");
    retry.addEventListener("click", () => window.location.reload());
    card.append(details, retry);
  }

  screen.append(card);
  rootElement.append(screen);
}

async function bootstrap() {
  renderBootstrapScreen();
  initMonitoring();

  try {
    const demo = import.meta.env.VITE_DATA_PROVIDER === "supabase" && import.meta.env.VITE_STAGING_DEMO_MODE !== "true"
      ? { mockUsers: [], demoPassword: "" }
      : await import("./mocks/demoUsers");

    createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App demoUsers={demo.mockUsers} demoPassword={demo.demoPassword} />
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Application bootstrap failed", error);
    captureApplicationError(error, { phase: "bootstrap" });
    renderBootstrapScreen({ failed: true, error });
  }
}

void bootstrap();
