import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./app/App";
import { initMonitoring } from "../services/monitoring";

async function bootstrap() {
  const demo = import.meta.env.VITE_DATA_PROVIDER === "supabase"
    ? { mockUsers: [], demoPassword: "" }
    : await import("./mocks/demoUsers");

  initMonitoring();
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App demoUsers={demo.mockUsers} demoPassword={demo.demoPassword} />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

bootstrap();
