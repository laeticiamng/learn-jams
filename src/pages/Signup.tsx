import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function Signup() {
  const { t } = useTranslation();
  usePageSEO({ title: t("auth.signup_title"), description: t("auth.signup_subtitle"), canonical: "/signup" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { toast.error(t("auth.error_accept_terms")); return; }
    if (password.length < 6) { toast.error(t("auth.error_password_min")); return; }
    setLoading(true);
    const { error } = await signUp(email, password, displayName);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success(t("auth.success_signup")); navigate("/login"); }
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
          <h1 className="font-display text-2xl font-bold">{t("auth.signup_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("auth.signup_subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("auth.name")}</Label>
            <Input id="name" placeholder={t("auth.name_placeholder")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" placeholder={t("auth.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" placeholder={t("auth.password_min")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} className="mt-1" />
            <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
              {t("auth.accept_terms")} <Link to="/terms" className="text-primary hover:underline" target="_blank">{t("auth.terms_link")}</Link> {t("auth.and")} <Link to="/privacy" className="text-primary hover:underline" target="_blank">{t("auth.privacy_link")}</Link>
            </label>
          </div>
          <Button type="submit" className="w-full gradient-bg h-11" disabled={loading || !acceptedTerms}>
            {loading ? t("auth.signup_loading") : t("auth.signup_button")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.has_account")} <Link to="/login" className="text-primary hover:underline">{t("auth.login_link")}</Link>
        </p>
      </div>
    </div>
  );
}
