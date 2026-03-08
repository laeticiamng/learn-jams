import { useState } from "react";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function ForgotPassword() {
  const { t } = useTranslation();
  usePageSEO({ title: t("auth.forgot_title"), description: t("auth.forgot_title"), canonical: "/forgot-password", noindex: true });
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <ParallaxOrbs glow />

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
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("auth.forgot_title")}</h1>
        </div>
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-5"
          >
            <p className="text-muted-foreground text-sm">{t("auth.forgot_sent")} <strong className="text-foreground">{email}</strong></p>
            <Link to="/login">
              <Button variant="outline" className="gap-2 rounded-xl"><ArrowLeft className="w-4 h-4" /> {t("auth.back_to_login")}</Button>
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t("auth.email")}</Label>
              <Input id="email" type="email" placeholder={t("auth.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} required
                className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" className="w-full gradient-bg-premium h-12 rounded-xl shadow-lg shadow-primary/20 shimmer-btn" disabled={loading}>
                {loading ? t("auth.forgot_loading") : t("auth.forgot_button")}
              </Button>
            </motion.div>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline transition-colors">{t("auth.back_to_login")}</Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
