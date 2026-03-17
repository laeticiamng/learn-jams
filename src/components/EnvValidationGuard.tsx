// ============================================================
// EnvValidationGuard — Validates environment variables at boot
// Shows diagnostic screen if critical vars are missing
// IMPORTANT: Uses inline styles only (no Tailwind) so the error
// is always visible even if CSS fails to load (Lovable preview).
// ============================================================

import { type ReactNode, useMemo } from "react";
import { getSupabaseConfigStatus } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0a0a12",
  color: "#e5e5e5",
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: "1.5rem",
};

const cardStyle: React.CSSProperties = {
  maxWidth: "32rem",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const headerStyle: React.CSSProperties = { textAlign: "center" as const };

const iconStyle: React.CSSProperties = { fontSize: "2.5rem", marginBottom: "0.5rem" };

const titleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#f87171",
  margin: "0 0 0.5rem",
};

const subtitleStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  color: "#9ca3af",
  margin: 0,
};

const boxStyle = (borderColor: string): React.CSSProperties => ({
  background: "#111827",
  borderRadius: "0.5rem",
  padding: "1rem",
  border: `1px solid ${borderColor}`,
});

const labelStyle = (color: string): React.CSSProperties => ({
  fontSize: "0.8125rem",
  fontWeight: 600,
  color,
  margin: "0 0 0.5rem",
});

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const listItemStyle = (color: string): React.CSSProperties => ({
  fontSize: "0.8125rem",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  color,
});

const stepsStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#9ca3af",
  margin: 0,
  paddingLeft: "1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
};

const codeStyle: React.CSSProperties = {
  background: "#1e293b",
  padding: "0.125rem 0.375rem",
  borderRadius: "0.25rem",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  fontSize: "0.75rem",
  color: "#e2e8f0",
};

export function EnvValidationGuard({ children }: Props) {
  const status = useMemo(() => getSupabaseConfigStatus(), []);

  if (!status.configured) {
    const missing: string[] = [];
    if (!status.hasUrl) missing.push("VITE_SUPABASE_URL");
    if (!status.hasKey) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
    const warnings: string[] = [];
    if (status.hasUrl && !status.urlValid) warnings.push(status.diagnosticMessage);

    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <div style={iconStyle}>&#9888;&#65039;</div>
            <h1 style={titleStyle}>Configuration Error</h1>
            <p style={subtitleStyle}>
              Required environment variables are missing. The app cannot start.
            </p>
          </div>

          {missing.length > 0 && (
            <div style={boxStyle("#7f1d1d80")}>
              <h2 style={labelStyle("#fca5a5")}>Missing variables:</h2>
              <ul style={listStyle}>
                {missing.map((key: string) => (
                  <li key={key} style={listItemStyle("#f87171")}>
                    &bull; {key}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div style={boxStyle("#78350f80")}>
              <h2 style={labelStyle("#fcd34d")}>Warnings:</h2>
              <ul style={listStyle}>
                {warnings.map((w: string) => (
                  <li key={w} style={listItemStyle("#fbbf24")}>
                    &bull; {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={boxStyle("#6d28d980")}>
            <h2 style={labelStyle("#c4b5fd")}>Fix on Lovable:</h2>
            <ol style={stepsStyle}>
              <li>Open your Lovable project settings</li>
              <li>
                Go to <strong style={{ color: "#e2e8f0" }}>Integrations &rarr; Supabase</strong>
              </li>
              <li>
                Connect your Supabase project — this sets{" "}
                <code style={codeStyle}>VITE_SUPABASE_URL</code> and{" "}
                <code style={codeStyle}>VITE_SUPABASE_PUBLISHABLE_KEY</code> automatically
              </li>
              <li>Re-deploy or reload the preview</li>
            </ol>
          </div>

          <div style={boxStyle("#374151")}>
            <h2 style={labelStyle("#d1d5db")}>Fix locally:</h2>
            <ol style={stepsStyle}>
              <li>
                Copy <code style={codeStyle}>.env.example</code> to{" "}
                <code style={codeStyle}>.env</code>
              </li>
              <li>
                Fill in <code style={codeStyle}>VITE_SUPABASE_URL</code> and{" "}
                <code style={codeStyle}>VITE_SUPABASE_PUBLISHABLE_KEY</code> with your Supabase
                project values
              </li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
