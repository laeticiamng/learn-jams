import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import CourseUploader from "@/components/create/CourseUploader";
import StylePicker from "@/components/create/StylePicker";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const spring = { type: "spring", stiffness: 400, damping: 35 };
const fadeSlide = {
  initial: { opacity: 0, y: 24, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -16, filter: "blur(6px)" },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function Create() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0);
  const [courseText, setCourseText] = useState("");
  const [style, setStyle] = useState("pop");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const stepLabels = [t("create.step_upload"), t("create.step_style"), t("create.step_generate")];
  const canNext = step === 0 ? courseText.trim().length > 20 : step === 1 ? !!style : false;

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setProgress(10);

    try {
      setProgress(30);
      const { data: lyricsData, error: lyricsError } = await supabase.functions.invoke("generate-lyrics", {
        body: { text: courseText, style, title: title || "Sans titre", language: i18n.language },
      });
      if (lyricsError) throw lyricsError;
      setProgress(50);

      const generatedLyrics = lyricsData?.lyrics || courseText.slice(0, 500);
      const generatedTitle = lyricsData?.title || title || t("create.default_title");

      const { data: song, error: insertError } = await supabase.from("songs").insert({
        user_id: user.id, title: generatedTitle, original_text: courseText,
        generated_lyrics: generatedLyrics, style, subject: subject || null, status: "generating",
      }).select().single();
      if (insertError) throw insertError;
      setProgress(70);

      const { error: musicError } = await supabase.functions.invoke("generate-music", {
        body: { songId: song.id, lyrics: generatedLyrics, style, title: generatedTitle, language: i18n.language },
      });
      if (musicError) throw musicError;
      setProgress(100);

      toast.success(t("create.success"));
      navigate("/library");
    } catch (error: any) {
      toast.error(error.message || t("create.error_generic"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background mesh */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none opacity-40"
        style={{ background: "var(--gradient-glow)" }} />

      <Navbar />

      <div className="container mx-auto pt-28 pb-16 px-4 max-w-3xl relative z-10">
        {/* Apple-style stepper */}
        <div className="flex items-center gap-2 mb-16 max-w-md mx-auto">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-3 flex-1">
              <motion.div
                layout
                transition={spring}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500 shrink-0 ${
                  i < step
                    ? "gradient-bg text-primary-foreground shadow-lg shadow-primary/20"
                    : i === step
                    ? "gradient-bg text-primary-foreground glow-soft"
                    : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {i < step ? (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>
                    <Check className="w-4 h-4" />
                  </motion.div>
                ) : (
                  i + 1
                )}
              </motion.div>
              <span className={`text-sm hidden sm:block font-medium transition-colors duration-500 ${
                i <= step ? "text-foreground" : "text-muted-foreground/60"
              }`}>
                {label}
              </span>
              {i < 2 && (
                <div className="flex-1 h-[2px] rounded-full bg-muted/40 overflow-hidden">
                  <motion.div
                    className="h-full gradient-bg rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: i < step ? "100%" : "0%" }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" {...fadeSlide}>
              <div className="text-center mb-10">
                <h2 className="font-display text-4xl md:text-5xl font-bold mb-3 tracking-tight">
                  {t("create.upload_title")}
                </h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">{t("create.upload_subtitle")}</p>
              </div>
              <CourseUploader text={courseText} onTextChange={setCourseText} />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="step1" {...fadeSlide}>
              <div className="text-center mb-10">
                <h2 className="font-display text-4xl md:text-5xl font-bold mb-3 tracking-tight">
                  {t("create.style_title")}
                </h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">{t("create.style_subtitle")}</p>
              </div>
              <StylePicker selected={style} onSelect={setStyle} />
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="grid sm:grid-cols-2 gap-4 mt-10"
              >
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">{t("create.title_label")}</Label>
                  <Input
                    placeholder={t("create.title_placeholder")}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-muted/30 border-border/30 h-12 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">{t("create.subject_label")}</Label>
                  <Input
                    placeholder={t("create.subject_placeholder")}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-muted/30 border-border/30 h-12 rounded-xl focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step2" {...fadeSlide} className="text-center space-y-10">
              <div>
                <h2 className="font-display text-4xl md:text-5xl font-bold mb-3 tracking-tight">
                  {t("create.generate_title")}
                </h2>
              </div>

              {/* Summary card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="glass-card p-8 space-y-4 text-left max-w-lg mx-auto"
              >
                {[
                  { label: t("create.text_label"), value: `${courseText.length} ${t("create.chars")}` },
                  { label: t("create.style_label"), value: style },
                  ...(title ? [{ label: t("create.title_label"), value: title }] : []),
                  ...(subject ? [{ label: t("create.subject_label"), value: subject }] : []),
                ].map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex justify-between items-center text-sm py-2 border-b border-border/20 last:border-0"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium capitalize">{row.value}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Progress */}
              {generating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 max-w-lg mx-auto"
                >
                  <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 gradient-bg rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 shimmer-btn" style={{ background: "transparent" }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {progress < 30 ? t("create.analyzing") : progress < 60 ? t("create.creating_lyrics") : t("create.generating_music")}
                  </p>
                </motion.div>
              )}

              {/* Generate button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  size="lg"
                  className="gradient-bg h-14 px-12 text-lg rounded-2xl glow shimmer-btn hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {t("create.generating")}</>
                  ) : (
                    <><Sparkles className="w-5 h-5 mr-2" /> {t("create.generate_button")}</>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-between mt-16"
        >
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-2 rounded-xl h-11 px-6 hover:bg-muted/40 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> {t("create.back")}
          </Button>
          {step < 2 && (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="gap-2 gradient-bg rounded-xl h-11 px-6 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
            >
              {t("create.next")} <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
