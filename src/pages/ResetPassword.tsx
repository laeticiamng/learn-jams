import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.location.hash.includes("type=recovery")) navigate("/login");
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error(t("auth.error_password_min")); return; }
    if (password !== confirmPassword) { toast.error(t("auth.error_passwords_mismatch")); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success(t("auth.success_password_updated")); navigate("/create"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={{ background: "var(--gradient-glow)" }}>
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">{t("auth.reset_title")}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.new_password")}</Label>
            <Input id="password" type="password" placeholder={t("auth.password_min")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("auth.confirm_password")}</Label>
            <Input id="confirmPassword" type="password" placeholder={t("auth.confirm_placeholder")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full gradient-bg h-11" disabled={loading}>
            {loading ? t("auth.reset_loading") : t("auth.reset_button")}
          </Button>
        </form>
      </div>
    </div>
  );
}
