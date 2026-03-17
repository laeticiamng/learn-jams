import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Trash2, CreditCard, ArrowLeft, GraduationCap, Globe, BookOpen, Brain, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/usePageSEO";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLearnerProfile } from "@/hooks/useLearnerProfile";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { useProgressSnapshots } from "@/hooks/useProgressSnapshots";
import { ProfileStatusCard } from "@/components/cognitio/progress/ProfileStatusCard";
import { MasteryOverviewCard } from "@/components/cognitio/progress/MasteryOverviewCard";
import { FragileConceptsCard } from "@/components/cognitio/progress/FragileConceptsCard";
import { AgingConceptsCard } from "@/components/cognitio/progress/AgingConceptsCard";
import { ReviewQueueCard } from "@/components/cognitio/progress/ReviewQueueCard";
import { BestFormatCard } from "@/components/cognitio/progress/BestFormatCard";
import { ProgressTimelineCard } from "@/components/cognitio/progress/ProgressTimelineCard";
import { CalibrationTrendCard } from "@/components/cognitio/progress/CalibrationTrendCard";
import { useProductTracking } from "@/hooks/useProductTracking";
import { ResumeLastActionCard, type ResumeAction } from "@/components/product/ResumeLastActionCard";

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const SUBJECTS = [
  { id: "medicine", emoji: "🩺" },
  { id: "law", emoji: "⚖️" },
  { id: "history", emoji: "📜" },
  { id: "languages", emoji: "🌍" },
  { id: "sciences", emoji: "🔬" },
  { id: "engineering", emoji: "⚙️" },
  { id: "business", emoji: "📊" },
  { id: "arts", emoji: "🎨" },
  { id: "other", emoji: "📚" },
];

