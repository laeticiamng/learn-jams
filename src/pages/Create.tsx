// ============================================================
// Create Page — Import & Transform (M1 + M2 + M3 + M4 + M5 Pipeline)
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Brain, FileText, AlertTriangle, RotateCcw, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImportDropzone from "@/components/cognitio/ImportDropzone";
import IngestionStatus from "@/components/cognitio/IngestionStatus";
import { DocumentQualityPanel } from "@/components/cognitio/DocumentQualityPanel";
import { ConceptList } from "@/components/cognitio/ConceptList";
import { ConfusionPairsCard } from "@/components/cognitio/ConfusionPairsCard";
import { AmbiguityWarning } from "@/components/cognitio/AmbiguityWarning";
import { MemoryPlanCard } from "@/components/cognitio/MemoryPlanCard";
import { MemorySegmentsList } from "@/components/cognitio/MemorySegmentsList";
import { RepetitionPlanCard } from "@/components/cognitio/RepetitionPlanCard";
import { MnemonicsCard } from "@/components/cognitio/MnemonicsCard";
import { VisualAnchorsCard } from "@/components/cognitio/VisualAnchorsCard";
import { CognitiveBudgetCard } from "@/components/cognitio/CognitiveBudgetCard";
import { FormatDecisionCard } from "@/components/cognitio/FormatDecisionCard";
import { PedagogicalContractCard } from "@/components/cognitio/PedagogicalContractCard";
import { DynamicSheetLayout } from "@/components/cognitio/DynamicSheetLayout";
import { useDocumentIngestion } from "@/hooks/useDocumentIngestion";
import { useCourseAnalysis } from "@/hooks/useCourseAnalysis";
import { useMemoryArchitecture } from "@/hooks/useMemoryArchitecture";
import { useFormatDecision } from "@/hooks/useFormatDecision";
import { useDynamicSheetGeneration } from "@/hooks/useDynamicSheetGeneration";
import type { IngestInput } from "@/domain/cognitio/contracts";
import type { AmbiguousZone, LearningObjective } from "@/domain/cognitio/types";

type Phase = "import" | "ingesting" | "analyzing" | "architecting" | "formatting" | "generating" | "result";

