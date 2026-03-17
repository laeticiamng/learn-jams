// ============================================================
// TransformationView — View a generated dynamic sheet
// ============================================================

import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicSheetLayout } from "@/components/cognitio/DynamicSheetLayout";
import { useGeneratedTransformation } from "@/hooks/useGeneratedTransformation";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function TransformationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  usePageSEO({ title: "Vue transformation", description: "Consultez votre contenu généré", noindex: true });
  const { loading, error, data } = useGeneratedTransformation(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 pt-24 text-center">
          <p className="text-red-500 mb-4">{error || "Fiche non trouvée"}</p>
          <Button variant="outline" onClick={() => navigate("/library")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la bibliothèque
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Fiche dynamique
            </h1>
            <p className="text-sm text-muted-foreground">
              {data.internal_summary.learning_objective}
            </p>
          </div>
        </div>

        <DynamicSheetLayout output={data} />
      </main>

      <Footer />
    </div>
  );
}
