import { useState, useEffect } from "react";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Music } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function Signup() {
  const { t } = useTranslation();
  usePageSEO({ title: t("auth.signup_title"), description: t("auth.signup_subtitle"), canonical: "/signup" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate("/create", { replace: true });
  }, [user, navigate]);

  const humanizeError = (message: string): string => {
    if (message.includes("already registered") || message.includes("already been registered")) return t("auth.error_already_registered", "Cette adresse e-mail est déjà utilisée.");
    if (message.includes("Password should be")) return t("auth.error_password_min");
    if (message.includes("valid email")) return t("auth.error_invalid_email", "Adresse e-mail invalide.");
    if (message.includes("Too many requests")) return t("auth.error_too_many_requests", "Trop de tentatives. Réessaie dans quelques minutes.");
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { toast.error(t("auth.error_accept_terms")); return; }
    if (password.length < 6) { toast.error(t("auth.error_password_min")); return; }
    setLoading(true);
    const { error } = await signUp(email, password, displayName);
    setLoading(false);
    if (error) toast.error(humanizeError(error.message));
    else { toast.success(t("auth.success_signup")); navigate("/login"); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 pt-20">
      <ParallaxOrbs glow orbs={[
        { className: "fixed bottom-1/4 right-1/3 w-[400px] h-[400px] pointer-events-none ambient-orb", style: { background: "hsl(300, 70%, 50%)", opacity: 0.06 } },
      ]} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease }}
        className="glass-card-elevated p-9 w-full max-w-md glow-intense relative z-10"
      >
        <div className="text-center mb-9">
          <Link to="/" className="inline-block mb-5">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -3 }}
              className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mx-auto shadow-lg shadow-primary/25"
            >
              <Music className="w-6 h-6 text-primary-foreground" />
            </motion.div>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("auth.signup_title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{t("auth.signup_subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">{t("auth.name")}</Label>
            <Input id="name" placeholder={t("auth.name_placeholder")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">{t("auth.email")}</Label>
            <Input id="email" type="email" placeholder={t("auth.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} required
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">{t("auth.password")}</Label>
            <Input id="password" type="password" placeholder={t("auth.password_min")} value={password} onChange={(e) => setPassword(e.target.value)} required
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
            {password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        password.length >= level * 3
                          ? level <= 1 ? "bg-destructive" : level <= 2 ? "bg-amber-500" : level <= 3 ? "bg-primary" : "bg-green-500"
                          : "bg-muted/30"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-[11px] transition-colors ${
                  password.length < 6 ? "text-destructive" : password.length < 9 ? "text-amber-500" : "text-green-500"
                }`}>
                  {password.length < 6
                    ? t("auth.password_weak", "Trop court (6 caractères minimum)")
                    : password.length < 9
                    ? t("auth.password_medium", "Correct — ajoute des caractères pour plus de sécurité")
                    : t("auth.password_strong", "Mot de passe solide ✓")}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-start gap-3">
            <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} className="mt-0.5" />
            <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              {t("auth.accept_terms")} <Link to="/terms" className="text-primary hover:underline" target="_blank">{t("auth.terms_link")}</Link> {t("auth.and")} <Link to="/privacy" className="text-primary hover:underline" target="_blank">{t("auth.privacy_link")}</Link>
            </label>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" className="w-full gradient-bg-premium h-12 rounded-xl shadow-lg shadow-primary/20 shimmer-btn" disabled={loading || !acceptedTerms}>
              {loading ? t("auth.signup_loading") : t("auth.signup_button")}
            </Button>
          </motion.div>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-7">
          {t("auth.has_account")} <Link to="/login" className="text-primary hover:underline font-medium transition-colors">{t("auth.login_link")}</Link>
        </p>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}
