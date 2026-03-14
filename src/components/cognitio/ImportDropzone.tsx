import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentType, LearningObjective } from "@/domain/cognitio/types";
import type { LearnerAudienceProfile, EducationStage, ExplanationStyle } from "@/domain/cognitio/learner-profile.types";
import { DEFAULT_LEARNER_PROFILE } from "@/domain/cognitio/learner-profile.types";

interface ImportDropzoneProps {
  onImport: (data: {
    file?: File;
    pasted_text?: string;
    content_type: ContentType;
    objective: LearningObjective;
    learner_profile?: LearnerAudienceProfile;
  }) => void;
  disabled?: boolean;
}

const OBJECTIVES: { value: LearningObjective; label: string; desc: string }[] = [
  { value: "discovery", label: "Découverte", desc: "Première approche du sujet" },
  { value: "revision", label: "Révision", desc: "Revoir un sujet déjà vu" },
  { value: "exam", label: "Examen", desc: "Préparation d'un examen" },
  { value: "consolidation", label: "Consolidation", desc: "Renforcer des acquis" },
];

const EDUCATION_STAGES: { value: EducationStage; label: string }[] = [
  { value: "middle_school", label: "Collège" },
  { value: "high_school", label: "Lycée" },
  { value: "undergrad", label: "Licence" },
  { value: "graduate", label: "Master" },
  { value: "professional", label: "Professionnel" },
  { value: "adult_reskilling", label: "Reprise d'études" },
  { value: "unknown", label: "Auto (prudent)" },
];

const EXPLANATION_STYLES: { value: ExplanationStyle; label: string }[] = [
  { value: "guided", label: "Très guidée" },
  { value: "balanced", label: "Équilibrée" },
  { value: "academic", label: "Académique" },
  { value: "professional", label: "Professionnelle" },
];

const ACCEPTED_TYPES: Record<string, ContentType> = {
  "application/pdf": "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain": "text/plain",
};

export default function ImportDropzone({ onImport, disabled }: ImportDropzoneProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [objective, setObjective] = useState<LearningObjective>("revision");
  const [educationStage, setEducationStage] = useState<EducationStage>("unknown");
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>("balanced");
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && isAcceptedFile(droppedFile)) {
      setFile(droppedFile);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isAcceptedFile(selected)) {
      setFile(selected);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const learner_profile: LearnerAudienceProfile = {
      ...DEFAULT_LEARNER_PROFILE,
      education_stage: educationStage,
      explanation_style: explanationStyle,
    };

    if (tab === "upload" && file) {
      const contentType = ACCEPTED_TYPES[file.type] ?? "text/plain";
      onImport({ file, content_type: contentType, objective, learner_profile });
    } else if (tab === "paste" && pastedText.trim()) {
      onImport({ pasted_text: pastedText.trim(), content_type: "text/plain", objective, learner_profile });
    }
  }, [tab, file, pastedText, objective, educationStage, explanationStyle, onImport]);

  const canSubmit =
    !disabled &&
    ((tab === "upload" && file !== null) || (tab === "paste" && pastedText.trim().length >= 50));

  return (
    <div className="space-y-6">
      {/* Objective selector */}
      <div>
        <label className="text-sm font-medium mb-3 block">{t("create.objective_label", { defaultValue: "Objectif d'apprentissage" })}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              onClick={() => setObjective(obj.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                objective === obj.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/30 hover:border-border/50 bg-card/50"
              }`}
            >
              <p className="text-sm font-medium">{obj.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{obj.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Learner profile selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">{t("create.level_label", { defaultValue: "Pour quel niveau ?" })}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {EDUCATION_STAGES.map((s) => (
              <button
                key={s.value}
                onClick={() => setEducationStage(s.value)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  educationStage === s.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 text-primary"
                    : "border-border/30 hover:border-border/50 bg-card/50 text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">{t("create.style_label", { defaultValue: "Style d'explication" })}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {EXPLANATION_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => setExplanationStyle(s.value)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  explanationStyle === s.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20 text-primary"
                    : "border-border/30 hover:border-border/50 bg-card/50 text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Import tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "paste")}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1 gap-2">
            <Upload className="w-4 h-4" /> {t("create.import_file", { defaultValue: "Importer un fichier" })}
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex-1 gap-2">
            <FileText className="w-4 h-4" /> {t("create.paste_text", { defaultValue: "Coller du texte" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : file
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border/30 hover:border-border/50"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileUp className="w-7 h-7 text-primary" />
            </div>

            {file ? (
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(0)} Ko
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="mt-3 text-muted-foreground"
                >
                  {t("create.change_file", { defaultValue: "Changer de fichier" })}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t("create.drop_hint", { defaultValue: "Glissez-déposez un fichier ici" })}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("create.file_types", { defaultValue: "PDF, DOCX ou TXT (max 50 Mo)" })}
                </p>
                <label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>{t("create.browse", { defaultValue: "Parcourir" })}</span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="paste" className="mt-4">
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={t("create.paste_placeholder", { defaultValue: "Collez le contenu de votre cours ici (minimum 50 caractères)..." })}
            className="min-h-[200px] rounded-xl resize-y"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {pastedText.trim().split(/\s+/).filter(Boolean).length} {t("create.word_count", { defaultValue: "mots" })}
          </p>
        </TabsContent>
      </Tabs>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        size="lg"
        className="w-full gradient-bg-premium rounded-xl h-12 text-base shadow-lg shadow-primary/20"
      >
        {t("create.submit_cta", { defaultValue: "Créer" })}
      </Button>
    </div>
  );
}

function isAcceptedFile(file: File): boolean {
  return file.type in ACCEPTED_TYPES || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt");
}
