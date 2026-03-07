import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, CheckCircle2, XCircle, Loader2, RotateCcw, Trophy, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function Quiz() {
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
    setLoading(true);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
    setQuestions([]);

    try {
      const { data: song } = await supabase.from("songs").select("title").eq("id", id).single();
      if (song) setSongTitle(song.title);

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { songId: id },
      });

      if (error) throw error;
      if (data?.questions) {
        setQuestions(data.questions);
      } else {
        throw new Error("Format de quiz invalide");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Impossible de générer le quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuiz(); }, [id, user]);

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);
    if (index === questions[current].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const scorePercent = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const scoreEmoji = scorePercent >= 80 ? "🏆" : scorePercent >= 60 ? "👏" : scorePercent >= 40 ? "💪" : "📚";

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Génération du quiz en cours...</p>
        <p className="text-xs text-muted-foreground">L'IA analyse ton cours et tes paroles</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Brain className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Impossible de générer le quiz.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/player/${id}`)}>Retour au player</Button>
          <Button className="gradient-bg" onClick={fetchQuiz}>Réessayer</Button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 max-w-md w-full text-center space-y-6">
          <div className="text-6xl">{scoreEmoji}</div>
          <h2 className="font-display text-2xl font-bold">Quiz terminé !</h2>
          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary">{score}/{questions.length}</div>
            <p className="text-muted-foreground">{scorePercent}% de bonnes réponses</p>
          </div>
          <Progress value={scorePercent} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {scorePercent >= 80 ? "Excellent ! Tu maîtrises bien ce cours 🎉"
              : scorePercent >= 60 ? "Bon travail ! Continue à réviser 💪"
              : "Continue d'écouter la chanson pour mieux mémoriser 🎵"}
          </p>
          <div className="flex flex-col gap-3">
            <Button className="gradient-bg gap-2" onClick={fetchQuiz}>
              <RotateCcw className="w-4 h-4" /> Recommencer
            </Button>
            <Button variant="outline" onClick={() => navigate(`/player/${id}`)}>
              Retour au player
            </Button>
            <Button variant="ghost" onClick={() => navigate("/library")}>
              Ma bibliothèque
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/player/${id}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" />
            <span>{songTitle}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {current + 1}/{questions.length}</span>
            <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> {score}</span>
          </div>
          <Progress value={((current + 1) / questions.length) * 100} className="h-2" />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="font-display text-lg font-semibold leading-relaxed">{q.question}</h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((option, i) => {
                const isCorrect = i === q.correctIndex;
                const isSelected = i === selected;
                let optionClass = "glass-card p-4 cursor-pointer transition-all hover:border-primary/30";

                if (answered) {
                  if (isCorrect) optionClass = "glass-card p-4 border-green-500/50 bg-green-500/10";
                  else if (isSelected && !isCorrect) optionClass = "glass-card p-4 border-destructive/50 bg-destructive/10";
                  else optionClass = "glass-card p-4 opacity-50";
                }

                return (
                  <motion.button key={i} onClick={() => handleSelect(i)}
                    className={`${optionClass} w-full text-left flex items-center gap-3`}
                    whileTap={!answered ? { scale: 0.98 } : {}}>
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {answered && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                    {answered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 border-primary/20 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="w-4 h-4" /> Explication
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>
              </motion.div>
            )}

            {/* Next button */}
            {answered && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button className="w-full gradient-bg" onClick={handleNext}>
                  {current + 1 >= questions.length ? "Voir les résultats" : "Question suivante"}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
