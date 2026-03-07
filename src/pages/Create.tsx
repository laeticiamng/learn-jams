import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const stepLabels = ["Upload", "Style", "Génération"];

export default function Create() {
  const [step, setStep] = useState(0);
  const [courseText, setCourseText] = useState("");
  const [style, setStyle] = useState("pop");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const canNext = step === 0 ? courseText.trim().length > 20 : step === 1 ? !!style : false;

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    setProgress(10);

    try {
      // Step 1: Generate lyrics via AI
      setProgress(30);
      const { data: lyricsData, error: lyricsError } = await supabase.functions.invoke("generate-lyrics", {
        body: { text: courseText, style, title: title || "Sans titre" },
      });

      if (lyricsError) throw lyricsError;
      setProgress(50);

      const generatedLyrics = lyricsData?.lyrics || courseText.slice(0, 500);
      const generatedTitle = lyricsData?.title || title || "Ma chanson StudyBeats";

      // Step 2: Save song to DB
      const { data: song, error: insertError } = await supabase.from("songs").insert({
        user_id: user.id,
        title: generatedTitle,
        original_text: courseText,
        generated_lyrics: generatedLyrics,
        style,
        subject: subject || null,
        status: "generating",
      }).select().single();

      if (insertError) throw insertError;
      setProgress(70);

      // Step 3: Generate music via Suno
      const { data: musicData, error: musicError } = await supabase.functions.invoke("generate-music", {
        body: { songId: song.id, lyrics: generatedLyrics, style, title: generatedTitle },
      });

      if (musicError) throw musicError;
      setProgress(100);

      toast.success("Chanson en cours de génération ! 🎵");
      navigate(`/library`);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto pt-24 pb-12 px-4 max-w-3xl">
        {/* Progress indicator */}
        <div className="flex items-center gap-4 mb-12">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i <= step ? "gradient-bg text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
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
              <h2 className="font-display text-3xl font-bold mb-2">Upload ton cours 📚</h2>
              <p className="text-muted-foreground mb-8">Colle ton texte, uploade un PDF ou prends une photo</p>
              <CourseUploader text={courseText} onTextChange={setCourseText} />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-display text-3xl font-bold mb-2">Choisis ton style 🎶</h2>
              <p className="text-muted-foreground mb-8">Quel genre musical pour ta chanson ?</p>
              <StylePicker selected={style} onSelect={setStyle} />

              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                <div className="space-y-2">
                  <Label>Titre (optionnel)</Label>
                  <Input placeholder="Ex: L'anatomie du cœur" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Matière (optionnel)</Label>
                  <Input placeholder="Ex: Biologie" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-muted/50" />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-8">
              <h2 className="font-display text-3xl font-bold">Prêt à générer ? 🚀</h2>
              <div className="glass-card p-8 space-y-4 text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Texte</span>
                  <span>{courseText.length} caractères</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Style</span>
                  <span className="capitalize">{style}</span>
                </div>
                {title && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Titre</span><span>{title}</span></div>}
                {subject && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Matière</span><span>{subject}</span></div>}
              </div>

              {generating && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {progress < 30 ? "Analyse du cours..." : progress < 60 ? "Création des paroles..." : "Génération de la musique..."}
                  </p>
                </div>
              )}

              <Button size="lg" className="gradient-bg h-14 px-12 text-lg glow" onClick={handleGenerate} disabled={generating}>
                {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> Génération en cours...</> : <><Sparkles className="w-5 h-5" /> Générer ma chanson</>}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-12">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          {step < 2 && (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-2 gradient-bg">
              Suivant <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
