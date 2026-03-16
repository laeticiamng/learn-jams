// ============================================================
// Escape Narrative Engine — Generates narrative arcs,
// tension events, and domain-aware storytelling for
// escape game missions.
// ============================================================

import type {
  NarrativeArc,
  NarrativeBeat,
  TensionEvent,
  EscapeRoom,
} from "@/domain/cognitio/escapeEngine.types";
import type { MissionFamily, MissionSubTheme } from "@/domain/cognitio/escapeGame.types";
import type { PremiumUniverseProfile } from "./immersiveUniverseProfiles";
import { getUniverseProfile, getRoomAtmosphere, pickSensoryDetail, pickAmbientDescription, pickMotif } from "./immersiveUniverseProfiles";

// ---------- Narrative Generation ----------

export interface NarrativeInput {
  main_topic: string;
  mission_family: MissionFamily;
  sub_theme: MissionSubTheme;
  rooms: EscapeRoom[];
  tension_level: number; // 1-5
  /** Domain key for immersive universe atmosphere (e.g. "medical_clinical", "law") */
  domain?: string;
}

/**
 * Generate a complete narrative arc for an escape game session.
 */
export function generateNarrativeArc(input: NarrativeInput): NarrativeArc {
  const { main_topic, sub_theme, rooms, tension_level, domain } = input;

  // Resolve immersive universe profile for richer atmosphere
  const universeProfile = domain ? getUniverseProfile(domain) : undefined;

  // Briefing — enriched with universe opening hook & sensory detail
  const briefingBase = sub_theme.intro(main_topic);
  const briefingText = universeProfile
    ? `${universeProfile.atmosphere.opening_hook}\n\n${pickSensoryDetail(universeProfile)} ${briefingBase}`
    : briefingBase;

  const briefing: NarrativeBeat = {
    title: "Briefing de mission",
    text: briefingText,
    emotion: "curiosity",
    reveal_delay_ms: 0,
  };

  // Per-room narratives — enriched with room-specific atmospheres
  const room_narratives: NarrativeBeat[] = rooms.map((room, index) => {
    let text = room.entry_narrative;
    if (universeProfile) {
      const roomAtmos = getRoomAtmosphere(universeProfile, room.room_type);
      text = `${roomAtmos.entry_description}\n\n${pickAmbientDescription(universeProfile)} ${text}`;
    }
    return {
      title: room.title,
      text,
      emotion: getRoomEmotion(index, rooms.length),
      reveal_delay_ms: index === 0 ? 500 : 300,
    };
  });

  // Tension events
  const tension_events = generateTensionEvents(rooms, tension_level, sub_theme);

  // Resolution — enriched with universe closing hook
  const resolutionBase = buildResolutionNarrative(main_topic, sub_theme, rooms.length);
  const resolutionText = universeProfile
    ? `${resolutionBase}\n\n${universeProfile.atmosphere.closing_hook}`
    : resolutionBase;

  const resolution: NarrativeBeat = {
    title: "Mission terminée",
    text: resolutionText,
    emotion: "triumph",
    reveal_delay_ms: 500,
  };

  // Determine tone from mission family
  const tone = getToneFromFamily(input.mission_family);

  return {
    briefing,
    room_narratives,
    tension_events,
    resolution,
    setting: sub_theme.setting,
    tone,
  };
}

// ---------- Tension Events ----------

function generateTensionEvents(
  rooms: EscapeRoom[],
  tensionLevel: number,
  subTheme: MissionSubTheme
): TensionEvent[] {
  const events: TensionEvent[] = [];

  // Room completion events
  for (let i = 0; i < rooms.length; i++) {
    events.push({
      trigger: "room_complete",
      room_index: i,
      message: rooms[i].completion_narrative,
      emotion: i === rooms.length - 1 ? "celebration" : "encouragement",
    });
  }

  // Time warnings (for rooms with time limits)
  if (tensionLevel >= 3) {
    for (const room of rooms) {
      if (room.time_limit_sec) {
        events.push({
          trigger: "time_warning",
          room_index: room.room_index,
          message: `Le temps presse dans "${room.title}". Concentrez-vous sur l'essentiel.`,
          emotion: "warning",
        });
      }
    }
  }

  // Hint usage events (add encouraging feedback)
  events.push({
    trigger: "hint_used",
    message: "Un indice a été révélé. Chaque aide réduit légèrement votre score final, mais mieux vaut avancer que rester bloqué.",
    emotion: "encouragement",
  });

  // Puzzle failure events
  if (tensionLevel >= 2) {
    events.push({
      trigger: "puzzle_failed",
      message: "Réponse incorrecte. Analysez à nouveau les indices en votre possession.",
      emotion: "dramatic",
    });
  }

  // Boss entry
  events.push({
    trigger: "boss_entered",
    message: subTheme.bossIntro,
    emotion: "dramatic",
  });

  return events;
}

// ---------- Resolution Narrative ----------

