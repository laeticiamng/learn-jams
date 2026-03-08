import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, Brain, Zap, Target, CheckCircle2 } from "lucide-react";
import { TFunction } from "i18next";

interface StudyNotesProps {
  metadata: string;
  t: TFunction;
}

interface ParsedSections {
  notions: string[];
  punchlines: string[];
  anchors: string[];
  coverage: string[];
}

function parseMetadata(raw: string): ParsedSections {
  const sections: ParsedSections = { notions: [], punchlines: [], anchors: [], coverage: [] };
  
  // Split by section headers A) B) C) D)
  const sectionRegex = /^[A-D]\)\s*.+$/gm;
  const matches = [...raw.matchAll(sectionRegex)];
  
  if (matches.length === 0) {
    // Fallback: return everything as notions
    sections.notions = raw.split("\n").filter(l => l.trim());
    return sections;
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const content = raw.slice(start, end).trim();
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
    
    const header = matches[i][0].toUpperCase();
    if (header.startsWith("A)")) sections.notions = lines;
    else if (header.startsWith("B)")) sections.punchlines = lines;
    else if (header.startsWith("C)")) sections.anchors = lines;
    else if (header.startsWith("D)")) sections.coverage = lines;
  }

  return sections;
}

const tabs = [
  { key: "notions" as const, icon: BookOpen, labelKey: "player.tab_notions", fallback: "Notions" },
  { key: "punchlines" as const, icon: Zap, labelKey: "player.tab_punchlines", fallback: "Punchlines" },
  { key: "anchors" as const, icon: Target, labelKey: "player.tab_anchors", fallback: "Exam Anchors" },
  { key: "coverage" as const, icon: CheckCircle2, labelKey: "player.tab_coverage", fallback: "Coverage" },
];

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

export function StudyNotes({ metadata, t }: StudyNotesProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof ParsedSections>("notions");
  const parsed = useMemo(() => parseMetadata(metadata), [metadata]);

  // Filter tabs that have content
  const availableTabs = tabs.filter(tab => parsed[tab.key].length > 0);
  const activeContent = parsed[activeTab] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mt-8"
    >
      <motion.button
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => setOpen(!open)}
        className="w-full glass-card-elevated p-5 flex items-center justify-between gap-3 rounded-2xl group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/15">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-base">{t("player.study_notes", "Study Notes & Exam Anchors")}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="overflow-hidden"
          >
            <div className="glass-card-elevated mt-2 rounded-2xl overflow-hidden">
              {/* Tab bar */}
              <div className="flex border-b border-border/15 overflow-x-auto scrollbar-none">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all duration-300 relative ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{t(tab.labelKey, tab.fallback)}</span>
                      {isActive && (
                        <motion.div
                          layoutId="study-tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 gradient-bg-premium rounded-full"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease }}
                  className="p-6 md:p-8 space-y-2 max-h-[60vh] overflow-y-auto"
                >
                  {activeContent.map((line, i) => {
                    const trimmed = line.replace(/^[-•]\s*/, "");
                    
                    // Section headers like [Verse 1]:
                    if (/^\[.+\]:/.test(trimmed)) {
                      const [header, ...rest] = trimmed.split(":");
                      return (
                        <div key={i} className="mt-4 first:mt-0">
                          <p className="font-display font-semibold text-sm text-primary mb-1">
                            {header.replace(/[\[\]]/g, "")}
                          </p>
                          <p className="text-foreground/70 text-sm leading-relaxed">
                            {rest.join(":").trim()}
                          </p>
                        </div>
                      );
                    }
                    
                    // Sub-headers (bold or indented labels)
                    if (/^(Exact formulations|Critical distinctions|Keywords)/i.test(trimmed)) {
                      return (
                        <p key={i} className="font-semibold text-sm text-foreground mt-4 first:mt-0">
                          {trimmed.replace(/[*]/g, "")}
                        </p>
                      );
                    }

                    // Coverage items with "covered" status
                    if (activeTab === "coverage" && /:\s*covered\.?$/i.test(trimmed)) {
                      const concept = trimmed.replace(/:\s*covered\.?$/i, "").trim();
                      return (
                        <div key={i} className="flex items-start gap-2.5 py-1.5">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span className="text-foreground/70 text-sm leading-relaxed">{concept}</span>
                        </div>
                      );
                    }

                    // Punchline items
                    if (activeTab === "punchlines") {
                      return (
                        <div key={i} className="flex items-start gap-2.5 py-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <span className="text-foreground/80 text-sm leading-relaxed">{trimmed}</span>
                        </div>
                      );
                    }

                    // Exam anchor quotes
                    if (activeTab === "anchors" && /^".*"$/.test(trimmed)) {
                      return (
                        <blockquote key={i} className="border-l-2 border-primary/30 pl-4 py-1 my-2">
                          <span className="text-foreground/80 text-sm italic leading-relaxed">{trimmed}</span>
                        </blockquote>
                      );
                    }

                    // Default line
                    return (
                      <p key={i} className="text-foreground/70 text-sm leading-relaxed pl-1">
                        {trimmed}
                      </p>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}