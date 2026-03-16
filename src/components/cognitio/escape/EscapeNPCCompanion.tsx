// ============================================================
// EscapeNPCCompanion — Interactive AI-driven NPC that plays
// different roles (coach, patient, scientist, adversary)
// during the escape game. Provides contextual dialogue,
// hints, encouragement, and immersive narrative interactions.
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, X, ChevronDown, User, Brain, Microscope,
  Shield, Sparkles, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUniverseProfile, getRoomAtmosphere } from "@/services/cognitio/immersiveUniverseProfiles";
import type { PremiumUniverseProfile } from "@/services/cognitio/immersiveUniverseProfiles";

// ---------- Types ----------

export type NPCRole = "coach" | "patient" | "scientist" | "adversary" | "guide";

export interface NPCMessage {
  id: string;
  role: "npc" | "player";
  text: string;
  emotion?: "neutral" | "encouraging" | "warning" | "excited" | "mysterious";
}

interface NPCDialogue {
  trigger: string;
  responses: string[];
}

interface EscapeNPCCompanionProps {
  role: NPCRole;
  roomType: string;
  puzzleType?: string;
  puzzleSolved?: boolean;
  hintsUsed: number;
  accuracy: number;
  roomIndex: number;
  totalRooms: number;
  mainTopic: string;
  /** Domain key for immersive NPC voice (e.g. "medical_clinical", "law") */
  domain?: string;
}

// ---------- NPC Profiles ----------

interface NPCProfile {
  name: string;
  icon: typeof User;
  color: string;
  greeting: string;
  personality: string;
}

const NPC_PROFILES: Record<NPCRole, NPCProfile> = {
  coach: {
    name: "Dr. Mentor",
    icon: Brain,
    color: "text-blue-500",
    greeting: "Je suis là pour vous guider. N'hésitez pas à me poser des questions.",
    personality: "encouraging",
  },
  patient: {
    name: "Patient Lambda",
    icon: User,
    color: "text-emerald-500",
    greeting: "Docteur, j'ai besoin de votre aide. Mes symptômes s'aggravent…",
    personality: "worried",
  },
  scientist: {
    name: "Pr. Archimède",
    icon: Microscope,
    color: "text-purple-500",
    greeting: "Fascinant ! Les données que nous avons collectées méritent une analyse approfondie.",
    personality: "analytical",
  },
  adversary: {
    name: "L'Énigmatique",
    icon: Shield,
    color: "text-red-500",
    greeting: "Vous pensez pouvoir résoudre mes énigmes ? Prouvez-le.",
    personality: "challenging",
  },
  guide: {
    name: "Narrateur",
    icon: Sparkles,
    color: "text-amber-500",
    greeting: "Bienvenue dans cette aventure. Je vous accompagne tout au long de votre parcours.",
    personality: "wise",
  },
};

// ---------- Contextual Dialogue Generation ----------

