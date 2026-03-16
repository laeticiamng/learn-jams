// ============================================================
// Mission Hint Engine — Progressive 3-level hint system
// that adapts to learner level and reduces frustration
// ============================================================

import type { MissionItem, BloomLevel } from "@/domain/cognitio/types";

// ---------- Types ----------

export interface HintRequest {
  item: MissionItem;
  hint_level: 1 | 2 | 3;
  learner_level: string;
  previous_hints_used: number;
  time_spent_sec: number;
}

export interface GeneratedHint {
  level: 1 | 2 | 3;
  text: string;
  reveals_answer: boolean;
  score_penalty: number; // 0-1, how much this hint reduces the score
}

export interface HintUsageRecord {
  item_id: string;
  hints_requested: number;
  hint_levels_used: (1 | 2 | 3)[];
  total_penalty: number;
  auto_triggered: boolean;
}

// ---------- Hint Generation ----------

/**
 * Generate a progressive hint for a mission item.
 * Level 1: Light nudge (minimal penalty)
 * Level 2: More direct guidance (moderate penalty)
 * Level 3: Near-answer reveal (significant penalty)
 */
export function generateHint(request: HintRequest): GeneratedHint {
  const { item, hint_level } = request;

  switch (hint_level) {
    case 1:
      return {
        level: 1,
        text: generateLevel1Hint(item),
        reveals_answer: false,
        score_penalty: 0.1,
      };
    case 2:
      return {
        level: 2,
        text: generateLevel2Hint(item),
        reveals_answer: false,
        score_penalty: 0.25,
      };
    case 3:
      return {
        level: 3,
        text: generateLevel3Hint(item),
        reveals_answer: true,
        score_penalty: 0.5,
      };
  }
}

/**
 * Determine if auto-hint should trigger based on time and context.
 */
export function shouldAutoTriggerHint(
  timeSpentSec: number,
  timeLimitSec: number,
  hintsUsed: number,
  bloomLevel: BloomLevel
): { trigger: boolean; suggested_level: 1 | 2 | 3 } {
  // Never auto-trigger if already used 2+ hints
  if (hintsUsed >= 2) return { trigger: false, suggested_level: 1 };

  const timeRatio = timeSpentSec / timeLimitSec;

  // Higher Bloom levels get more time before auto-hint
  const thresholds: Record<BloomLevel, number> = {
    remember: 0.6,
    understand: 0.65,
    apply: 0.7,
    analyze: 0.75,
    evaluate: 0.8,
    create: 0.85,
  };

  const threshold = thresholds[bloomLevel] ?? 0.7;

  if (timeRatio >= threshold && hintsUsed === 0) {
    return { trigger: true, suggested_level: 1 };
  }
  if (timeRatio >= threshold + 0.15 && hintsUsed === 1) {
    return { trigger: true, suggested_level: 2 };
  }

  return { trigger: false, suggested_level: 1 };
}

/**
 * Compute total hint penalty for an item.
 */
export function computeHintPenalty(hintsUsed: HintUsageRecord): number {
  return Math.min(0.75, hintsUsed.total_penalty);
}

/**
 * Create a fresh hint usage record.
 */
export function createHintRecord(itemId: string): HintUsageRecord {
  return {
    item_id: itemId,
    hints_requested: 0,
    hint_levels_used: [],
    total_penalty: 0,
    auto_triggered: false,
  };
}

/**
 * Update hint record after a hint is used.
 */
export function recordHintUsage(
  record: HintUsageRecord,
  hint: GeneratedHint,
  autoTriggered: boolean = false
): HintUsageRecord {
  return {
    ...record,
    hints_requested: record.hints_requested + 1,
    hint_levels_used: [...record.hint_levels_used, hint.level],
    total_penalty: Math.min(0.75, record.total_penalty + hint.score_penalty),
    auto_triggered: record.auto_triggered || autoTriggered,
  };
}

// ---------- Hint Text Generators ----------

