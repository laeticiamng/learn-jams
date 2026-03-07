import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, X, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  text: string;
  onTextChange: (text: string) => void;
}

export default function CourseUploader({ text, onTextChange }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"text" | "pdf" | "image">("text");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 200 * 1024 * 1024) {
      toast.error(t("create.file_too_large"));
      return;
    }

    setFileName(file.name);
    setExtracting(true);
    setExtracted(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (data.text) {
        onTextChange(data.text);
        setExtracted(true);
        toast.success(t("create.extract_success", { file: file.name }));
        setActiveTab("text");
      } else {
        throw new Error(t("create.no_text_extracted"));
      }
    } catch (error: any) {
      console.error("Extraction error:", error);
      toast.error(error.message || t("create.extract_error"));
      setFileName(null);
    } finally {
      setExtracting(false);
    }
  }, [onTextChange, t]);

  const clearFile = () => {
    setFileName(null);
    setExtracted(false);
    onTextChange("");
  };

  const tabs = [
    { id: "text" as const, label: t("create.tab_text"), icon: FileText },
    { id: "pdf" as const, label: t("create.tab_pdf"), icon: Upload },
    { id: "image" as const, label: t("create.tab_image"), icon: Image },
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
        <div className="space-y-2">
          {extracted && fileName && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="w-4 h-4" />
              <span dangerouslySetInnerHTML={{ __html: t("create.extracted_from", { file: fileName }) }} />
            </div>
          )}
          <Textarea
            placeholder={t("create.textarea_placeholder")}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="min-h-[200px] bg-muted/50 border-border/50 resize-none"
          />
        </div>
      ) : (
        <div className="glass-card border-dashed border-2 border-border/50 p-12 text-center">
          {extracting ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="font-medium">{t("create.extracting")}</p>
              <p className="text-sm text-muted-foreground">
                {activeTab === "pdf" ? t("create.pdf_analyzing") : t("create.image_analyzing")}
              </p>
            </div>
          ) : fileName && extracted ? (
            <div className="space-y-3">
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <p className="font-medium text-primary">{t("create.extract_done")}</p>
              <p className="text-sm text-muted-foreground">{fileName}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("text")} className="gap-1">
                  <FileText className="w-4 h-4" /> {t("create.view_text")}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearFile} className="gap-1">
                  <X className="w-4 h-4" /> {t("create.restart")}
                </Button>
              </div>
            </div>
          ) : fileName ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                {activeTab === "pdf" ? <FileText className="w-8 h-8" /> : <Image className="w-8 h-8" />}
              </div>
              <p className="font-medium">{fileName}</p>
              <Button variant="ghost" size="sm" onClick={clearFile} className="gap-1">
                <X className="w-4 h-4" /> {t("create.delete_file")}
              </Button>
            </div>
          ) : (
            <label className="cursor-pointer space-y-3 block">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium">
                {activeTab === "pdf" ? t("create.upload_pdf_label") : t("create.upload_image_label")}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeTab === "pdf" ? t("create.upload_pdf_hint") : t("create.upload_image_hint")}
              </p>
              <input
                type="file"
                className="hidden"
                accept={activeTab === "pdf" ? ".pdf,application/pdf" : "image/*"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
          )}
        </div>
      )}

      {text && (
        <div className="text-sm text-muted-foreground">
          {t("create.char_count", {
            chars: text.length,
            minutes: Math.ceil(text.split(/\s+/).length / 250),
          })}
        </div>
      )}
    </div>
  );
}
