// ============================================================
// MissionPuzzleWidget — Renders the correct interaction widget
// based on the item's interaction_mode / brick type.
// Supports: select, drag_order, drag_match, text_input,
//           fill_blanks, lock_code, click_error, fragment_build
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, GripVertical, Link2, Type, Lock, Search, Puzzle, ArrowUpDown } from "lucide-react";
import type { MissionItem, InteractionMode, MatchPair } from "@/domain/cognitio/types";

interface MissionPuzzleWidgetProps {
  item: MissionItem;
  onAnswer: (answer: string | string[]) => void;
  disabled?: boolean;
}

export default function MissionPuzzleWidget({
  item,
  onAnswer,
  disabled = false,
}: MissionPuzzleWidgetProps) {
  const mode = item.interaction_mode ?? "select";

  switch (mode) {
    case "drag_order":
      return <DragOrderWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "drag_match":
      return <DragMatchWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "fill_blanks":
      return <FillBlanksWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "lock_code":
      return <LockCodeWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "click_error":
      return <ClickErrorWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "fragment_build":
      return <DragOrderWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "text_input":
      return <TextInputWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "multi_select":
      return <MultiSelectWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
    case "select":
    default:
      return <SelectWidget item={item} onAnswer={onAnswer} disabled={disabled} />;
  }
}

// ============================================================
// SELECT — Standard QCM (existing behavior)
// ============================================================

function SelectWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { setSelected(null); }, [item.id]);

  if (!item.options) return null;

  return (
    <div className="space-y-2">
      {item.options.map((option) => (
        <motion.button
          key={option}
          whileHover={!disabled ? { scale: 1.01 } : undefined}
          whileTap={!disabled ? { scale: 0.99 } : undefined}
          onClick={() => {
            if (disabled) return;
            setSelected(option);
            onAnswer(option);
          }}
          disabled={disabled}
          className={`w-full text-left p-3.5 rounded-xl border transition-all ${
            selected === option
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border/20 hover:border-border/40"
          }`}
          aria-pressed={selected === option}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                selected === option ? "border-primary bg-primary" : "border-border/40"
              }`}
            >
              {selected === option && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm">{option}</span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ============================================================
// DRAG ORDER — Reorder items (SEQUENCE, ORDERING, PUZZLE_STEPS, CODE_RECONSTRUCT)
// ============================================================

function DragOrderWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string[]) => void;
  disabled: boolean;
}) {
  const initialItems = item.fragments ?? item.options ?? [];
  const [orderedItems, setOrderedItems] = useState<string[]>(initialItems);

  useEffect(() => {
    setOrderedItems(item.fragments ?? item.options ?? []);
  }, [item.id, item.fragments, item.options]);

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      if (disabled) return;
      setOrderedItems(newOrder);
    },
    [disabled]
  );

  const handleSubmit = useCallback(() => {
    onAnswer(orderedItems);
  }, [orderedItems, onAnswer]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <ArrowUpDown className="w-3.5 h-3.5" />
        <span>Glissez-déposez pour réordonner les éléments</span>
      </div>

      <Reorder.Group
        axis="y"
        values={orderedItems}
        onReorder={handleReorder}
        className="space-y-2"
      >
        {orderedItems.map((item, index) => (
          <Reorder.Item
            key={item}
            value={item}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-background cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground w-5">{index + 1}.</span>
            <span className="text-sm flex-1">{item}</span>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <Button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full gap-2 rounded-xl"
        size="sm"
      >
        Valider l'ordre
      </Button>
    </div>
  );
}

// ============================================================
// DRAG MATCH — Match pairs (ASSOCIATION)
// ============================================================

function DragMatchWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string[]) => void;
  disabled: boolean;
}) {
  const pairs = item.pairs ?? [];
  const leftItems = pairs.map((p) => p.left);
  const rightItems = useState<string[]>(() =>
    [...pairs.map((p) => p.right)].sort(() => Math.random() - 0.5)
  )[0];

  const [matches, setMatches] = useState<Record<string, string>>({});
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  useEffect(() => {
    setMatches({});
    setActiveLeft(null);
  }, [item.id]);

  const handleLeftClick = (left: string) => {
    if (disabled) return;
    setActiveLeft(left);
  };

  const handleRightClick = (right: string) => {
    if (disabled || !activeLeft) return;
    setMatches((prev) => ({ ...prev, [activeLeft]: right }));
    setActiveLeft(null);
  };

  const handleSubmit = () => {
    const answer = leftItems.map((left) => `${left}::${matches[left] ?? ""}`);
    onAnswer(answer);
  };

  const allMatched = leftItems.every((l) => matches[l]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Link2 className="w-3.5 h-3.5" />
        <span>Cliquez sur un élément à gauche, puis sur sa correspondance à droite</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          {leftItems.map((left) => (
            <button
              key={left}
              onClick={() => handleLeftClick(left)}
              disabled={disabled}
              className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                activeLeft === left
                  ? "border-primary bg-primary/10 shadow-sm"
                  : matches[left]
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border/20 hover:border-primary/30"
              }`}
            >
              {left}
              {matches[left] && (
                <span className="block text-[10px] text-green-600 mt-1 truncate">
                  → {matches[left]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          {rightItems.map((right) => {
            const isUsed = Object.values(matches).includes(right);
            return (
              <button
                key={right}
                onClick={() => handleRightClick(right)}
                disabled={disabled || !activeLeft || isUsed}
                className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                  isUsed
                    ? "border-green-500/30 bg-green-500/5 opacity-60"
                    : activeLeft
                      ? "border-border/40 hover:border-primary/50 cursor-pointer"
                      : "border-border/20 opacity-70"
                }`}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={disabled || !allMatched}
        className="w-full gap-2 rounded-xl"
        size="sm"
      >
        Valider les associations
      </Button>
    </div>
  );
}

// ============================================================
// FILL BLANKS — Complete text (COMPLETION)
// ============================================================

function FillBlanksWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const template = item.completion_template ?? item.prompt;

  useEffect(() => { setValue(""); }, [item.id]);

  const parts = template.split("{{blank}}");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Type className="w-3.5 h-3.5" />
        <span>Complétez le texte avec le terme correct</span>
      </div>

      <div className="glass-card p-4 rounded-xl text-sm leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={value}
                onChange={(e) => !disabled && setValue(e.target.value)}
                disabled={disabled}
                placeholder="___________"
                className="inline-block mx-1 px-2 py-0.5 border-b-2 border-primary/50 bg-primary/5 rounded text-primary font-medium focus:outline-none focus:border-primary w-40 text-center"
                aria-label="Réponse à compléter"
              />
            )}
          </span>
        ))}
      </div>

      <Button
        onClick={() => onAnswer(value)}
        disabled={disabled || !value.trim()}
        className="w-full gap-2 rounded-xl"
        size="sm"
      >
        Valider
      </Button>
    </div>
  );
}

// ============================================================
// LOCK CODE — Enter numeric/text code (LOCK_LOGIC)
// ============================================================

function LockCodeWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const digits = item.lock_digits ?? 4;
  const [code, setCode] = useState("");

  useEffect(() => { setCode(""); }, [item.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Lock className="w-3.5 h-3.5" />
        <span>Entrez le code pour déverrouiller</span>
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: digits }).map((_, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            value={code[i] ?? ""}
            onChange={(e) => {
              if (disabled) return;
              const char = e.target.value;
              const newCode = code.slice(0, i) + char + code.slice(i + 1);
              setCode(newCode.slice(0, digits));

              // Auto-focus next input
              if (char && i < digits - 1) {
                const next = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                next?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !code[i] && i > 0) {
                const prev = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement;
                prev?.focus();
              }
            }}
            disabled={disabled}
            className="w-12 h-14 text-center text-2xl font-mono font-bold border-2 border-border/30 rounded-xl bg-background focus:border-primary focus:outline-none transition-all"
            aria-label={`Chiffre ${i + 1}`}
          />
        ))}
      </div>

      <Button
        onClick={() => onAnswer(code)}
        disabled={disabled || code.length < digits}
        className="w-full gap-2 rounded-xl"
        size="sm"
      >
        <Lock className="w-4 h-4" />
        Déverrouiller
      </Button>
    </div>
  );
}

// ============================================================
// CLICK ERROR — Find error in document (ERROR_IDENTIFICATION)
// ============================================================

function ClickErrorWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const document = item.error_document ?? item.prompt;

  useEffect(() => { setSelectedWord(null); }, [item.id]);

  // Split document into clickable words
  const words = document.split(/(\s+)/);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Search className="w-3.5 h-3.5" />
        <span>Cliquez sur le terme incorrect dans le texte</span>
      </div>

      <div className="glass-card p-4 rounded-xl text-sm leading-relaxed">
        {words.map((word, i) => {
          const isSpace = /^\s+$/.test(word);
          if (isSpace) return <span key={i}>{word}</span>;

          const cleanWord = word.replace(/[.,;:!?()]/g, "");
          const isSelected = selectedWord === cleanWord;

          return (
            <span
              key={i}
              onClick={() => {
                if (disabled || !cleanWord) return;
                setSelectedWord(cleanWord);
              }}
              className={`cursor-pointer rounded px-0.5 transition-all ${
                isSelected
                  ? "bg-red-500/20 text-red-600 dark:text-red-400 font-semibold"
                  : "hover:bg-primary/10"
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>

      <Button
        onClick={() => selectedWord && onAnswer(selectedWord)}
        disabled={disabled || !selectedWord}
        className="w-full gap-2 rounded-xl"
        size="sm"
      >
        Valider la sélection
      </Button>
    </div>
  );
}

// ============================================================
// TEXT INPUT — Free text answer
// ============================================================

function TextInputWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  useEffect(() => { setValue(""); }, [item.id]);

  return (
    <div className="space-y-4">
      <textarea
        value={value}
        onChange={(e) => !disabled && setValue(e.target.value)}
        disabled={disabled}
        placeholder="Tapez votre réponse ici..."
        rows={3}
        className="w-full p-3 rounded-xl border border-border/20 bg-background resize-none focus:outline-none focus:border-primary text-sm"
        aria-label="Votre réponse"
      />

      <Button
        onClick={() => onAnswer(value)}
        disabled={disabled || !value.trim()}
        className="w-full gap-2 rounded-xl"
        size="sm"
      >
        Valider
      </Button>
    </div>
  );
}

// ============================================================
// MULTI SELECT — Select multiple options
// ============================================================

function MultiSelectWidget({
  item,
  onAnswer,
  disabled,
}: {
  item: MissionItem;
  onAnswer: (answer: string[]) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { setSelected(new Set()); }, [item.id]);

  if (!item.options) return null;

  const toggleOption = (option: string) => {
    if (disabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Sélectionnez toutes les bonnes réponses</p>

      {item.options.map((option) => (
        <motion.button
          key={option}
          whileHover={!disabled ? { scale: 1.01 } : undefined}
          onClick={() => toggleOption(option)}
          disabled={disabled}
          className={`w-full text-left p-3.5 rounded-xl border transition-all ${
            selected.has(option)
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border/20 hover:border-border/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                selected.has(option) ? "border-primary bg-primary" : "border-border/40"
              }`}
            >
              {selected.has(option) && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm">{option}</span>
          </div>
        </motion.button>
      ))}

      <Button
        onClick={() => onAnswer([...selected])}
        disabled={disabled || selected.size === 0}
        className="w-full gap-2 rounded-xl"
        size="sm"
      >
        Valider
      </Button>
    </div>
  );
}
