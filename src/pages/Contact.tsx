import { useState } from "react";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Music, Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export default function Contact() {
  const { t } = useTranslation();
  usePageSEO({ title: t("contact.title"), description: t("contact.subtitle"), canonical: "/contact" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) { toast.error(t("contact.fill_all")); return; }
    setSending(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      if (error) throw error;
      toast.success(t("contact.sent"));
      setName(""); setEmail(""); setMessage("");
    } catch (err: any) {
      console.error("Contact form error:", err);
      toast.error(t("contact.error", "Une erreur est survenue. Réessaye plus tard."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <ParallaxOrbs orbs={[
        { className: "fixed bottom-0 left-1/3 w-[500px] h-[300px] pointer-events-none ambient-orb", style: { background: "hsl(215, 80%, 55%)", opacity: 0.06 } },
      ]} />

      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-2xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
        >
          <Button variant="ghost" size="sm" asChild className="gap-2 mb-8 rounded-xl text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="w-4 h-4" /> {t("common.back")}</Link>
          </Button>
          <div className="flex items-center gap-4 mb-10">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -3 }}
              className="w-12 h-12 rounded-xl gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/20"
            >
              <Music className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{t("contact.title")}</h1>
              <p className="text-muted-foreground text-lg">{t("contact.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="glass-card-elevated p-7"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg gradient-bg-premium flex items-center justify-center shrink-0 shadow-lg shadow-primary/15">
                  <Mail className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{t("contact.email_label")}</div>
                  <a href="mailto:support@studybeats.app" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">support@studybeats.app</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg gradient-bg-premium flex items-center justify-center shrink-0 shadow-lg shadow-primary/15">
                  <MessageSquare className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{t("contact.response_time")}</div>
                  <div className="text-sm text-muted-foreground">{t("contact.response_value")}</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease }}
            className="glass-card-elevated p-8"
          >
            <h2 className="font-display text-xl font-semibold mb-6">{t("contact.form_title")}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">{t("contact.name_label")}</Label>
                <Input id="name" placeholder={t("contact.name_placeholder")} value={name} onChange={e => setName(e.target.value)} required
                  className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t("contact.email_label")}</Label>
                <Input id="email" type="email" placeholder={t("contact.email_placeholder")} value={email} onChange={e => setEmail(e.target.value)} required
                  className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">{t("contact.message_label")}</Label>
                <Textarea id="message" placeholder={t("contact.message_placeholder")} value={message} onChange={e => setMessage(e.target.value)} required rows={5}
                  className="bg-muted/15 border-border/20 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300 resize-none" />
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" className="w-full gradient-bg-premium gap-2 h-12 rounded-xl shadow-lg shadow-primary/20 shimmer-btn" disabled={sending}>
                  <Send className="w-4 h-4" />{sending ? t("contact.sending") : t("contact.send")}
                </Button>
              </motion.div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease }}
            className="glass-card-elevated p-8"
          >
            <h2 className="font-display text-xl font-semibold mb-6">{t("contact.faq_title")}</h2>
            <div className="space-y-5">
              {[1, 2, 3, 4].map((n, i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06, ease }}
                >
                  <h3 className="font-semibold text-sm text-foreground">{t(`contact.faq${n}_q`)}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(`contact.faq${n}_a`)}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
