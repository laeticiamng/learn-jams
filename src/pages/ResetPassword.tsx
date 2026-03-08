import { useState, useEffect } from "react";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease }}
        className="glass-card-elevated p-9 w-full max-w-md relative z-10"
      >
        <div className="text-center mb-9">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25"
          >
            <Music className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("auth.reset_title")}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">{t("auth.new_password")}</Label>
            <Input id="password" type="password" placeholder={t("auth.password_min")} value={password} onChange={(e) => setPassword(e.target.value)} required
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">{t("auth.confirm_password")}</Label>
            <Input id="confirmPassword" type="password" placeholder={t("auth.confirm_placeholder")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" className="w-full gradient-bg-premium h-12 rounded-xl shadow-lg shadow-primary/20 shimmer-btn" disabled={loading}>
              {loading ? t("auth.reset_loading") : t("auth.reset_button")}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
