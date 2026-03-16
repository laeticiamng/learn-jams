// ============================================================
// EscapeCodeLock — Code entry UI for locked rooms.
// Shows a numeric/text code input with visual feedback.
// ============================================================

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EscapeCodeLockProps {
  codeLength: number;
  lockDescription: string;
  unlockHint: string;
  onSubmitCode: (code: string) => boolean;
}

export default function EscapeCodeLock({
  codeLength,
  lockDescription,
  unlockHint,
  onSubmitCode,
}: EscapeCodeLockProps) {
  const [code, setCode] = useState<string[]>(Array(codeLength).fill(""));
  const [error, setError] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const handleDigitChange = useCallback((index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    setError(false);
    setCode(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    // Auto-focus next input
    if (value && index < codeLength - 1) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }
  }, [codeLength]);

  const handleSubmit = useCallback(() => {
    const fullCode = code.join("");
    if (fullCode.length < codeLength) return;

    const success = onSubmitCode(fullCode);
    if (success) {
      setUnlocked(true);
    } else {
      setError(true);
      // Shake animation handled by motion
    }
  }, [code, codeLength, onSubmitCode]);

  if (unlocked) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-3 py-8"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Unlock className="w-8 h-8 text-green-500" />
        </motion.div>
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          Salle débloquée !
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Lock className="w-10 h-10 text-muted-foreground/50" />

      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold">Salle verrouillée</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {lockDescription}
        </p>
      </div>

      {/* Code input */}
      <motion.div
        className="flex gap-2"
        animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-input-${index}`}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digit && index > 0) {
                const prevInput = document.getElementById(`code-input-${index - 1}`);
                prevInput?.focus();
              }
              if (e.key === "Enter") handleSubmit();
            }}
            className={`w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border-2 bg-background/50 focus:outline-none transition-colors ${
              error
                ? "border-red-500 text-red-500"
                : digit
                  ? "border-primary/50 text-primary"
                  : "border-border/30"
            }`}
            aria-label={`Chiffre ${index + 1} du code`}
          />
        ))}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-red-500"
        >
          <AlertCircle className="w-4 h-4" />
          Code incorrect. Réessayez.
        </motion.div>
      )}

      <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
        {unlockHint}
      </p>

      <Button
        onClick={handleSubmit}
        disabled={code.some(d => !d)}
        className="gradient-bg-premium rounded-xl"
      >
        Déverrouiller
      </Button>
    </div>
  );
}
