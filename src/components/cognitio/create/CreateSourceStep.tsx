// ============================================================
// CreateSourceStep — File upload / paste text (step 2 of create flow)
// Focused solely on content input — no objective/level/style here.
// ============================================================

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentType } from "@/domain/cognitio/types";

const ACCEPTED_TYPES: Record<string, ContentType> = {
  "application/pdf": "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain": "text/plain",
};

export interface SourceData {
  file?: File;
  pasted_text?: string;
  content_type: ContentType;
}

interface CreateSourceStepProps {
  onSourceReady: (source: SourceData) => void;
  onSourceCleared: () => void;
  disabled?: boolean;
}

export function CreateSourceStep({ onSourceReady, onSourceCleared, disabled }: CreateSourceStepProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && isAcceptedFile(droppedFile)) {
      setFile(droppedFile);
      const contentType = ACCEPTED_TYPES[droppedFile.type] ?? "text/plain";
      onSourceReady({ file: droppedFile, content_type: contentType });
    }
  }, [onSourceReady]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isAcceptedFile(selected)) {
      setFile(selected);
      const contentType = ACCEPTED_TYPES[selected.type] ?? "text/plain";
      onSourceReady({ file: selected, content_type: contentType });
    }
  }, [onSourceReady]);

  const handleTextChange = useCallback((value: string) => {
    setPastedText(value);
    if (value.trim().length >= 50) {
      onSourceReady({ pasted_text: value.trim(), content_type: "text/plain" });
    } else {
      onSourceCleared();
    }
  }, [onSourceReady, onSourceCleared]);

  const clearFile = useCallback(() => {
    setFile(null);
    onSourceCleared();
  }, [onSourceCleared]);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-1">
          {t("create_flow.source_title", { defaultValue: "Ajoute ton cours" })}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t("create_flow.source_subtitle", { defaultValue: "Importe un fichier ou colle directement ton contenu." })}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "paste")}>
        <TabsList className="w-full">
          <TabsTrigger value="upload" className="flex-1 gap-2" disabled={disabled}>
            <Upload className="w-4 h-4" /> {t("create.import_file", { defaultValue: "Importer un fichier" })}
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex-1 gap-2" disabled={disabled}>
            <FileText className="w-4 h-4" /> {t("create.paste_text", { defaultValue: "Coller du texte" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : file
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border/30 hover:border-border/50"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <FileUp className="w-6 h-6 text-primary" />
            </div>

            {file ? (
              <div>
                <p className="font-medium text-green-600 dark:text-green-400 text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(0)} Ko
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="mt-2 text-muted-foreground text-xs"
                >
                  {t("create.change_file", { defaultValue: "Changer de fichier" })}
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("create.drop_hint", { defaultValue: "Glissez-déposez un fichier ici" })}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
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
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t("create.paste_placeholder", { defaultValue: "Collez le contenu de votre cours ici (minimum 50 caractères)..." })}
            className="min-h-[180px] rounded-xl resize-y"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {pastedText.trim().split(/\s+/).filter(Boolean).length} {t("create.word_count", { defaultValue: "mots" })}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function isAcceptedFile(file: File): boolean {
  return file.type in ACCEPTED_TYPES || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt");
}
