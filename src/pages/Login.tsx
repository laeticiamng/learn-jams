import { useState, useEffect } from "react";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { motion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function Login() {
  const { t } = useTranslation();
  usePageSEO({ title: t("auth.login_title"), description: t("auth.login_subtitle"), canonical: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = (location.state as { from?: string })?.from;
  // Only allow relative paths to prevent open-redirect via crafted location state
  const from = rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/create";

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

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
    else navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-6">
      <ParallaxOrbs glow orbs={[
        { className: "fixed top-1/4 left-1/3 w-[400px] h-[400px] pointer-events-none ambient-orb", style: { background: "hsl(265, 90%, 60%)", opacity: 0.08 } },
      ]} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease }}
        className="glass-card-elevated p-6 sm:p-9 w-full max-w-md glow-intense relative z-10"
      >
        <div className="text-center mb-6 sm:mb-9">
          <Link to="/" className="inline-block mb-5">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -3 }}
              className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center mx-auto shadow-lg shadow-primary/25"
            >
              <Music className="w-6 h-6 text-primary-foreground" />
            </motion.div>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">{t("auth.login_title")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{t("auth.login_subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">{t("auth.email")}</Label>
            <Input id="email" type="email" placeholder={t("auth.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} required
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password" className="text-sm font-medium">{t("auth.password")}</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline transition-colors">{t("auth.forgot")}</Link>
            </div>
            <Input id="password" type="password" placeholder={t("auth.password_placeholder")} value={password} onChange={(e) => setPassword(e.target.value)} required
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" className="w-full gradient-bg-premium h-12 rounded-xl shadow-lg shadow-primary/20 shimmer-btn" disabled={loading}>
              {loading ? t("auth.login_loading") : t("auth.login_button")}
            </Button>
          </motion.div>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-7">
          {t("auth.no_account")} <Link to="/signup" className="text-primary hover:underline font-medium transition-colors">{t("auth.signup_link")}</Link>
        </p>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}
