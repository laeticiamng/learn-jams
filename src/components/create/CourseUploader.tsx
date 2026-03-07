import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  text: string;
  onTextChange: (text: string) => void;
}

export default function CourseUploader({ text, onTextChange }: Props) {
  const [activeTab, setActiveTab] = useState<"text" | "pdf" | "image">("text");
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File, type: "pdf" | "image") => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 20 Mo)");
      return;
    }
    setFileName(file.name);
    // For now, show placeholder — edge functions for extraction will be added
    toast.info(`Fichier "${file.name}" uploadé. L'extraction du texte sera disponible bientôt.`);
  }, []);

  const tabs = [
    { id: "text" as const, label: "Texte", icon: FileText },
    { id: "pdf" as const, label: "PDF", icon: Upload },
    { id: "image" as const, label: "Image", icon: Image },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className={`gap-2 ${activeTab === tab.id ? "gradient-bg" : ""}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "text" ? (
        <Textarea
          placeholder="Colle ton cours ici... (anatomie, droit, histoire, physique...)"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="min-h-[200px] bg-muted/50 border-border/50 resize-none"
        />
      ) : (
        <div className="glass-card border-dashed border-2 border-border/50 p-12 text-center">
          {fileName ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                {activeTab === "pdf" ? <FileText className="w-8 h-8" /> : <Image className="w-8 h-8" />}
              </div>
              <p className="font-medium">{fileName}</p>
              <Button variant="ghost" size="sm" onClick={() => { setFileName(null); onTextChange(""); }} className="gap-1">
                <X className="w-4 h-4" /> Supprimer
              </Button>
            </div>
          ) : (
            <label className="cursor-pointer space-y-3 block">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {activeTab === "pdf" ? "Glisse ton PDF ici ou clique pour sélectionner" : "Glisse ta photo ici ou clique pour sélectionner"}
              </p>
              <input
                type="file"
                className="hidden"
                accept={activeTab === "pdf" ? ".pdf" : "image/*"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file, activeTab);
                }}
              />
            </label>
          )}
        </div>
      )}

      {text && (
        <div className="text-sm text-muted-foreground">
          {text.length} caractères · ~{Math.ceil(text.split(/\s+/).length / 250)} min de lecture
        </div>
      )}
    </div>
  );
}