function generateNPCResponse(
  role: NPCRole,
  context: {
    roomType: string;
    puzzleType?: string;
    puzzleSolved?: boolean;
    hintsUsed: number;
    accuracy: number;
    roomIndex: number;
    totalRooms: number;
    playerMessage: string;
    domain?: string;
  }
): { text: string; emotion: NPCMessage["emotion"] } {
  const { roomType, puzzleSolved, hintsUsed, accuracy, roomIndex, totalRooms, playerMessage, domain } = context;
  const progress = (roomIndex + 1) / totalRooms;
  const lowered = playerMessage.toLowerCase();

  // Resolve immersive profile for domain-specific voice
  const profile = domain ? getUniverseProfile(domain) : undefined;

  // Check for specific player intents
  const askingForHelp = /aide|help|indice|hint|bloqué|stuck|comment|how/i.test(lowered);
  const askingAboutProgress = /progrès|progress|avance|score|combien/i.test(lowered);
  const greeting = /bonjour|hello|salut|hey|coucou/i.test(lowered);
  const frustrated = /difficile|dur|impossible|comprends pas|nul/i.test(lowered);

  // Use immersive profile voice when available for key interactions
  if (profile) {
    if (askingForHelp && hintsUsed < 2) {
      return { text: profile.voice.hint_personality, emotion: "encouraging" };
    }
    if (puzzleSolved === true) {
      return { text: profile.voice.celebration_style, emotion: "excited" };
    }
    if (puzzleSolved === false) {
      return { text: profile.voice.error_framing, emotion: "warning" };
    }
    if (frustrated) {
      return { text: `${profile.atmosphere.setback_metaphor} Prenez votre temps.`, emotion: "encouraging" };
    }
  }

  // Role-specific responses
  switch (role) {
    case "coach":
      if (greeting) return { text: "Bonjour ! Vous êtes prêt(e) à relever le défi ? Je crois en vous.", emotion: "encouraging" };
      if (askingForHelp) {
        if (hintsUsed < 2) return { text: "Prenez le temps de relire l'énoncé. La réponse est souvent dans les détails que l'on néglige.", emotion: "encouraging" };
        return { text: "Vous avez déjà utilisé des indices. Concentrez-vous sur ce que vous savez avec certitude et éliminez les options impossibles.", emotion: "neutral" };
      }
      if (askingAboutProgress) {
        if (accuracy >= 0.8) return { text: `Excellent ! Précision de ${Math.round(accuracy * 100)}%. Vous maîtrisez bien le sujet.`, emotion: "excited" };
        return { text: `Salle ${roomIndex + 1}/${totalRooms}. Précision actuelle : ${Math.round(accuracy * 100)}%. Continuez, chaque erreur est une occasion d'apprendre.`, emotion: "encouraging" };
      }
      if (frustrated) return { text: "C'est normal de trouver certains puzzles difficiles. La difficulté est le signe que vous apprenez. Reprenez calmement.", emotion: "encouraging" };
      if (puzzleSolved) return { text: "Bien joué ! Chaque puzzle résolu renforce votre compréhension. Passez au suivant avec confiance.", emotion: "excited" };
      return { text: "Concentrez-vous sur les concepts clés. La réponse émerge souvent quand on revient aux fondamentaux.", emotion: "neutral" };

    case "patient":
      if (greeting) return { text: "Docteur ! Merci d'être venu. Je ne me sens vraiment pas bien…", emotion: "neutral" };
      if (askingForHelp) return { text: "Mes symptômes… j'ai noté tout ce que j'ai observé. Peut-être que cela vous aidera dans votre diagnostic ?", emotion: "neutral" };
      if (puzzleSolved) return { text: "Vous avez trouvé ! Je me sens déjà mieux. Votre diagnostic est-il complet ?", emotion: "encouraging" };
      if (frustrated) return { text: "Docteur, prenez votre temps. Ma vie est entre vos mains, mais je vous fais confiance.", emotion: "mysterious" };
      return { text: "J'ai un nouveau symptôme à vous signaler… cela pourrait être lié au puzzle en cours.", emotion: "neutral" };

    case "scientist":
      if (greeting) return { text: "Ah, un collègue ! Les données sont fascinantes. Venez, analysons-les ensemble.", emotion: "excited" };
      if (askingForHelp) return { text: "Hmm, intéressant. Avez-vous considéré d'examiner les données sous un angle différent ? La corrélation n'est pas toujours causation.", emotion: "neutral" };
      if (askingAboutProgress) return { text: `Nos résultats sont à ${Math.round(accuracy * 100)}% de fiabilité. ${accuracy >= 0.7 ? "Les données convergent !" : "Il faut affiner notre méthodologie."}`, emotion: accuracy >= 0.7 ? "excited" : "neutral" };
      if (puzzleSolved) return { text: "Eurêka ! Cette découverte ouvre de nouvelles perspectives. Documentons-la immédiatement.", emotion: "excited" };
      return { text: "Les données suggèrent un pattern intéressant. Avez-vous remarqué la relation entre les variables ?", emotion: "mysterious" };

    case "adversary":
      if (greeting) return { text: "Tiens, tiens… vous osez me défier ? Voyons si vous êtes à la hauteur.", emotion: "mysterious" };
      if (askingForHelp) return { text: "Vous demandez de l'aide ? Pathétique. Un vrai champion trouve la solution seul. Mais… je vous donnerai un indice si vous le méritez.", emotion: "warning" };
      if (puzzleSolved) return { text: "Pas mal… mais ce n'était que le début. Les vrais défis arrivent. Êtes-vous prêt(e) ?", emotion: "mysterious" };
      if (frustrated) return { text: "Ha ! Vous abandonnez déjà ? Je pensais que vous étiez plus résistant(e) que ça.", emotion: "warning" };
      if (progress > 0.7) return { text: "Vous approchez de la fin… mais c'est là que mes pièges sont les plus redoutables.", emotion: "warning" };
      return { text: "Chaque erreur que vous faites renforce mon pouvoir. Réfléchissez bien avant de répondre.", emotion: "mysterious" };

    case "guide":
    default:
      if (greeting) return { text: "Bienvenue, aventurier(ère). Cette mission recèle bien des secrets.", emotion: "neutral" };
      if (askingForHelp) return { text: "La salle dans laquelle vous vous trouvez contient tous les indices nécessaires. Explorez chaque recoin.", emotion: "encouraging" };
      if (askingAboutProgress) return { text: `Vous avez parcouru ${Math.round(progress * 100)}% de la mission. ${progress > 0.5 ? "La fin approche." : "Le chemin est encore long."}`, emotion: "neutral" };
      if (puzzleSolved) return { text: "Un mystère de résolu. Mais d'autres vous attendent plus loin…", emotion: "mysterious" };
      return { text: "Chaque salle raconte une partie de l'histoire. Prêtez attention aux détails narratifs.", emotion: "neutral" };
  }
}

// ---------- Component ----------

