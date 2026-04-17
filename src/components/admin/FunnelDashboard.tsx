// ============================================================
// Product funnel dashboard — signup → onboarding → song → ready → Pro
// Reads RPC get_product_funnel_metrics (admin-only, server-enforced).
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingDown, Users } from "lucide-react";
import { toast } from "sonner";

interface FunnelStep {
  key: string;
  label: string;
  count: number;
  pct: number;
}

interface FunnelPayload {
  window_days: number;
  since: string;
  steps: FunnelStep[];
  generated_at: string;
}

const WINDOW_OPTIONS = [7, 30, 90];

export default function FunnelDashboard() {
  const [data, setData] = useState<FunnelPayload | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const load = async (days: number) => {
    setLoading(true);
    const { data: payload, error } = await supabase.rpc(
      "get_product_funnel_metrics" as never,
      { p_window_days: days } as never,
    );
    if (error) {
      toast.error("Funnel: " + error.message);
      setData(null);
    } else {
      setData(payload as unknown as FunnelPayload);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(windowDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays]);

  const steps = data?.steps ?? [];
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Funnel produit ({windowDays} jours)
        </CardTitle>
        <div className="flex items-center gap-2">
          {WINDOW_OPTIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={d === windowDays ? "default" : "outline"}
              onClick={() => setWindowDays(d)}
            >
              {d}j
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => load(windowDays)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
        )}
        {steps.map((step, i) => {
          const widthPct = (step.count / maxCount) * 100;
          const prev = i > 0 ? steps[i - 1] : null;
          const dropOff =
            prev && prev.count > 0
              ? Math.round(((prev.count - step.count) / prev.count) * 100)
              : 0;
          return (
            <div key={step.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <div className="flex items-center gap-2">
                  {prev && dropOff > 0 && (
                    <Badge variant="outline" className="gap-1 text-destructive">
                      <TrendingDown className="h-3 w-3" />
                      -{dropOff}%
                    </Badge>
                  )}
                  <span className="tabular-nums text-muted-foreground">
                    {step.count} · {step.pct}%
                  </span>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                  style={{ width: `${Math.max(widthPct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
        {data && (
          <p className="pt-2 text-xs text-muted-foreground">
            Mesuré sur {steps[0]?.count ?? 0} inscriptions depuis le{" "}
            {new Date(data.since).toLocaleDateString("fr-FR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
