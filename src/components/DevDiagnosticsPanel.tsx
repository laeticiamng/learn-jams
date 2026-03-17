// ============================================================
// DevDiagnosticsPanel — Debug overlay for admins & dev mode
// Toggle with Ctrl+Shift+D
// In production, only available to admin users.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useUserPlan } from "@/hooks/useUserPlan";
import { validateClientEnv } from "@/security/env";
import { isAdmin } from "@/security/roles";
import { getFormatAvailability } from "@/services/billing/entitlementEngine.service";
import { FORMAT_CONFIGS } from "@/lib/create-format-config";

export function DevDiagnosticsPanel() {
  const [visible, setVisible] = useState(false);
  const { user, session, loading: authLoading } = useAuth();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const { plan, loading: planLoading } = useUserPlan(user?.id ?? null);

  const userIsAdmin = useMemo(() => isAdmin(user?.user_metadata), [user?.user_metadata]);
  const canAccess = import.meta.env.DEV || userIsAdmin;

  const togglePanel = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === "D") {
      setVisible((v) => !v);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    window.addEventListener("keydown", togglePanel);
    return () => window.removeEventListener("keydown", togglePanel);
  }, [togglePanel, canAccess]);

  if (!visible || !canAccess) return null;

  const envResult = validateClientEnv();

  return (
    <div className="fixed bottom-0 right-0 z-[9999] max-w-sm w-full max-h-[60vh] overflow-auto bg-gray-950 text-gray-100 text-xs border-t border-l border-gray-700 rounded-tl-lg shadow-2xl">
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-2 flex justify-between items-center">
        <span className="font-bold text-gray-300">Dev Diagnostics</span>
        <button onClick={() => setVisible(false)} className="text-gray-500 hover:text-gray-300">
          &#x2715;
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Auth Status */}
        <Section title="Auth">
          <Row label="Loading" value={authLoading ? "yes" : "no"} status={authLoading ? "warn" : "ok"} />
          <Row label="User" value={user?.email ?? "null"} status={user ? "ok" : "warn"} />
          <Row label="Session" value={session ? "active" : "null"} status={session ? "ok" : "warn"} />
          <Row label="User ID" value={user?.id?.slice(0, 8) ?? "—"} />
        </Section>

        {/* Env Status */}
        <Section title="Environment">
          <Row label="Valid" value={envResult.valid ? "yes" : "NO"} status={envResult.valid ? "ok" : "error"} />
          {envResult.missing.map((m) => (
            <Row key={m} label="Missing" value={m} status="error" />
          ))}
          <Row label="Supabase URL" value={import.meta.env.VITE_SUPABASE_URL ? "set" : "MISSING"} status={import.meta.env.VITE_SUPABASE_URL ? "ok" : "error"} />
          <Row label="Supabase Key" value={import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "set" : "MISSING"} status={import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "ok" : "error"} />
        </Section>

        {/* Feature Flags */}
        <Section title="Feature Flags">
          <Row label="Loading" value={flagsLoading ? "yes" : "no"} />
          {Object.entries(flags).map(([key, val]) => (
            <Row key={key} label={key} value={String(val)} status={val ? "ok" : "neutral"} />
          ))}
        </Section>

        {/* Admin & Plan Info */}
        <Section title="Plan & Access">
          <Row label="Admin" value={userIsAdmin ? "YES" : "no"} status={userIsAdmin ? "ok" : "neutral"} />
          <Row label="Role" value={String(user?.user_metadata?.role ?? "—")} />
          <Row label="Plan Key (meta)" value={String(user?.user_metadata?.plan_key ?? "—")} />
          <Row label="Resolved Plan" value={planLoading ? "loading…" : plan} status={plan === "school" ? "ok" : plan === "free" ? "warn" : "neutral"} />
          {Object.values(FORMAT_CONFIGS).map((fmt) => {
            const avail = getFormatAvailability(plan, fmt.featureKey);
            return (
              <Row key={fmt.key} label={fmt.key} value={avail} status={avail === "included" ? "ok" : avail === "limited" ? "warn" : "error"} />
            );
          })}
        </Section>

        {/* 3D Capabilities */}
        <Section title="3D Engine">
          <Row label="WebGL" value={typeof document !== "undefined" && !!document.createElement("canvas").getContext("webgl") ? "available" : "NO"} status={typeof document !== "undefined" && !!document.createElement("canvas").getContext("webgl") ? "ok" : "error"} />
          <Row label="WebGL2" value={typeof document !== "undefined" && !!document.createElement("canvas").getContext("webgl2") ? "available" : "NO"} status={typeof document !== "undefined" && !!document.createElement("canvas").getContext("webgl2") ? "ok" : "warn"} />
          <Row label="Pixel Ratio" value={String(window.devicePixelRatio ?? 1)} />
          <Row label="Reduced Motion" value={window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "yes" : "no"} />
        </Section>

        {/* Runtime Info */}
        <Section title="Runtime">
          <Row label="Mode" value={import.meta.env.MODE} />
          <Row label="DEV" value={String(import.meta.env.DEV)} />
          <Row label="URL" value={window.location.pathname} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-400 mb-1 uppercase tracking-wider">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value, status }: { label: string; value: string; status?: "ok" | "warn" | "error" | "neutral" }) {
  const colors = {
    ok: "text-green-400",
    warn: "text-yellow-400",
    error: "text-red-400",
    neutral: "text-gray-400",
  };
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono truncate ${colors[status ?? "neutral"]}`}>{value}</span>
    </div>
  );
}