export default function EscapeNPCCompanion({
  role,
  roomType,
  puzzleType,
  puzzleSolved,
  hintsUsed,
  accuracy,
  roomIndex,
  totalRooms,
  mainTopic,
  domain,
}: EscapeNPCCompanionProps) {
  const npcProfile = NPC_PROFILES[role];

  // Override NPC name/greeting with immersive universe NPC voice when available
  const universeProfile = useMemo(
    () => (domain ? getUniverseProfile(domain) : undefined),
    [domain],
  );
  const profile: NPCProfile = universeProfile
    ? { ...npcProfile, greeting: universeProfile.atmosphere.opening_hook }
    : npcProfile;
  const Icon = profile.icon;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<NPCMessage[]>([
    {
      id: "greeting",
      role: "npc",
      text: profile.greeting,
      emotion: "neutral",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgIdCounter = useRef(1);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Contextual auto-message on room change — enriched with immersive room atmospheres
  useEffect(() => {
    let text: string | undefined;

    // Use immersive room atmosphere if available
    if (universeProfile) {
      const roomAtmos = getRoomAtmosphere(universeProfile, roomType);
      text = roomAtmos.entry_description;
    } else {
      const autoMessages: Record<string, string> = {
        briefing: "Nous entrons dans la zone de briefing. Prenez connaissance de la situation.",
        exploration: "Cette salle d'exploration cache des indices. Fouinez partout !",
        analysis: "Il est temps d'analyser les données collectées.",
        diagnostic: "Le moment du diagnostic approche. Rassemblez vos observations.",
        decision: "Une décision cruciale vous attend ici.",
        synthesis: "Synthétisez tout ce que vous avez appris.",
        final: "L'épreuve finale. Donnez le meilleur de vous-même.",
      };
      text = autoMessages[roomType];
    }

    if (text && roomIndex > 0) {
      const id = `auto-${roomIndex}-${msgIdCounter.current++}`;
      setMessages(prev => [
        ...prev,
        { id, role: "npc", text, emotion: "neutral" },
      ]);
    }
  }, [roomIndex, roomType, universeProfile]);

  // Contextual reaction to puzzle solve
  useEffect(() => {
    if (puzzleSolved === undefined) return;
    const response = generateNPCResponse(role, {
      roomType,
      puzzleType,
      puzzleSolved,
      hintsUsed,
      accuracy,
      roomIndex,
      totalRooms,
      playerMessage: puzzleSolved ? "__puzzle_solved__" : "__puzzle_failed__",
      domain,
    });

    const id = `react-${msgIdCounter.current++}`;
    setMessages(prev => [
      ...prev,
      { id, role: "npc", text: response.text, emotion: response.emotion },
    ]);
  }, [puzzleSolved, accuracy, domain, hintsUsed, puzzleType, role, roomIndex, roomType, totalRooms]);

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim()) return;

    const playerId = `player-${msgIdCounter.current++}`;
    const playerMsg: NPCMessage = {
      id: playerId,
      role: "player",
      text: inputText.trim(),
    };

    setMessages(prev => [...prev, playerMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulate NPC thinking delay
    setTimeout(() => {
      const response = generateNPCResponse(role, {
        roomType,
        puzzleType,
        puzzleSolved,
        hintsUsed,
        accuracy,
        roomIndex,
        totalRooms,
        playerMessage: inputText.trim(),
        domain,
      });

      const npcId = `npc-${msgIdCounter.current++}`;
      setMessages(prev => [
        ...prev,
        { id: npcId, role: "npc", text: response.text, emotion: response.emotion },
      ]);
      setIsTyping(false);
    }, 600 + Math.random() * 800);
  }, [inputText, role, roomType, puzzleType, puzzleSolved, hintsUsed, accuracy, roomIndex, totalRooms, domain]);

  const emotionColor = (emotion?: NPCMessage["emotion"]) => {
    switch (emotion) {
      case "encouraging": return "border-green-500/30";
      case "warning": return "border-red-500/30";
      case "excited": return "border-amber-500/30";
      case "mysterious": return "border-purple-500/30";
      default: return "border-border/20";
    }
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          isOpen ? "bg-muted" : "gradient-bg-premium"
        }`}
        aria-label="Parler au PNJ"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageSquare className="w-5 h-5 text-white" />
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 w-80 max-h-[28rem] bg-background border border-border/20 rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10 shrink-0">
              <div className={`w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center ${profile.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground/50 hover:text-muted-foreground">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "player" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                      msg.role === "player"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : `bg-accent/50 border ${emotionColor(msg.emotion)} rounded-bl-none`
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-accent/50 border border-border/20 rounded-xl rounded-bl-none px-3 py-2">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="text-xs text-muted-foreground"
                    >
                      •••
                    </motion.span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-border/10 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                  placeholder="Parler au PNJ..."
                  className="flex-1 bg-accent/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isTyping}
                  className="rounded-xl p-2 h-8 w-8"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
