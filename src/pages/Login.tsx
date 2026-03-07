import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function Login() {
  const { t } = useTranslation();
  usePageSEO({ title: t("auth.login_title"), description: t("auth.login_subtitle"), canonical: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const humanizeError = (message: string): string => {
    if (message.includes("Email not confirmed")) return t("auth.error_email_not_confirmed");
    if (message.includes("Invalid login credentials")) return t("auth.error_invalid_credentials");
    if (message.includes("Too many requests")) return t("auth.error_too_many_requests");
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) toast.error(humanizeError(error.message));
    else navigate("/create");
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
          <h1 className="font-display text-2xl font-bold">{t("auth.login_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("auth.login_subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" placeholder={t("auth.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">{t("auth.forgot")}</Link>
            </div>
            <Input id="password" type="password" placeholder={t("auth.password_placeholder")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full gradient-bg h-11" disabled={loading}>
            {loading ? t("auth.login_loading") : t("auth.login_button")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.no_account")} <Link to="/signup" className="text-primary hover:underline">{t("auth.signup_link")}</Link>
        </p>
      </div>
    </div>
  );
}
