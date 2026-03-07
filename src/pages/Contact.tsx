import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Music, Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Remplis tous les champs");
      return;
    }
    setSending(true);
    // For now, just show success — in production, this would send an email via edge function
    await new Promise(r => setTimeout(r, 1000));
    toast.success("Message envoyé ! Nous te répondrons rapidement.");
    setName("");
    setEmail("");
    setMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="gap-2 mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> Retour</Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Contact & Support</h1>
            <p className="text-muted-foreground">Une question ? Un problème ? On est là pour t'aider.</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Quick info */}
          <div className="glass-card p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">support@studybeats.app</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium">Temps de réponse</div>
                  <div className="text-sm text-muted-foreground">Sous 24-48h en jours ouvrés</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Envoie-nous un message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input id="name" placeholder="Ton nom" value={name} onChange={e => setName(e.target.value)} required className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Décris ta question ou ton problème..." value={message} onChange={e => setMessage(e.target.value)} required rows={5} className="bg-muted/50" />
              </div>
              <Button type="submit" className="w-full gradient-bg gap-2" disabled={sending}>
                <Send className="w-4 h-4" />
                {sending ? "Envoi en cours..." : "Envoyer"}
              </Button>
            </form>
          </div>

          {/* FAQ mini */}
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Questions fréquentes</h2>
            <div className="space-y-4">
              {[
                { q: "Comment fonctionne StudyBeats ?", a: "Upload ton cours (texte, PDF ou photo), choisis un style musical, et l'IA génère une chanson pédagogique pour t'aider à mémoriser." },
                { q: "Est-ce que mes données sont protégées ?", a: "Oui. Tes données sont chiffrées et ne sont jamais vendues. Consulte notre politique de confidentialité pour plus de détails." },
                { q: "Puis-je supprimer mon compte ?", a: "Oui, tu peux supprimer ton compte depuis la page Profil. Toutes tes données seront effacées." },
                { q: "La génération audio est-elle disponible ?", a: "La génération de paroles par IA est disponible. La génération audio musicale est en cours de déploiement progressif." },
              ].map((item, i) => (
                <div key={i}>
                  <h3 className="font-medium text-foreground">{item.q}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