function generateLevel1Hint(item: MissionItem): string {
  // Light: reference the concept area without giving away the answer
  const conceptKey = item.concept_key;

  switch (item.type) {
    case "OBSERVATION":
      return `Pensez aux caractéristiques distinctives de ce concept. Qu'est-ce qui le rend unique par rapport aux autres éléments présentés ?`;
    case "TRI":
      return `Pour bien classer, identifiez d'abord le critère principal de tri. Quelle propriété distingue les catégories ?`;
    case "SEQUENCE":
      return `Réfléchissez à la logique d'enchaînement. Qu'est-ce qui doit nécessairement précéder quoi ?`;
    case "ELIMINATION":
      return `Cherchez l'élément qui ne partage pas la même propriété fondamentale que les autres. Quel est le point commun des réponses correctes ?`;
    case "DECISION":
      return `Analysez le contexte et les contraintes. Quelle option répond le mieux à l'ensemble des critères posés ?`;
    case "CODE_RECONSTRUCT":
      return `Lisez chaque fragment attentivement. Cherchez des connecteurs logiques ou temporels qui indiquent l'ordre.`;
    case "ASSOCIATION":
      return `Cherchez les liens sémantiques entre les éléments de gauche et de droite. Un concept appelle sa définition.`;
    case "TRAP_DISTINCTION":
      return `Attention aux détails ! L'un de ces éléments ressemble aux autres mais cache une différence subtile.`;
    case "PUZZLE_STEPS":
      return `Identifiez la première étape : celle qui ne dépend d'aucune autre. Puis construisez la chaîne.`;
    case "ERROR_IDENTIFICATION":
      return `Relisez le document méthodiquement. L'erreur peut être une donnée, un terme, ou une logique incorrecte.`;
    case "COMPLETION":
      return `Pensez au vocabulaire précis du domaine. Le mot manquant est un terme clé.`;
    case "DECISION_TREE":
      return `À chaque embranchement, évaluez les conséquences avant de choisir. Le bon chemin suit la logique du domaine.`;
    case "LOCK_LOGIC":
      return `Reprenez les indices précédents. Le code se déduit des informations déjà collectées.`;
    case "ORDERING":
      return `Pensez à la chronologie ou à la hiérarchie naturelle des éléments. Quel est le premier ? Le dernier ?`;
    default:
      return `Relisez attentivement l'énoncé et pensez au concept clé "${conceptKey}".`;
  }
}

function generateLevel2Hint(item: MissionItem): string {
  // More direct: reference the explanation partially
  const explanation = item.explanation;
  const firstHalf = explanation.slice(0, Math.min(80, Math.floor(explanation.length / 2)));

  switch (item.type) {
    case "OBSERVATION":
      return `Observez bien : ${firstHalf}…`;
    case "TRI":
      return `Le critère de classement est lié à : ${firstHalf}…`;
    case "SEQUENCE":
      return `L'ordre logique commence par l'étape la plus fondamentale. ${firstHalf}…`;
    case "ELIMINATION":
      return `L'intrus se distingue car : ${firstHalf}…`;
    case "DECISION":
      return `La bonne approche tient compte du fait que : ${firstHalf}…`;
    case "CODE_RECONSTRUCT":
      return `Le premier fragment commence par : ${firstHalf}…`;
    case "ASSOCIATION":
      return `L'une des associations clés est : ${firstHalf}…`;
    case "TRAP_DISTINCTION":
      return `Le piège est lié au fait que : ${firstHalf}…`;
    case "PUZZLE_STEPS":
      return `La séquence d'étapes repose sur : ${firstHalf}…`;
    case "ERROR_IDENTIFICATION":
      return `L'erreur se trouve dans la partie concernant : ${firstHalf}…`;
    case "COMPLETION":
      return `Le terme recherché est lié à : ${firstHalf}…`;
    case "DECISION_TREE":
      return `Le bon chemin passe par : ${firstHalf}…`;
    case "LOCK_LOGIC":
      return `Le code utilise la logique suivante : ${firstHalf}…`;
    case "ORDERING":
      return `Le premier élément dans l'ordre correct est lié à : ${firstHalf}…`;
    default:
      return `Indice important : ${firstHalf}…`;
  }
}

function generateLevel3Hint(item: MissionItem): string {
  // Near-reveal: strongly guides toward the answer
  const correctAnswer = Array.isArray(item.correct_answer)
    ? item.correct_answer[0]
    : item.correct_answer;

  if (!correctAnswer) return item.explanation;

  // Give a strong hint without literally stating the answer
  const firstChars = correctAnswer.slice(0, Math.ceil(correctAnswer.length * 0.4));
  const lastChar = correctAnswer.slice(-1);

  return `La réponse commence par "${firstChars}…" et se termine par "…${lastChar}". ${item.explanation.slice(0, 100)}…`;
}
