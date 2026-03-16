// ============================================================
// EscapeNarrativeBanner — Displays narrative messages with
// typing animation and emotional tone indicators.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X } from "lucide-react";

interface EscapeNarrativeBannerProps {
  message: string;
  emotion?: "curiosity" | "tension" | "discovery" | "urgency" | "relief" | "triumph";
  onDismiss?: () => void;
}

const EMOTION_STYLES: Record<string, string> = {
  curiosity: "border-blue-500/30 bg-blue-500/5",
  tension: "border-amber-500/30 bg-amber-500/5",
  discovery: "border-emerald-500/30 bg-emerald-500/5",
  urgency: "border-red-500/30 bg-red-500/5",
  relief: "border-green-500/30 bg-green-500/5",
  triumph: "border-purple-500/30 bg-purple-500/5",
};

const EMOTION_ICON_COLORS: Record<string, string> = {
  curiosity: "text-blue-500",
  tension: "text-amber-500",
  discovery: "text-emerald-500",
  urgency: "text-red-500",
  relief: "text-green-500",
  triumph: "text-purple-500",
};

export default function EscapeNarrativeBanner({
  message,
  emotion = "curiosity",
  onDismiss,
}: EscapeNarrativeBannerProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayedText("");
    indexRef.current = 0;
    setIsTyping(true);

    const interval = setInterval(() => {
      if (indexRef.current < message.length) {
        setDisplayedText(message.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [message]);

  if (!message) return null;

  const style = EMOTION_STYLES[emotion] ?? EMOTION_STYLES.curiosity;
  const iconColor = EMOTION_ICON_COLORS[emotion] ?? EMOTION_ICON_COLORS.curiosity;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`rounded-xl border p-4 ${style}`}
      >
        <div className="flex items-start gap-3">
          <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
              )}
            </p>
          </div>
          {onDismiss && !isTyping && (
            <button
              onClick={onDismiss}
              className="text-muted-foreground/50 hover:text-muted-foreground shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
