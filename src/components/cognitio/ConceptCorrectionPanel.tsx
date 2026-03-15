// ============================================================
// ConceptCorrectionPanel — Human correction for extracted concepts
// Users can edit, add, remove, and validate/reject concepts
// before the pipeline continues to generation.
// ============================================================

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AnalyzedConcept } from "@/domain/cognitio/contracts";

interface ConceptCorrectionPanelProps {
  concepts: AnalyzedConcept[];
  onSave: (corrected: AnalyzedConcept[]) => void;
  onCancel?: () => void;
}

interface EditableConcept extends AnalyzedConcept {
  _status: "original" | "edited" | "added" | "removed";
  _original_label?: string;
  _original_definition?: string;
}

export function ConceptCorrectionPanel({
  concepts,
  onSave,
  onCancel,
}: ConceptCorrectionPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<EditableConcept[]>(
    concepts.map(c => ({ ...c, _status: "original" })),
  );
  const [expanded, setExpanded] = useState(true);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newDefinition, setNewDefinition] = useState("");

  const changes = items.filter(i => i._status !== "original").length;
  const activeItems = items.filter(i => i._status !== "removed");

  const handleEdit = useCallback((idx: number, field: "label" | "definition", value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return {
        ...item,
        [field]: value,
        _status: item._status === "added" ? "added" : "edited",
        _original_label: item._original_label ?? item.label,
        _original_definition: item._original_definition ?? item.definition,
      };
    }));
  }, []);

  const handleRemove = useCallback((idx: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (item._status === "added") {
        // Remove added items completely
        return { ...item, _status: "removed" as const };
      }
      return { ...item, _status: "removed" as const };
    }));
    setEditingIdx(null);
  }, []);

  const handleRestore = useCallback((idx: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return {
        ...item,
        _status: "original" as const,
        label: item._original_label ?? item.label,
        definition: item._original_definition ?? item.definition,
      };
    }));
  }, []);

  const handleAdd = useCallback(() => {
    if (!newLabel.trim()) return;
    const newConcept: EditableConcept = {
      stable_key: `user_${Date.now()}`,
      label: newLabel.trim(),
      definition: newDefinition.trim() || `Concept ajouté: ${newLabel.trim()}`,
      type: "user_added",
      criticality: 3 as any,
      criticality_score: 0.5,
      bloom_target: "understand" as any,
      relations: [],
      prerequisites: [],
      source_confidence: 1.0,
      source_trace: [],
      uncertain: false,
      _status: "added",
    };
    setItems(prev => [...prev, newConcept]);
    setNewLabel("");
    setNewDefinition("");
    setAddMode(false);
  }, [newLabel, newDefinition]);

  const handleSave = useCallback(() => {
    const corrected = items
      .filter(i => i._status !== "removed")
      .map(({ _status, _original_label, _original_definition, ...concept }) => concept as AnalyzedConcept);
    onSave(corrected);
  }, [items, onSave]);

  const handleReset = useCallback(() => {
    setItems(concepts.map(c => ({ ...c, _status: "original" })));
    setEditingIdx(null);
    setAddMode(false);
  }, [concepts]);

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Pencil className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">
            {t("concept_correction.title", "Correction des concepts")}
          </span>
          <span className="text-xs text-muted-foreground">
            {activeItems.length} {t("concept_correction.active", "actifs")}
            {changes > 0 && (
              <> &middot; <span className="text-primary font-medium">{changes} {t("concept_correction.changes", "modifications")}</span></>
            )}
          </span>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {/* Concept list */}
              {items.map((item, idx) => (
                <ConceptRow
                  key={item.stable_key}
                  item={item}
                  isEditing={editingIdx === idx}
                  onStartEdit={() => setEditingIdx(idx)}
                  onStopEdit={() => setEditingIdx(null)}
                  onEdit={(field, value) => handleEdit(idx, field, value)}
                  onRemove={() => handleRemove(idx)}
                  onRestore={() => handleRestore(idx)}
                />
              ))}

              {/* Add concept */}
              {addMode ? (
                <div className="p-3 border border-dashed border-primary/30 rounded-lg space-y-2">
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={t("concept_correction.new_label", "Nom du concept")}
                    className="text-sm h-8"
                    autoFocus
                  />
                  <Input
                    value={newDefinition}
                    onChange={(e) => setNewDefinition(e.target.value)}
                    placeholder={t("concept_correction.new_definition", "Définition (optionnel)")}
                    className="text-sm h-8"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleAdd} disabled={!newLabel.trim()}>
                      <Check className="w-3 h-3 mr-1" /> {t("concept_correction.add", "Ajouter")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAddMode(false); setNewLabel(""); setNewDefinition(""); }}>
                      <X className="w-3 h-3 mr-1" /> {t("concept_correction.cancel", "Annuler")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={() => setAddMode(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {t("concept_correction.add_concept", "Ajouter un concept")}
                </Button>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-border/20">
                <Button size="sm" onClick={handleSave} disabled={changes === 0}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {t("concept_correction.save", "Appliquer")} {changes > 0 && `(${changes})`}
                </Button>
                {changes > 0 && (
                  <Button size="sm" variant="outline" onClick={handleReset}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    {t("concept_correction.reset", "Réinitialiser")}
                  </Button>
                )}
                {onCancel && (
                  <Button size="sm" variant="ghost" onClick={onCancel}>
                    {t("concept_correction.close", "Fermer")}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Concept Row ----------

function ConceptRow({
  item,
  isEditing,
  onStartEdit,
  onStopEdit,
  onEdit,
  onRemove,
  onRestore,
}: {
  item: EditableConcept;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onEdit: (field: "label" | "definition", value: string) => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const isRemoved = item._status === "removed";
  const isEdited = item._status === "edited";
  const isAdded = item._status === "added";

  const bgColor = isRemoved
    ? "bg-red-50/50 dark:bg-red-950/10 opacity-50"
    : isAdded
      ? "bg-green-50/50 dark:bg-green-950/10"
      : isEdited
        ? "bg-yellow-50/50 dark:bg-yellow-950/10"
        : "bg-muted/10";

  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg transition-all ${bgColor}`}>
      {/* Status indicator */}
      <div className="mt-1 shrink-0">
        {isRemoved && <X className="w-3.5 h-3.5 text-red-500" />}
        {isAdded && <Plus className="w-3.5 h-3.5 text-green-500" />}
        {isEdited && <Pencil className="w-3.5 h-3.5 text-yellow-500" />}
        {item._status === "original" && (
          item.uncertain
            ? <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            : <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing && !isRemoved ? (
          <div className="space-y-1.5">
            <Input
              value={item.label}
              onChange={(e) => onEdit("label", e.target.value)}
              className="text-xs h-7"
              autoFocus
            />
            <Input
              value={item.definition}
              onChange={(e) => onEdit("definition", e.target.value)}
              className="text-xs h-7"
            />
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={onStopEdit}>
              <Check className="w-3 h-3 mr-1" /> OK
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${isRemoved ? "line-through" : ""}`}>
                {item.label}
              </span>
              <Badge variant="outline" className="text-[8px] px-1 py-0">
                C{item.criticality}
              </Badge>
              {isEdited && item._original_label && item._original_label !== item.label && (
                <span className="text-[9px] text-muted-foreground line-through">{item._original_label}</span>
              )}
            </div>
            <p className={`text-[10px] text-muted-foreground mt-0.5 line-clamp-1 ${isRemoved ? "line-through" : ""}`}>
              {item.definition}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex gap-0.5 shrink-0">
          {isRemoved ? (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onRestore}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onStartEdit}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={onRemove}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
