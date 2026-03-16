// ============================================================
// EscapeAudioControl — Minimal audio toggle for the escape
// game top bar. Shows mute/unmute with current ambient preset.
// ============================================================

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EscapeAudioControlProps {
  muted: boolean;
  onToggle: () => void;
}

export default function EscapeAudioControl({ muted, onToggle }: EscapeAudioControlProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      className="p-2 relative"
      aria-label={muted ? "Activer le son" : "Couper le son"}
    >
      {muted ? (
        <VolumeX className="w-4 h-4 text-muted-foreground" />
      ) : (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Volume2 className="w-4 h-4 text-primary" />
        </motion.div>
      )}
    </Button>
  );
}
