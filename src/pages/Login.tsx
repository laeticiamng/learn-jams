import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function Login() {
  usePageSEO({
    title: "Connexion",
    description: "Connecte-toi à StudyBeats pour retrouver tes chansons pédagogiques et tes quiz.",
    canonical: "/login",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const humanizeError = (message: string): string => {
    if (message.includes("Email not confirmed")) return "Ton email n'est pas encore confirmé. Vérifie ta boîte de réception.";
    if (message.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
    if (message.includes("Too many requests")) return "Trop de tentatives. Réessaie dans quelques minutes.";
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(humanizeError(error.message));
    } else {
      navigate("/create");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={{ background: "var(--gradient-glow)" }}>
      <div className="glass-card p-8 w-full max-w-md glow">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <Music className="w-6 h-6 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold">Bon retour ! 👋</h1>
          <p className="text-muted-foreground mt-1">Connecte-toi pour retrouver tes chansons</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="ton@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">Oublié ?</Link>
            </div>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full gradient-bg h-11" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Pas encore de compte ? <Link to="/signup" className="text-primary hover:underline">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}
