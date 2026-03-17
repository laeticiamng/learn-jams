import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, CheckCircle2, XCircle, Loader2, RotateCcw, Trophy, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { usePageSEO } from "@/hooks/usePageSEO";

interface Question { question: string; options: string[]; correctIndex: number; explanation: string; }

export default function Quiz() {
  const { t } = useTranslation();
  usePageSEO({ title: "Quiz — StudyBeats", description: "Quiz", noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [songTitle, setSongTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const fetchQuiz = async () => {
    if (!id || !user) return;
    setLoading(true); setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setFinished(false); setQuestions([]);
    try {
      const { data: song } = await supabase.from("songs").select("title").eq("id", id).single();
      if (song) setSongTitle(song.title);
      const { data, error } = await supabase.functions.invoke("generate-quiz", { body: { songId: id, lang: i18next.language } });
      if (error) throw error;
      if (data?.questions) setQuestions(data.questions);
      else throw new Error("Invalid quiz format");
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Internal error";
      toast.error(message || t("quiz.impossible"));
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchQuiz recreated each render; deps [id, user] are the real triggers
  useEffect(() => { fetchQuiz(); }, [id, user]);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index); setAnswered(true);
    if (index === questions[current].correctIndex) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) setFinished(true);
    else { setCurrent(c => c + 1); setSelected(null); setAnswered(false); }
  };

  const scorePercent = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const scoreEmoji = scorePercent >= 80 ? "🏆" : scorePercent >= 60 ? "👏" : scorePercent >= 40 ? "💪" : "📚";

  const ambientOrbs = (
    <ParallaxOrbs orbs={[
      { className: "fixed top-0 left-1/3 w-[300px] sm:w-[450px] md:w-[600px] h-[250px] sm:h-[350px] md:h-[400px] pointer-events-none ambient-orb", style: { background: "hsl(265, 90%, 60%)", opacity: 0.1 } },
      { className: "fixed bottom-20 right-1/4 w-[200px] sm:w-[300px] md:w-[400px] h-[200px] sm:h-[250px] md:h-[300px] pointer-events-none ambient-orb", style: { background: "hsl(215, 80%, 55%)", animationDelay: "4s", opacity: 0.08 } },
    ]} />
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Navbar />
      {ambientOrbs}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("quiz.generating")}</p>
        <p className="text-xs text-muted-foreground">{t("quiz.generating_sub")}</p>
      </div>
      <Footer />
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Navbar />
      {ambientOrbs}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10">
        <Brain className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("quiz.impossible")}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/player/${id}`)} className="rounded-xl">{t("quiz.back_to_player")}</Button>
          <Button className="gradient-bg-premium rounded-xl" onClick={fetchQuiz}>{t("quiz.retry")}</Button>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (finished) return (
    <div className="min-h-screen flex flex-col bg-background px-4 relative overflow-hidden">
      <Navbar />
      {ambientOrbs}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card-elevated p-6 sm:p-8 max-w-md w-full text-center space-y-5 sm:space-y-6">
          <div className="text-6xl">{scoreEmoji}</div>
          <h2 className="font-display text-2xl font-bold">{t("quiz.finished")}</h2>
          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary">{score}/{questions.length}</div>
            <p className="text-muted-foreground">{t("quiz.score_percent", { percent: scorePercent })}</p>
          </div>
          <Progress value={scorePercent} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {scorePercent >= 80 ? t("quiz.score_excellent") : scorePercent >= 60 ? t("quiz.score_good") : t("quiz.score_keep_going")}
          </p>
          <div className="flex flex-col gap-3">
            <Button className="gradient-bg-premium gap-2 rounded-xl" onClick={fetchQuiz}><RotateCcw className="w-4 h-4" /> {t("quiz.restart")}</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate(`/player/${id}`)}>{t("quiz.back_to_player")}</Button>
            <Button variant="ghost" className="rounded-xl" onClick={() => navigate("/library")}>{t("quiz.my_library")}</Button>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );

  const q = questions[current];

  return (
    <div className="min-h-screen flex flex-col bg-background px-4 relative overflow-hidden">
      <Navbar />
      {ambientOrbs}

      <div className="flex-1 max-w-2xl mx-auto w-full pt-24 sm:pt-28 pb-16 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/player/${id}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0"><Brain className="w-4 h-4 shrink-0" /><span className="truncate">{songTitle}</span></div>
        </div>

        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t("quiz.question_of", { current: current + 1, total: questions.length })}</span>
            <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {score}</span>
          </div>
          <Progress value={((current + 1) / questions.length) * 100} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            {/* Question card - brighter */}
            <div className="glass-card-elevated p-6 md:p-8">
              <h2 className="font-display text-lg md:text-xl font-semibold leading-relaxed text-foreground">{q.question}</h2>
            </div>

            {/* Option cards - lighter background */}
            <div className="space-y-3">
              {q.options.map((option, i) => {
                const isCorrect = i === q.correctIndex;
                const isSelected = i === selected;
                let cardStyle = "rounded-2xl border p-4 md:p-5 cursor-pointer transition-all duration-300";
                
                if (answered) {
                  if (isCorrect) cardStyle += " border-green-500/50 bg-green-500/10";
                  else if (isSelected && !isCorrect) cardStyle += " border-destructive/50 bg-destructive/10";
                  else cardStyle += " border-border/20 bg-card/40 opacity-50";
                } else {
                  cardStyle += " border-border/30 bg-card/60 hover:bg-card/80 hover:border-primary/30";
                }

                return (
                  <motion.button
                    key={i}
                    onClick={() => handleSelect(i)}
                    className={`${cardStyle} w-full text-left flex items-center gap-4`}
                    whileHover={!answered ? { scale: 1.01 } : {}}
                    whileTap={!answered ? { scale: 0.98 } : {}}
                  >
                    <span className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center text-sm font-semibold text-foreground/70 shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-foreground/90">{option}</span>
                    {answered && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                    {answered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                  </motion.button>
                );
              })}
            </div>

            {answered && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card-elevated p-5 border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="w-4 h-4" /> {t("quiz.explanation")}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>
              </motion.div>
            )}
            {answered && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button className="w-full gradient-bg-premium h-12 text-base rounded-xl" onClick={handleNext}>
                  {current + 1 >= questions.length ? t("quiz.see_results") : t("quiz.next")}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
