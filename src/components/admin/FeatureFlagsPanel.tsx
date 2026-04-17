// ============================================================
// FeatureFlagsPanel — Admin UI for runtime feature toggles
// ============================================================
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FlagRow {
  flag_key: string;
  enabled: boolean;
  description: string | null;
  rollout_percent: number;
}

export function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("feature_flags")
      .select("flag_key, enabled, description, rollout_percent")
      .order("flag_key");
    setFlags((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (key: string, enabled: boolean) => {
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled })
      .eq("flag_key", key);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setFlags((f) => f.map((x) => x.flag_key === key ? { ...x, enabled } : x));
    toast({ title: enabled ? "Fonctionnalité activée" : "Fonctionnalité désactivée", description: key });
  };

  const setRollout = async (key: string, value: number) => {
    const { error } = await supabase
      .from("feature_flags")
      .update({ rollout_percent: value })
      .eq("flag_key", key);
    if (error) return;
    setFlags((f) => f.map((x) => x.flag_key === key ? { ...x, rollout_percent: value } : x));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Flag className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Feature flags / Kill-switches</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Désactivez ou déployez progressivement une fonctionnalité sans redéploiement.
      </p>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <div className="space-y-4">
          {flags.map((f) => (
            <div key={f.flag_key} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{f.flag_key}</span>
                    <Badge variant={f.enabled ? "default" : "outline"}>
                      {f.enabled ? "Actif" : "Désactivé"}
                    </Badge>
                  </div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                  )}
                </div>
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(v) => toggle(f.flag_key, v)}
                />
              </div>
              {f.enabled && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <span className="text-xs text-muted-foreground w-24">Rollout</span>
                  <Slider
                    value={[f.rollout_percent]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={(v) => setRollout(f.flag_key, v[0])}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-12 text-right">{f.rollout_percent}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
