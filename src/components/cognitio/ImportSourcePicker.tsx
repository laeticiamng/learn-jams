// ============================================================
// ImportSourcePicker — Visual picker for import method
// ============================================================

import { FileUp, ClipboardPaste, FileText } from "lucide-react";

type ImportMethod = "file" | "paste";

interface ImportSourcePickerProps {
  selected: ImportMethod;
  onSelect: (method: ImportMethod) => void;
}

export function ImportSourcePicker({ selected, onSelect }: ImportSourcePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onSelect("file")}
        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
          selected === "file"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <FileUp className={`h-6 w-6 ${selected === "file" ? "text-primary" : "text-muted-foreground"}`} />
        <div className="text-center">
          <p className="text-sm font-medium">Importer un fichier</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX, TXT</p>
        </div>
      </button>

      <button
        onClick={() => onSelect("paste")}
        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
          selected === "paste"
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <ClipboardPaste className={`h-6 w-6 ${selected === "paste" ? "text-primary" : "text-muted-foreground"}`} />
        <div className="text-center">
          <p className="text-sm font-medium">Coller du texte</p>
          <p className="text-xs text-muted-foreground">Depuis n'importe quelle source</p>
        </div>
      </button>
    </div>
  );
}