export default function Profile() {
  const { t } = useTranslation();
  usePageSEO({ title: t("profile.title"), description: t("profile.title"), noindex: true });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [university, setUniversity] = useState("");
  const [country, setCountry] = useState("");
  const [songCount, setSongCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const learner = useLearnerProfile();
  const reviewQueue = useReviewQueue();
  const progressSnapshots = useProgressSnapshots();
  const { track } = useProductTracking();

  useEffect(() => { track({ event_name: "profile_viewed" }); }, [track]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, songsRes, favsRes, subRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("songs").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("favorites").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
      ]);
      if (profileRes.data) {
        setDisplayName(profileRes.data.display_name || "");
        setFieldOfStudy(profileRes.data.field_of_study || "");
        setUniversity((profileRes.data as Record<string, unknown>).university as string || "");
        setCountry((profileRes.data as Record<string, unknown>).country as string || "");
      }
      setSongCount(songsRes.count || 0);
      setFavCount(favsRes.count || 0);
      setIsPro(subRes.data?.status === "active");
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      field_of_study: fieldOfStudy,
      university: university || null,
      country: country || null,
    } as Record<string, unknown>).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(t("profile.saved"));
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
      toast.success(t("profile.deleted"));
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      toast.error(message || t("common.error"));
    }
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        // Validate the portal URL is a legitimate Stripe domain
        try {
          const portalUrl = new URL(data.url);
          if (!portalUrl.hostname.endsWith("stripe.com")) throw new Error("Invalid portal URL");
          window.open(data.url, "_blank", "noopener,noreferrer");
        } catch {
          toast.error(t("common.error"));
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal error";
      toast.error(message || t("common.error"));
    } finally {
      setManagingSubscription(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      <div className="fixed top-1/3 left-1/4 w-[400px] h-[300px] pointer-events-none ambient-orb" style={{ background: "hsl(265, 90%, 60%)", opacity: 0.06 }} />

      <Navbar />
      <div className="container mx-auto pt-28 pb-16 px-4 max-w-lg relative z-10">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 mb-6 rounded-xl hover:bg-muted/30 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> {t("common.back", "Retour")}
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-10"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 rounded-full gradient-bg-premium flex items-center justify-center mx-auto mb-5 glow-intense shadow-2xl shadow-primary/20"
          >
            <span className="text-3xl font-bold text-primary-foreground">{displayName?.[0]?.toUpperCase() || "?"}</span>
          </motion.div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{displayName || t("profile.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease }}
          className="glass-card-elevated p-7 mb-6"
        >
          <div className="grid grid-cols-2 gap-6 text-center">
            <button onClick={() => navigate("/library")} className="group hover:bg-muted/20 rounded-xl p-3 transition-colors">
              <div className="font-display text-3xl font-bold gradient-text">{songCount}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium group-hover:text-foreground transition-colors">{t("profile.songs")}</div>
            </button>
            <button onClick={() => navigate("/library")} className="group hover:bg-muted/20 rounded-xl p-3 transition-colors">
              <div className="font-display text-3xl font-bold gradient-text">{favCount}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium group-hover:text-foreground transition-colors">{t("profile.favorites")}</div>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease }}
          className="glass-card-elevated p-7 space-y-5"
        >
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("profile.name")}</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300" />
          </div>

          {/* Field of study selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              {t("profile.field_of_study")}
            </Label>
            <Select value={fieldOfStudy} onValueChange={setFieldOfStudy}>
              <SelectTrigger className="bg-muted/15 border-border/20 h-11 rounded-xl">
                <SelectValue placeholder={t("profile.field_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span>{s.emoji}</span>
                      <span>{t(`subjects.${s.id}`, s.id)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* University */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              {t("profile.university", "Établissement")}
            </Label>
            <Input
              placeholder={t("profile.university_placeholder", "Ex : Sorbonne, Nanterre, Polytechnique...")}
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300"
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              {t("profile.country", "Pays")}
            </Label>
            <Input
              placeholder={t("profile.country_placeholder", "Ex : France, Belgique, Suisse...")}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-muted/15 border-border/20 h-11 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300"
            />
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSave} className="w-full gradient-bg-premium gap-2 h-12 rounded-xl shadow-lg shadow-primary/20" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saving ? t("profile.saving") : t("profile.save")}
            </Button>
          </motion.div>
        </motion.div>

        {/* Subscription management */}
        {isPro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease }}
            className="glass-card-elevated p-7 mt-6"
          >
            <h3 className="font-display font-semibold mb-2">{t("profile.subscription_title", "Abonnement Pro")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("profile.subscription_text", "Gère ton abonnement, change de moyen de paiement ou annule.")}</p>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleManageSubscription} disabled={managingSubscription} className="w-full gap-2 rounded-xl h-11" variant="outline">
                {managingSubscription ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {t("profile.manage_subscription", "Gérer mon abonnement")}
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Resume Action ── */}
        {reviewQueue.stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease }}
            className="mt-6"
          >
            <ResumeLastActionCard
              action={{ type: "review_queue", count: reviewQueue.stats.total } as ResumeAction}
              onResume={() => {
                track({ event_name: "review_queue_viewed" });
                track({ event_name: "session_resumed" });
              }}
            />
          </motion.div>
        )}

        {/* ── Learning Dashboard ── */}
        {learner.profile && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease }}
            className="glass-card-elevated p-7 mt-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" /> {t("product.cognitive_dashboard")}
            </h2>

            <ProfileStatusCard
              profile={learner.profile}
              bestFormat={(learner.profile as any).best_format ?? null}
              guidanceNeed={(learner.profile as any).guidance_need ?? null}
              calibrationQuality={(learner.profile as any).confidence_calibration_quality ?? null}
            />

            <MasteryOverviewCard stats={learner.stats} />

            <FragileConceptsCard concepts={learner.fragileConcepts} />

            <AgingConceptsCard concepts={learner.knowledgeGraph} />

            <ReviewQueueCard queue={reviewQueue.queue} />

            <BestFormatCard records={learner.formatRecords} />

            <ProgressTimelineCard snapshots={progressSnapshots.snapshots} />

            <CalibrationTrendCard snapshots={progressSnapshots.snapshots} />
          </motion.div>
        )}

        {/* ── Guardian / Minor Mode ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5, ease }}
          className="glass-card-elevated p-7 mt-6"
        >
          <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> {t("guardian.profile_section_title")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t("guardian.profile_manage_desc")}
          </p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => navigate("/guardian-settings")}
              className="w-full gap-2 rounded-xl h-11"
              variant="outline"
            >
              <Shield className="w-4 h-4" /> {t("guardian.profile_manage_link")}
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease }}
          className="glass-card-elevated p-7 mt-6 border-destructive/20"
        >
          <h3 className="font-display font-semibold text-destructive mb-2">{t("profile.danger_zone")}</h3>
          <p className="text-sm text-muted-foreground mb-5">{t("profile.danger_text")}</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2 rounded-xl h-11">
                <Trash2 className="w-4 h-4" /> {t("profile.delete_account")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card-elevated border-border/20">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("profile.delete_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("profile.delete_confirm_text")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">{t("profile.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">{t("profile.delete_forever")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
