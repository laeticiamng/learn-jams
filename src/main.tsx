import { createRoot } from "react-dom/client";
import { AccessibilityProvider } from "./hooks/useAccessibility";
import { EnvValidationGuard } from "./components/EnvValidationGuard";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

try {
  createRoot(document.getElementById("root")!).render(
    <EnvValidationGuard>
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    </EnvValidationGuard>
  );
} catch (err) {
  console.error("[COGNITIO] Fatal boot error:", err);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a12;color:#e5e5e5;font-family:system-ui,sans-serif;padding:2rem;text-align:center">' +
      '<div><h1 style="font-size:1.25rem;margin-bottom:0.5rem;color:#f87171">Application failed to start</h1>' +
      '<p style="color:#888;font-size:0.875rem;margin-bottom:0.5rem">' + (err instanceof Error ? err.message : String(err)) + '</p>' +
      '<button onclick="location.reload()" style="padding:0.5rem 1.5rem;border-radius:0.5rem;border:1px solid #444;background:#1a1a2e;color:#e5e5e5;cursor:pointer;font-size:0.875rem;margin-top:1rem">Reload Page</button></div></div>';
  }
}
