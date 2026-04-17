// ============================================================
// /admin/incidents — admin CRUD + timeline of incidents
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import IncidentTimeline from "@/components/admin/IncidentTimeline";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  status: string;
  severity: string;
  started_at: string;
  resolved_at: string | null;
}

export default function AdminIncidents() {
  const { toast } = useToast();
  const [active, setActive] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<Record<string, string>>({});

  // create form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState<"minor" | "major" | "critical">("minor");
  const [newComponents, setNewComponents] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("incidents")
      .select("id, title, status, severity, started_at, resolved_at")
      .neq("status", "resolved")
      .order("started_at", { ascending: false });
    setActive((data ?? []) as Incident[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createIncident = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    const components = newComponents.split(",").map((c) => c.trim()).filter(Boolean);
    const { error } = await supabase.from("incidents").insert({
      title: newTitle,
      description: newDesc || null,
      severity: newSeverity,
      affected_components: components,
      status: "investigating",
    });
    setCreating(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setNewTitle("");
    setNewDesc("");
    setNewComponents("");
    setNewSeverity("minor");
    toast({ title: "Incident créé" });
    load();
  };

  const postUpdate = async (id: string, status: string) => {
    const msg = updateMsg[id]?.trim();
    if (!msg) return;
    const { error } = await supabase.from("incident_updates").insert({
      incident_id: id,
      message: msg,
      status_at_post: status,
    });
    if (!error) {
      await supabase.from("incidents").update({ status }).eq("id", id);
      setUpdateMsg((p) => ({ ...p, [id]: "" }));
      toast({ title: "Mise à jour publiée" });
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Link to="/admin/observability">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Gestion des incidents</h1>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Déclarer un incident</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="t">Titre</Label>
              <Input id="t" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Suno API en panne" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="d">Description</Label>
              <Textarea id="d" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Sévérité</Label>
              <Select value={newSeverity} onValueChange={(v) => setNewSeverity(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Mineur</SelectItem>
                  <SelectItem value="major">Majeur</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="c">Composants (séparés par virgules)</Label>
              <Input id="c" value={newComponents} onChange={(e) => setNewComponents(e.target.value)} placeholder="suno, music-generation" />
            </div>
            <div className="md:col-span-2">
              <Button onClick={createIncident} disabled={creating || !newTitle.trim()}>
                {creating ? "Création…" : "Créer l'incident"}
              </Button>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="text-lg font-semibold mb-3">Incidents actifs</h2>
          {loading ? (
            <Card className="p-5 text-sm text-muted-foreground">Chargement…</Card>
          ) : active.length === 0 ? (
            <Card className="p-5 text-sm text-muted-foreground">Aucun incident actif.</Card>
          ) : (
            <div className="space-y-3">
              {active.map((i) => (
                <Card key={i.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">{i.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Démarré {new Date(i.started_at).toLocaleString("fr-FR")}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="outline">{i.severity}</Badge>
                      <Badge>{i.status}</Badge>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Message de mise à jour…"
                    value={updateMsg[i.id] ?? ""}
                    onChange={(e) => setUpdateMsg((p) => ({ ...p, [i.id]: e.target.value }))}
                    rows={2}
                    className="mb-2"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => postUpdate(i.id, "identified")}>
                      Identifié
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => postUpdate(i.id, "monitoring")}>
                      Surveillance
                    </Button>
                    <Button size="sm" onClick={() => postUpdate(i.id, "resolved")}>
                      Résoudre
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Historique 30 jours</h2>
          <IncidentTimeline windowDays={30} />
        </section>
      </div>
    </div>
  );
}
