// ============================================================
// MissionAnalysis Page — View detailed analysis for a document
// ============================================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DocumentQualityPanel } from "@/components/cognitio/DocumentQualityPanel";
import { ConceptList } from "@/components/cognitio/ConceptList";
import { ConfusionPairsCard } from "@/components/cognitio/ConfusionPairsCard";
import AmbiguityWarning from "@/components/cognitio/AmbiguityWarning";
import { MemoryPlanCard } from "@/components/cognitio/MemoryPlanCard";
import { MemorySegmentsList } from "@/components/cognitio/MemorySegmentsList";
import { RepetitionPlanCard } from "@/components/cognitio/RepetitionPlanCard";
import { MnemonicsCard } from "@/components/cognitio/MnemonicsCard";
import { VisualAnchorsCard } from "@/components/cognitio/VisualAnchorsCard";
import { CognitiveBudgetCard } from "@/components/cognitio/CognitiveBudgetCard";
import { FormatDecisionCard } from "@/components/cognitio/FormatDecisionCard";
import { PedagogicalContractCard } from "@/components/cognitio/PedagogicalContractCard";
import { supabase } from "@/integrations/supabase/client";
import type { M1_Output, M2_Output, AnalyzedConcept, AnalyzedConfusionPair, AnalyzedTrap, AnalysisConfidence, SegmentOutput } from "@/domain/cognitio/contracts";
import type { M3_Output } from "@/domain/cognitio/memory.contracts";
import type { M4_Output } from "@/domain/cognitio/format.contracts";
import type { AmbiguousZone } from "@/domain/cognitio/types";
import type { FormatOverride, FormatDecisionModule, CostLevel } from "@/domain/cognitio/format.types";
import type { ChosenFormat } from "@/domain/cognitio/types";

