// ============================================================
// CognitioLibrary — List user's generated COGNITIO transformations
// ============================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, Plus, Clock, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import { getUserTransformations } from "@/services/cognitio/dynamic-sheet.service";
import { useTranslation } from "react-i18next";

interface TransformationSummary {
  id: string;
  document_id: string;
  format: string;
  published_status: string;
  estimated_duration_sec: number;
  created_at: string;
}

export default function CognitioLibrary() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransformationSummary[]>([]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const data = await getUserTransformations(session!.user.id);
      setItems(data as TransformationSummary[]);
      setLoading(false);
    }

    load();
  }, [session]);

  const STATUS_KEYS: Record<string, string> = {
    draft: "cognitio_library.status_draft",
    published: "cognitio_library.status_published",
    archived: "cognitio_library.status_archived",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              {t("cognitio_library.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("cognitio_library.subtitle")}
            </p>
          </div>
          <Button onClick={() => navigate("/create")}>
            <Plus className="h-4 w-4 mr-2" /> {t("cognitio_library.new_sheet")}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {t("cognitio_library.empty")}
            </p>
            <Button variant="outline" onClick={() => navigate("/create")}>
              <Plus className="h-4 w-4 mr-2" /> {t("cognitio_library.create_first")}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                className="w-full text-left border rounded-lg p-4 hover:border-primary/30 transition"
                onClick={() => navigate(`/transformation/${item.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {item.format === "fiche_dynamique" ? t("cognitio_library.format_fiche_dynamique") : item.format}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString(i18n.language, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.published_status === "published" ? "default" : "secondary"} className="text-xs">
                      {t(STATUS_KEYS[item.published_status] ?? item.published_status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{Math.ceil(item.estimated_duration_sec / 60)} min
                    </span>
                  </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
