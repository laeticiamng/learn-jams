import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Save, Loader2, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [songCount, setSongCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, songsRes, favsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("songs").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("favorites").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);
      if (profileRes.data) {
        setDisplayName(profileRes.data.display_name || "");
        setFieldOfStudy(profileRes.data.field_of_study || "");
      }
      setSongCount(songsRes.count || 0);
      setFavCount(favsRes.count || 0);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      field_of_study: fieldOfStudy,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profil mis à jour !");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    // Delete user data then sign out
    await supabase.from("favorites").delete().eq("user_id", user.id);
    await supabase.from("songs").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("user_id", user.id);
    await signOut();
    toast.success("Compte supprimé. Au revoir !");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-24 pb-12 px-4 max-w-lg">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4 glow">
            <span className="text-3xl font-bold text-primary-foreground">{displayName?.[0]?.toUpperCase() || "?"}</span>
          </div>
          <h1 className="font-display text-2xl font-bold">{displayName || "Mon profil"}</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="font-display text-2xl font-bold gradient-text">{songCount}</div>
              <div className="text-sm text-muted-foreground">Chansons</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold gradient-text">{favCount}</div>
              <div className="text-sm text-muted-foreground">Favoris</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="space-y-2">
            <Label>Prénom</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Filière d'études</Label>
            <Input placeholder="Ex: Médecine, Droit, Informatique..." value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} className="bg-muted/50" />
          </div>
          <Button onClick={handleSave} className="w-full gradient-bg gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </Button>
        </div>

        {/* Delete account */}
        <div className="glass-card p-6 mt-6 border-destructive/30">
          <h3 className="font-display font-semibold text-destructive mb-2">Zone dangereuse</h3>
          <p className="text-sm text-muted-foreground mb-4">La suppression de ton compte est définitive. Toutes tes chansons et données seront effacées.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="w-4 h-4" /> Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ton compte ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes tes chansons, favoris et données seront définitivement supprimés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