function buildResolutionNarrative(
  topic: string,
  subTheme: MissionSubTheme,
  roomCount: number
): string {
  return `Félicitations ! Vous avez traversé les ${roomCount} salles de cette mission sur "${topic}". ` +
    `Votre parcours à travers "${subTheme.name}" a mis à l'épreuve votre compréhension, votre analyse et votre capacité de synthèse. ` +
    `Les connaissances acquises sont désormais ancrées dans votre mémoire — ` +
    `et les objets collectés témoignent de votre progression.`;
}

// ---------- Dynamic Narrative Feedback ----------

/**
 * Generate contextual narrative feedback based on game events.
 */
export function generateEventNarrative(
  eventType: string,
  context: {
    roomType?: string;
    puzzleSolved?: boolean;
    accuracy?: number;
    hintsUsed?: number;
    itemCollected?: string;
    roomIndex?: number;
    totalRooms?: number;
    /** Optional domain key for immersive narrative flavor */
    domain?: string;
  }
): string {
  const profile = context.domain ? getUniverseProfile(context.domain) : undefined;

  switch (eventType) {
    case "puzzle_solved":
      if (context.accuracy && context.accuracy >= 0.8) {
        return profile?.voice.celebration_style ?? "Résolution impeccable. Votre maîtrise impressionne.";
      }
      return profile
        ? `${profile.atmosphere.mastery_metaphor}`
        : "Puzzle résolu. Vous progressez dans la bonne direction.";

    case "puzzle_failed":
      if (profile) {
        return profile.voice.error_framing;
      }
      if (context.hintsUsed && context.hintsUsed > 0) {
        return "Pas tout à fait. Relisez les indices en votre possession et réessayez.";
      }
      return "Réponse incorrecte. Prenez le temps d'analyser chaque option.";

    case "hint_used":
      return profile?.voice.hint_personality ?? "Un indice a été révélé. Utilisez-le avec discernement.";

    case "room_unlocked": {
      const transitionText = profile?.atmosphere.room_transition_style ?? "";
      const progressText = context.roomIndex !== undefined && context.totalRooms !== undefined
        ? `Progression : ${context.roomIndex + 1}/${context.totalRooms}`
        : "";
      return `${transitionText} Nouvelle salle débloquée ! ${progressText}`.trim();
    }

    case "item_collected":
      return `Nouvel objet ajouté à votre inventaire : "${context.itemCollected}". Examinez-le — il pourrait être utile plus tard.`;

    case "code_discovered":
      return "Un fragment de code a été découvert. Collectez tous les fragments pour déverrouiller les salles suivantes.";

    case "boss_defeated":
      return "L'épreuve finale est vaincue. Votre synthèse des connaissances est remarquable.";

    default:
      return "";
  }
}

/**
 * Generate a performance-based narrative summary for the debrief.
 */
export function generateDebriefNarrative(
  accuracy: number,
  roomsCompleted: number,
  totalRooms: number,
  hintsUsed: number,
  totalTime: number
): string {
  const completionRate = roomsCompleted / Math.max(1, totalRooms);

  let narrative = "";

  // Performance tier
  if (accuracy >= 0.9 && hintsUsed === 0) {
    narrative = "Performance exceptionnelle. Vous avez traversé cette mission avec une précision remarquable, sans aucune aide. ";
  } else if (accuracy >= 0.8) {
    narrative = "Très bonne performance. Votre compréhension du sujet est solide. ";
  } else if (accuracy >= 0.6) {
    narrative = "Performance correcte. Certains concepts nécessitent encore du travail. ";
  } else {
    narrative = "Cette mission a révélé des zones de fragilité. C'est normal — chaque tentative renforce votre compréhension. ";
  }

  // Completion
  if (completionRate === 1) {
    narrative += "Toutes les salles ont été complétées. ";
  } else {
    narrative += `Vous avez complété ${roomsCompleted} salles sur ${totalRooms}. `;
  }

  // Hints
  if (hintsUsed === 0) {
    narrative += "Aucun indice utilisé — chapeau ! ";
  } else if (hintsUsed <= 2) {
    narrative += `${hintsUsed} indice${hintsUsed > 1 ? "s" : ""} utilisé${hintsUsed > 1 ? "s" : ""}. `;
  } else {
    narrative += `${hintsUsed} indices utilisés. N'hésitez pas à revoir les concepts fragiles. `;
  }

  // Time
  const minutes = Math.floor(totalTime / 60);
  if (minutes > 0) {
    narrative += `Temps total : ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }

  return narrative;
}

// ---------- Helpers ----------

function getRoomEmotion(index: number, total: number): NarrativeBeat["emotion"] {
  const progress = index / Math.max(1, total - 1);
  if (progress === 0) return "curiosity";
  if (progress < 0.3) return "discovery";
  if (progress < 0.6) return "tension";
  if (progress < 0.9) return "urgency";
  return "relief";
}

function getToneFromFamily(family: MissionFamily): NarrativeArc["tone"] {
  const toneMap: Record<MissionFamily, NarrativeArc["tone"]> = {
    clinical_simulation: "clinical",
    legal_reasoning: "investigative",
    scientific_discovery: "scholarly",
    logic_sequencing: "mysterious",
    investigation: "investigative",
    exploration: "adventurous",
    crisis: "urgent",
    progressive_method: "scholarly",
  };
  return toneMap[family] ?? "adventurous";
}