export default function MissionAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [m1Output, setM1Output] = useState<M1_Output | null>(null);
  const [m2Output, setM2Output] = useState<M2_Output | null>(null);
  const [m3Output, setM3Output] = useState<M3_Output | null>(null);
  const [m4Output, setM4Output] = useState<M4_Output | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      try {
        // Load source document
        const { data: doc, error: docError } = await (supabase as any)
          .from("source_documents")
          .select("*")
          .eq("id", id)
          .single();

        if (docError || !doc) {
          setError("Document non trouvé");
          return;
        }

        // Load segments
        const { data: segments } = await supabase
          .from("document_segments")
          .select("*")
          .eq("document_id", id)
          .order("segment_index");

        // Build M1 output from stored data
        const m1: M1_Output = {
          document_id: doc.id,
          clean_text: "",
          word_count: doc.word_count ?? 0,
          language: doc.detected_language ?? doc.source_language ?? "unknown",
          source_type: doc.detailed_source_type ?? "unknown",
          confidence_level: doc.quality_score ?? 0,
          detected_structure: doc.detected_structure ?? "minimal",
          issues: doc.warnings_json ?? [],
          segments: (segments ?? []).map((s: Record<string, unknown>) => ({
            segment_index: s.segment_index as number,
            title: s.title as string | null,
            content: s.content as string,
            hierarchy_level: s.hierarchy_level as number,
            confidence_score: s.confidence_score as number,
            page_ref: s.page_ref as string | null,
          })),
        };

        setM1Output(m1);

        // Load course profile
        const { data: profile } = await supabase
          .from("course_profiles")
          .select("*")
          .eq("document_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (profile) {
          // Load concepts
          const { data: concepts } = await supabase
            .from("concepts")
            .select("*")
            .eq("course_profile_id", profile.id)
            .order("criticality");

          // Load confusion pairs
          const { data: pairs } = await supabase
            .from("confusion_pairs")
            .select("*")
            .eq("course_profile_id", profile.id);

          const keyConcepts: AnalyzedConcept[] = (concepts ?? []).map((c: Record<string, unknown>) => ({
            stable_key: c.stable_key as string,
            label: c.label as string,
            definition: (c.definition as string) ?? "",
            type: (c.concept_type as string) ?? (c.category as string) ?? "general",
            criticality: (c.criticality as number) ?? 3,
            criticality_score: (c.criticality_score as number) ?? 0.5,
            bloom_target: (c.bloom_target as string) ?? "remember",
            relations: Array.isArray(c.relations_json) ? c.relations_json as AnalyzedConcept["relations"] : [],
            prerequisites: Array.isArray(c.prerequisites_json) ? c.prerequisites_json as string[] : [],
            source_confidence: (c.source_confidence as number) ?? 0.5,
            source_trace: Array.isArray(c.source_trace_json) ? c.source_trace_json as AnalyzedConcept["source_trace"] : [],
            uncertain: (c.uncertain as boolean) ?? false,
          }));

          const confusionPairs: AnalyzedConfusionPair[] = (pairs ?? []).map((p: Record<string, unknown>) => ({
            concept_a_key: (p.concept_a_id as string) ?? "",
            concept_b_key: (p.concept_b_id as string) ?? "",
            distinction_key: (p.distinction_key as string) ?? "",
            frequency: (p.frequency as number) ?? 1,
          }));

          const traps: AnalyzedTrap[] = Array.isArray(profile.traps_json)
            ? (profile.traps_json as AnalyzedTrap[])
            : [];

          const confidence: AnalysisConfidence = {
            concepts: (profile.concepts_confidence as number) ?? 0,
            logic: (profile.logic_confidence as number) ?? 0,
            traps: (profile.traps_confidence as number) ?? 0,
            structure: (profile.structure_confidence as number) ?? 0,
            ambiguous_zones: Array.isArray(profile.ambiguous_zones_json) ? profile.ambiguous_zones_json as AmbiguousZone[] : [],
          };

          const m2: M2_Output = {
            course_profile_id: profile.id,
            main_topic: (profile.main_topic as string) ?? "",
            learning_objectives: Array.isArray(profile.learning_objectives_json) ? profile.learning_objectives_json as string[] : [],
            key_concepts: keyConcepts,
            traps,
            confusion_pairs: confusionPairs,
            reasoning_type: (profile.reasoning_type as M2_Output["reasoning_type"]) ?? "declaratif",
            density: (profile.density as M2_Output["density"]) ?? "medium",
            recommended_template: (profile.recommended_template as M2_Output["recommended_template"]) ?? "fiche_dynamique",
            confidence,
            prerequis: Array.isArray(profile.prerequis_json) ? profile.prerequis_json as string[] : [],
            structure_type: m1.detected_structure as M2_Output["structure_type"],
            source_issues: Array.isArray(profile.source_issues_json) ? profile.source_issues_json as M2_Output["source_issues"] : [],
            total_concepts: keyConcepts.length,
            critical_count: keyConcepts.filter((c) => c.criticality === 1).length,
            estimated_complexity: (profile.estimated_complexity as number) ?? 5,
          };

          setM2Output(m2);

          // Load memory architecture (M3)
          const { data: arch } = await supabase
            .from("memory_architectures")
            .select("*")
            .eq("document_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (arch) {
            const m3: M3_Output = {
              architecture_id: arch.id,
              document_id: arch.document_id,
              course_profile_id: arch.course_profile_id,
              segments: arch.segments_json as M3_Output["segments"],
              concept_order: arch.concept_order_json as string[],
              repetition_plan: arch.repetition_plan_json as M3_Output["repetition_plan"],
              mnemonics: arch.mnemonics_json as M3_Output["mnemonics"],
              visual_anchors: arch.visual_anchors_json as M3_Output["visual_anchors"],
              cognitive_budget: arch.cognitive_budget_json as M3_Output["cognitive_budget"],
              pedagogical_contract: arch.pedagogical_contract_json as M3_Output["pedagogical_contract"],
              total_duration_sec: arch.total_duration_sec,
              needs_splitting: arch.needs_splitting,
              split_modules: arch.split_modules_json as M3_Output["split_modules"],
              reasoning_type: arch.reasoning_type as M3_Output["reasoning_type"],
              objective: arch.objective as M3_Output["objective"],
            };
            setM3Output(m3);

            // Load format decision (M4)
            const { data: decision } = await supabase
              .from("format_decisions")
              .select("*")
              .eq("architecture_id", arch.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (decision) {
              const m4: M4_Output = {
                decision_id: decision.id,
                architecture_id: decision.architecture_id,
                chosen_format: decision.chosen_format as ChosenFormat,
                justification: decision.justification,
                matrix_reasoning: decision.matrix_reasoning,
                estimated_duration_sec: decision.estimated_duration_sec,
                needs_split: decision.needs_split,
                split_count: decision.split_count ?? undefined,
                modules: decision.modules_json as FormatDecisionModule[] | undefined,
                overrides_applied: decision.overrides_applied_json as FormatOverride[],
                cost_level: decision.cost_level as CostLevel,
                decision_trace: decision.decision_trace_json as M4_Output["decision_trace"],
              };
              setM4Output(m4);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

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

  if (error || !m1Output) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 pt-24 text-center">
          <p className="text-red-500 mb-4">{error || "Document non trouvé"}</p>
          <Button variant="outline" onClick={() => navigate("/create")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Analyse pédagogique
            </h1>
            {m2Output?.main_topic && (
              <p className="text-sm text-muted-foreground">{m2Output.main_topic}</p>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quality panel */}
          <div className="border rounded-lg p-4">
            <DocumentQualityPanel m1Output={m1Output} m2Output={m2Output} />
          </div>

          {/* Memory Architecture (M3) */}
          {m3Output && (
            <>
              <div className="border rounded-lg p-4">
                <MemoryPlanCard output={m3Output} />
              </div>

              <div className="border rounded-lg p-4">
                <PedagogicalContractCard contract={m3Output.pedagogical_contract} />
              </div>

              <div className="border rounded-lg p-4">
                <CognitiveBudgetCard budget={m3Output.cognitive_budget} />
              </div>

              <div className="border rounded-lg p-4">
                <MemorySegmentsList segments={m3Output.segments} />
              </div>

              {m3Output.repetition_plan.length > 0 && (
                <div className="border rounded-lg p-4">
                  <RepetitionPlanCard plan={m3Output.repetition_plan} />
                </div>
              )}

              {m3Output.mnemonics.length > 0 && (
                <div className="border rounded-lg p-4">
                  <MnemonicsCard mnemonics={m3Output.mnemonics} />
                </div>
              )}

              {m3Output.visual_anchors.length > 0 && (
                <div className="border rounded-lg p-4">
                  <VisualAnchorsCard anchors={m3Output.visual_anchors} />
                </div>
              )}
            </>
          )}

          {/* Format Decision (M4) */}
          {m4Output && (
            <div className="border rounded-lg p-4">
              <FormatDecisionCard decision={m4Output} />
            </div>
          )}

          {/* Concepts */}
          {m2Output && m2Output.key_concepts.length > 0 && (
            <div className="border rounded-lg p-4">
              <ConceptList concepts={m2Output.key_concepts} showAll maxDisplay={30} />
            </div>
          )}

          {/* Confusions & Traps */}
          {m2Output && (m2Output.confusion_pairs.length > 0 || m2Output.traps.length > 0) && (
            <div className="border rounded-lg p-4">
              <ConfusionPairsCard
                confusionPairs={m2Output.confusion_pairs}
                traps={m2Output.traps}
              />
            </div>
          )}

          {/* Ambiguities */}
          {m2Output?.confidence.ambiguous_zones && m2Output.confidence.ambiguous_zones.length > 0 && (
            <AmbiguityWarning zones={m2Output.confidence.ambiguous_zones as AmbiguousZone[]} />
          )}

          {/* Learning objectives */}
          {m2Output?.learning_objectives && m2Output.learning_objectives.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Objectifs d'apprentissage</h3>
              <ul className="space-y-1">
                {m2Output.learning_objectives.map((obj, i) => (
                  <li key={i} className="text-sm text-muted-foreground">- {obj}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Prerequisites */}
          {m2Output?.prerequis && m2Output.prerequis.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Prérequis détectés</h3>
              <ul className="space-y-1">
                {m2Output.prerequis.map((p, i) => (
                  <li key={i} className="text-sm text-muted-foreground">- {p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center max-w-lg mx-auto">
            Cette analyse est produite automatiquement. Les zones d'incertitude sont signalées.
            Aucune notion n'est affichée comme fiable si elle n'est pas traçable dans le texte source.
          </p>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
