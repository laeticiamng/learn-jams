import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) toast.error(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={{ background: "var(--gradient-glow)" }}>
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">Mot de passe oublié</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Un email de réinitialisation a été envoyé à <strong className="text-foreground">{email}</strong></p>
            <Link to="/login"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> Retour</Button></Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="ton@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gradient-bg h-11" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">Retour à la connexion</Link>
          </form>
        )}
      </div>
    </div>
  );
}