export default function Create() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("import");
  const [objective, setObjective] = useState<LearningObjective>("discovery");

  const ingestion = useDocumentIngestion();
  const analysis = useCourseAnalysis();
  const memory = useMemoryArchitecture();
  const format = useFormatDecision();
  const generation = useDynamicSheetGeneration();

  const handleImport = async (input: IngestInput) => {
    setObjective(input.objective);
    setPhase("ingesting");

    await ingestion.ingest(input);

    if (ingestion.error) return;
  };

  // When ingestion completes, start analysis
  const handleIngestionComplete = async () => {
    if (!ingestion.result) return;

    const hasBlocking = ingestion.result.issues.some((i) => i.severity === "blocking");
    if (hasBlocking) {
      setPhase("result");
      return;
    }

    setPhase("analyzing");
    await analysis.analyze(ingestion.result, objective);

    if (analysis.error || !analysis.result) {
      setPhase("result");
      return;
    }

    // M3: Memory Architecture
    setPhase("architecting");
    await memory.build(analysis.result, ingestion.result.document_id, objective);

    if (memory.error || !memory.result) {
      setPhase("result");
      return;
    }

    // M4: Format Selection
    setPhase("formatting");
    await format.decide(
      memory.result,
      analysis.result,
      ingestion.result.document_id,
      ingestion.result.confidence_level,
      objective
    );

    if (format.error || !format.result) {
      setPhase("result");
      return;
    }

    // M5: Generate dynamic sheet if format is fiche_dynamique
    if (format.result.chosen_format === "fiche_dynamique") {
      setPhase("generating");
      await generation.generate(
        analysis.result,
        memory.result,
        format.result,
        ingestion.result.document_id,
        ingestion.result.word_count,
        ingestion.result.source_type,
        ingestion.result.confidence_level,
        ingestion.result.issues.map((i) => i.message),
        objective
      );
    }

    setPhase("result");
  };

  // Auto-trigger analysis when ingestion completes
  if (phase === "ingesting" && !ingestion.isRunning && ingestion.result && !ingestion.error) {
    handleIngestionComplete();
  }

  const handleReset = () => {
    ingestion.reset();
    analysis.reset();
    memory.reset();
    format.reset();
    generation.reset();
    setPhase("import");
  };

  const allSteps = [
    ...ingestion.steps,
    ...(["analyzing", "architecting", "formatting", "generating", "result"].includes(phase) ? analysis.steps : []),
    ...(["architecting", "formatting", "generating", "result"].includes(phase) ? memory.steps : []),
    ...(["formatting", "generating", "result"].includes(phase) ? format.steps : []),
    ...(["generating", "result"].includes(phase) ? generation.steps : []),
  ];

  const phaseTitle = {
    ingesting: "Import en cours",
    analyzing: "Analyse pédagogique",
    architecting: "Architecture mémoire",
    formatting: "Sélection du format",
    generating: "Génération de la fiche",
  }[phase as string] ?? "Progression";

  const hasBlocking = ingestion.result?.issues.some((i) => i.severity === "blocking") ?? false;
  const anyError = ingestion.error || analysis.error || memory.error || format.error || generation.error;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Importer & Analyser</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Importez votre cours, le moteur COGNITIO l'analyse et construit votre plan d'apprentissage.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Phase 1: Import */}
          {phase === "import" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ImportDropzone onImport={handleImport} />
            </motion.div>
          )}

          {/* Phase 2-5: Progress */}
          {(phase === "ingesting" || phase === "analyzing" || phase === "architecting" || phase === "formatting" || phase === "generating") && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <IngestionStatus
                steps={allSteps}
                title={phaseTitle}
              />

              {/* Show error if any */}
              {anyError && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Erreur</p>
                      <p className="text-sm text-red-600">{anyError}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Recommencer
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Phase 6: Result */}
          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header message */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-1">
                  {hasBlocking
                    ? "Le document ne peut pas être analysé en l'état"
                    : generation.result
                      ? "Fiche dynamique générée avec succès"
                      : format.result
                        ? "Architecture mémoire et format sélectionnés"
                        : analysis.result
                          ? "Voilà ce que le moteur a compris"
                          : "Analyse terminée"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasBlocking
                    ? "Des problèmes bloquants ont été détectés. Consultez les détails ci-dessous."
                    : generation.result
                      ? "Votre fiche pédagogique est prête. Consultez-la ci-dessous ou accédez-y depuis votre bibliothèque."
                      : "Les résultats ci-dessous montrent l'analyse, l'architecture mémoire et le format choisi."}
                </p>
              </div>

              {/* Generated Dynamic Sheet */}
              {generation.result && (
                <div className="border rounded-lg p-4">
                  <DynamicSheetLayout output={generation.result} />
                </div>
              )}

              {/* Document quality panel */}
              {ingestion.result && (
                <div className="border rounded-lg p-4">
                  <DocumentQualityPanel
                    m1Output={ingestion.result}
                    m2Output={analysis.result}
                  />
                </div>
              )}

              {/* Memory Architecture */}
              {memory.result && (
                <>
                  <div className="border rounded-lg p-4">
                    <MemoryPlanCard output={memory.result} />
                  </div>

                  <div className="border rounded-lg p-4">
                    <PedagogicalContractCard contract={memory.result.pedagogical_contract} />
                  </div>

                  <div className="border rounded-lg p-4">
                    <CognitiveBudgetCard budget={memory.result.cognitive_budget} />
                  </div>

                  <div className="border rounded-lg p-4">
                    <MemorySegmentsList segments={memory.result.segments} />
                  </div>

                  {memory.result.repetition_plan.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <RepetitionPlanCard plan={memory.result.repetition_plan} />
                    </div>
                  )}

                  {memory.result.mnemonics.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <MnemonicsCard mnemonics={memory.result.mnemonics} />
                    </div>
                  )}

                  {memory.result.visual_anchors.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <VisualAnchorsCard anchors={memory.result.visual_anchors} />
                    </div>
                  )}
                </>
              )}

              {/* Format Decision */}
              {format.result && (
                <div className="border rounded-lg p-4">
                  <FormatDecisionCard decision={format.result} />
                </div>
              )}

              {/* Concepts */}
              {analysis.result && analysis.result.key_concepts.length > 0 && (
                <div className="border rounded-lg p-4">
                  <ConceptList concepts={analysis.result.key_concepts} maxDisplay={10} />
                </div>
              )}

              {/* Confusions & Traps */}
              {analysis.result && (analysis.result.confusion_pairs.length > 0 || analysis.result.traps.length > 0) && (
                <div className="border rounded-lg p-4">
                  <ConfusionPairsCard
                    confusionPairs={analysis.result.confusion_pairs}
                    traps={analysis.result.traps}
                  />
                </div>
              )}

              {/* Ambiguity warnings */}
              {analysis.result?.confidence.ambiguous_zones && analysis.result.confidence.ambiguous_zones.length > 0 && (
                <AmbiguityWarning zones={analysis.result.confidence.ambiguous_zones as AmbiguousZone[]} />
              )}

              {/* Uncertain concepts warning */}
              {analysis.result && analysis.result.key_concepts.some((c) => c.uncertain) && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Concepts incertains</p>
                      <p className="text-xs text-yellow-600">
                        {analysis.result.key_concepts.filter((c) => c.uncertain).length} concept(s) n'ont pas pu
                        être pleinement tracé(s) dans le texte source. Ils sont marqués comme incertains et ne
                        seront pas promus comme fiables.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Learning objectives */}
              {analysis.result?.learning_objectives && analysis.result.learning_objectives.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Objectifs d'apprentissage détectés
                  </h3>
                  <ul className="space-y-1">
                    {analysis.result.learning_objectives.map((obj, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">-</span>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Importer un autre document
                </Button>

                {generation.result && (
                  <Button onClick={() => navigate(`/transformation/${generation.result!.transformation_id}`)}>
                    <Eye className="h-4 w-4 mr-2" /> Voir la fiche
                  </Button>
                )}

                {!hasBlocking && format.result && !generation.result && (
                  <Button disabled className="opacity-50 cursor-not-allowed">
                    <ArrowRight className="h-4 w-4 mr-2" /> Format non supporté pour la génération
                  </Button>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center mt-8 max-w-lg mx-auto">
                L'analyse est basée sur le contenu fourni. Le moteur ne prétend pas avoir compris ce qu'il ne comprend pas.
                Les zones d'incertitude sont signalées explicitement.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
