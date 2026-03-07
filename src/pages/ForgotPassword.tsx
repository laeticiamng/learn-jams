import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function ForgotPassword() {
  const { t } = useTranslation();
  usePageSEO({ title: t("auth.forgot_title"), canonical: "/forgot-password", noindex: true });
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
          <h1 className="font-display text-2xl font-bold">{t("auth.forgot_title")}</h1>
        </div>
        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{t("auth.forgot_sent")} <strong className="text-foreground">{email}</strong></p>
            <Link to="/login"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" /> {t("auth.back_to_login")}</Button></Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" placeholder={t("auth.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full gradient-bg h-11" disabled={loading}>
              {loading ? t("auth.forgot_loading") : t("auth.forgot_button")}
            </Button>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">{t("auth.back_to_login")}</Link>
          </form>
        )}
      </div>
    </div>
  );
}
