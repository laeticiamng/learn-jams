import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown } from "lucide-react";
import { TFunction } from "i18next";

interface StudyNotesProps {
  metadata: string;
  t: TFunction;
}

export function StudyNotes({ metadata, t }: StudyNotesProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mt-8"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full glass-card p-5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-display font-semibold text-base">{t("player.study_notes")}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 md:p-8 mt-2 rounded-2xl space-y-2">
              {metadata.split("\n").map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-2" />;
                // Headings (lines starting with ## or bold markers)
                if (/^#{1,3}\s/.test(trimmed) || /^\*\*[A-Z]/.test(trimmed)) {
                  return (
                    <p key={i} className="font-display font-semibold text-foreground mt-4 first:mt-0">
                      {trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "")}
                    </p>
                  );
                }
                // Bullet points
                if (/^[-•]/.test(trimmed)) {
                  return (
                    <p key={i} className="text-foreground/75 text-sm leading-relaxed pl-4">
                      {trimmed}
                    </p>
                  );
                }
                return (
                  <p key={i} className="text-foreground/75 text-sm leading-relaxed">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
