// ============================================================
// ReviewHub — Quiz / Revision landing page
// Shows available quizzes from user's missions and songs
// Accessible via /quiz (without :id param)
// ============================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck,
  Search,
  Plus,
  Brain,
  BookOpen,
  Clock,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ParallaxOrbs } from "@/components/ParallaxOrbs";
import { usePageSEO } from "@/hooks/usePageSEO";

interface QuizSource {
  id: string;
  title: string;
  type: "song" | "mission";
  created_at: string;
}

export default function ReviewHub() {
  const { t } = useTranslation();
  usePageSEO({
    title: t("review.title", "Révision — COGNITIO"),
    description: t("review.description", "Révisez vos cours avec des quiz adaptatifs"),
    noindex: true,
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sources, setSources] = useState<QuizSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchSources = async () => {
      setLoading(true);
      try {
        // Fetch songs
        const { data: songs } = await supabase
          .from("songs")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const songSources: QuizSource[] = (songs ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          type: "song" as const,
          created_at: s.created_at,
        }));

        setSources(songSources);
      } catch (err) {
        console.error("Failed to fetch quiz sources:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, [user]);

  const filtered = sources.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Navbar />
      <ParallaxOrbs
        orbs={[
          {
            className:
              "fixed top-0 left-1/3 w-[300px] sm:w-[450px] md:w-[600px] h-[250px] sm:h-[350px] md:h-[400px] pointer-events-none ambient-orb",
            style: { background: "hsl(265, 90%, 60%)", opacity: 0.08 },
          },
        ]}
      />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold gradient-text flex items-center gap-3">
              <ClipboardCheck className="w-7 h-7" />
              {t("review.title", "Révision")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("review.subtitle", "Testez vos connaissances avec des quiz générés par l'IA")}
            </p>
          </div>
          <Button
            onClick={() => navigate("/create")}
            className="gradient-bg-premium rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("review.new_content", "Importer un cours")}
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("review.search_placeholder", "Rechercher un quiz...")}
            className="pl-10 rounded-xl bg-card/50 border-border/20"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              {t("review.loading", "Chargement des quiz...")}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">
                {search
                  ? t("review.no_results", "Aucun résultat")
                  : t("review.empty_title", "Pas encore de quiz")}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {search
                  ? t("review.no_results_desc", "Essayez un autre terme de recherche.")
                  : t(
                      "review.empty_desc",
                      "Importez un cours pour générer automatiquement des quiz de révision."
                    )}
              </p>
            </div>
            {!search && (
              <Button
                onClick={() => navigate("/create")}
                className="gradient-bg-premium rounded-xl"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t("review.import_first", "Créer mon premier quiz")}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((source, index) => (
              <motion.div
                key={source.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => navigate(`/quiz/${source.id}`)}
                  className="w-full text-left glass-card p-5 rounded-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          {source.type === "song" ? "Quiz" : "Mission"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {source.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(source.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
