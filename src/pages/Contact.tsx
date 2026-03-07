import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Music, Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePageSEO } from "@/hooks/usePageSEO";

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
    await new Promise(r => setTimeout(r, 1000));
    toast.success(t("contact.sent"));
    setName(""); setEmail(""); setMessage("");
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="gap-2 mb-8">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> {t("common.back")}</Link>
        </Button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center"><Music className="w-6 h-6 text-primary-foreground" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold">{t("contact.title")}</h1>
            <p className="text-muted-foreground">{t("contact.subtitle")}</p>
          </div>
        </div>
        <div className="grid gap-6">
          <div className="glass-card p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3"><Mail className="w-5 h-5 text-primary mt-0.5" /><div><div className="font-medium">{t("contact.email_label")}</div><div className="text-sm text-muted-foreground">support@studybeats.app</div></div></div>
              <div className="flex items-start gap-3"><MessageSquare className="w-5 h-5 text-primary mt-0.5" /><div><div className="font-medium">{t("contact.response_time")}</div><div className="text-sm text-muted-foreground">{t("contact.response_value")}</div></div></div>
            </div>
          </div>
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold mb-4">{t("contact.form_title")}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">{t("contact.name_label")}</Label><Input id="name" placeholder={t("contact.name_placeholder")} value={name} onChange={e => setName(e.target.value)} required className="bg-muted/50" /></div>
              <div className="space-y-2"><Label htmlFor="email">{t("contact.email_label")}</Label><Input id="email" type="email" placeholder={t("contact.email_placeholder")} value={email} onChange={e => setEmail(e.target.value)} required className="bg-muted/50" /></div>
              <div className="space-y-2"><Label htmlFor="message">{t("contact.message_label")}</Label><Textarea id="message" placeholder={t("contact.message_placeholder")} value={message} onChange={e => setMessage(e.target.value)} required rows={5} className="bg-muted/50" /></div>
              <Button type="submit" className="w-full gradient-bg gap-2" disabled={sending}><Send className="w-4 h-4" />{sending ? t("contact.sending") : t("contact.send")}</Button>
            </form>
          </div>
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold mb-4">{t("contact.faq_title")}</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(n => (
                <div key={n}><h3 className="font-medium text-foreground">{t(`contact.faq${n}_q`)}</h3><p className="text-sm text-muted-foreground mt-1">{t(`contact.faq${n}_a`)}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
