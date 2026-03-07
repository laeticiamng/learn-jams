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
      <motion.button
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => setOpen(!open)}
        className="w-full glass-card-elevated p-5 flex items-center justify-between gap-3 rounded-2xl group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-bg-premium flex items-center justify-center shadow-lg shadow-primary/15">
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-base">{t("player.study_notes")}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="glass-card-elevated p-7 md:p-9 mt-2 rounded-2xl space-y-2">
              {metadata.split("\n").map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-3" />;
                if (/^#{1,3}\s/.test(trimmed) || /^\*\*[A-Z]/.test(trimmed)) {
                  return (
                    <p key={i} className="font-display font-semibold text-foreground mt-5 first:mt-0">
                      {trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "")}
                    </p>
                  );
                }
                if (/^[-•]/.test(trimmed)) {
                  return (
                    <p key={i} className="text-foreground/70 text-sm leading-relaxed pl-4">
                      {trimmed}
                    </p>
                  );
                }
                return (
                  <p key={i} className="text-foreground/70 text-sm leading-relaxed">
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
