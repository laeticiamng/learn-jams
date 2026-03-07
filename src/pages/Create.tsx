import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import CourseUploader from "@/components/create/CourseUploader";
import StylePicker from "@/components/create/StylePicker";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-24 pb-12 px-4 max-w-3xl">
        <div className="flex items-center gap-4 mb-12">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i <= step ? "gradient-bg text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${i < step ? "gradient-bg" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-display text-3xl font-bold mb-2">{t("create.upload_title")}</h2>
              <p className="text-muted-foreground mb-8">{t("create.upload_subtitle")}</p>
              <CourseUploader text={courseText} onTextChange={setCourseText} />
            </motion.div>
          )}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-display text-3xl font-bold mb-2">{t("create.style_title")}</h2>
              <p className="text-muted-foreground mb-8">{t("create.style_subtitle")}</p>
              <StylePicker selected={style} onSelect={setStyle} />
              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                <div className="space-y-2">
                  <Label>{t("create.title_label")}</Label>
                  <Input placeholder={t("create.title_placeholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>{t("create.subject_label")}</Label>
                  <Input placeholder={t("create.subject_placeholder")} value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-muted/50" />
                </div>
              </div>
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-8">
              <h2 className="font-display text-3xl font-bold">{t("create.generate_title")}</h2>
              <div className="glass-card p-8 space-y-4 text-left">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("create.text_label")}</span><span>{courseText.length} {t("create.chars")}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("create.style_label")}</span><span className="capitalize">{style}</span></div>
                {title && <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("create.title_label")}</span><span>{title}</span></div>}
                {subject && <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("create.subject_label")}</span><span>{subject}</span></div>}
              </div>
              {generating && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {progress < 30 ? t("create.analyzing") : progress < 60 ? t("create.creating_lyrics") : t("create.generating_music")}
                  </p>
                </div>
              )}
              <Button size="lg" className="gradient-bg h-14 px-12 text-lg glow" onClick={handleGenerate} disabled={generating}>
                {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> {t("create.generating")}</> : <><Sparkles className="w-5 h-5" /> {t("create.generate_button")}</>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between mt-12">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("create.back")}
          </Button>
          {step < 2 && (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-2 gradient-bg">
              {t("create.next")} <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
