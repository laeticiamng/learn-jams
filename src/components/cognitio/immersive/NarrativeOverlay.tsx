// ============================================================
// NarrativeOverlay — Full-screen narrative text overlay for
// mission briefings, room transitions, and story beats.
// ============================================================

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface NarrativeOverlayProps {
  message: string;
  onDismiss: () => void;
}

export default function NarrativeOverlay({ message, onDismiss }: NarrativeOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-lg text-center space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-white/90 leading-relaxed font-light">
          {message}
        </p>
        <Button
          onClick={onDismiss}
          variant="ghost"
          className="text-white/70 hover:text-white gap-2"
        >
          Continuer <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
