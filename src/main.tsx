import { createRoot } from "react-dom/client";
import { AccessibilityProvider } from "./hooks/useAccessibility";
import { EnvValidationGuard } from "./components/EnvValidationGuard";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

createRoot(document.getElementById("root")!).render(
  <EnvValidationGuard>
    <AccessibilityProvider>
      <App />
    </AccessibilityProvider>
  </EnvValidationGuard>
);
