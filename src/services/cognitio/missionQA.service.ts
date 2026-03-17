// ============================================================
// Mission QA — Quality Assurance for Escape Game Missions
// ============================================================

import type {
  EscapeGameMission,
  MissionQACheck,
  MissionQAResult,
  RetentionDesignReport,
  EscapeBrickType,
} from "@/domain/cognitio/escapeGame.types";
import type { BloomLevel } from "@/domain/cognitio/types";
import { detectDocumentNoise, computeNoiseScore, DOCUMENT_NOISE_BLACKLIST } from "@/lib/cognitio-semantic-cleaning";

// ---------- QA Checklist ----------

export function runMissionQA(
  missionId: string,
  mission: EscapeGameMission,
): MissionQAResult {
  const checks: MissionQACheck[] = [
    checkUniverseNotEmpty(mission),
    checkBriefComplete(mission),
    checkStageProgression(mission),
    checkPuzzleVariety(mission),
    checkPuzzleQuality(mission),
    checkHintsPresent(mission),
    checkFeedbackPresent(mission),
    checkDebriefPresent(mission),
    checkActiveRecall(mission),
    checkDifficultyCoherence(mission),
    checkToneCoherence(mission),
    checkNotQuizDisguised(mission),
    checkBloomDiversity(mission),
    checkDuration(mission),
    // P0: Document noise / artifact leak checks
    checkNoDocumentArtifactLeak(mission),
    checkItemNoiseCleanliness(mission),
    checkPedagogicalValidity(mission),
  ];

  const blockingViolations = checks
    .filter((c) => !c.passed && c.severity === "blocking")
    .map((c) => c.details);

  const warnings = checks
    .filter((c) => !c.passed && c.severity === "warning")
    .map((c) => c.details);

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    mission_id: missionId,
    overall_score: score,
    checks,
    publish_blocked: score < 70 || blockingViolations.length > 0,
    blocking_violations: blockingViolations,
    warnings,
  };
}

// ---------- Retention Design Report ----------

export function generateRetentionReport(
  missionId: string,
  mission: EscapeGameMission,
): RetentionDesignReport {
  const allPuzzles = mission.stages.flatMap((s) => s.puzzles);
  const finalPuzzles = mission.final_challenge?.puzzles ?? [];
  const allItems = [...allPuzzles, ...finalPuzzles];

  const bloomDist: Partial<Record<BloomLevel, number>> = {};
  const mechanicDist: Partial<Record<EscapeBrickType, number>> = {};
  const conceptsCovered = new Set<string>();
  const trapsCovered: string[] = [];
  let activeRecalls = 0;

  for (const item of allItems) {
    bloomDist[item.bloom_level] = (bloomDist[item.bloom_level] ?? 0) + 1;
    mechanicDist[item.mechanic] = (mechanicDist[item.mechanic] ?? 0) + 1;
    conceptsCovered.add(item.concept_key);
    if (item.trap_label) trapsCovered.push(item.trap_label);
    if (item.serves_memorization) activeRecalls++;
  }

  return {
    mission_id: missionId,
    concepts_covered: Array.from(conceptsCovered),
    traps_covered: trapsCovered,
    active_recalls_present: activeRecalls,
    difficulty_level: Math.round(allItems.reduce((s, i) => s + i.difficulty, 0) / (allItems.length || 1)),
    mission_course_coherence: mission.universe.coherence_with_course ? 0.8 : 0.4,
    mission_profile_coherence: 0.75, // computed externally with learner data
    bloom_distribution: bloomDist,
    mechanic_distribution: mechanicDist,
  };
}

// ---------- Individual QA Checks ----------

function checkUniverseNotEmpty(m: EscapeGameMission): MissionQACheck {
  const hasUniverse = m.universe.name.length > 0
    && m.universe.setting.length > 0
    && m.universe.ambiance_description.length > 0;

  return {
    check_id: "universe_not_empty",
    check_name: "Universe is defined",
    passed: hasUniverse,
    severity: "blocking",
    details: hasUniverse ? "Universe defined" : "Universe is empty or generic — mission blocked",
  };
}

function checkBriefComplete(m: EscapeGameMission): MissionQACheck {
  const hasBrief = m.brief.context.length > 10
    && m.brief.objective.length > 10
    && m.brief.rules.length > 0
    && m.brief.learning_preview.length > 0;

  return {
    check_id: "brief_complete",
    check_name: "Brief / Intro complete",
    passed: hasBrief,
    severity: "blocking",
    details: hasBrief ? "Brief complete" : "Brief is incomplete — missing context, objective, rules, or learning preview",
  };
}

function checkStageProgression(m: EscapeGameMission): MissionQACheck {
  const hasMultipleStages = m.stages.length >= 3;
  const hasDifficultyRamp = m.stages.every((s, i) =>
    i === 0 || s.difficulty_ramp >= m.stages[i - 1].difficulty_ramp,
  );

  const passed = hasMultipleStages && hasDifficultyRamp;
  return {
    check_id: "stage_progression",
    check_name: "Multi-stage with difficulty ramp",
    passed,
    severity: "blocking",
    details: passed
      ? "Progression OK"
      : !hasMultipleStages
        ? "Too few stages — need at least 3 stages/rooms"
        : "Difficulty does not ramp up across stages",
  };
}

function checkPuzzleVariety(m: EscapeGameMission): MissionQACheck {
  const allMechanics = new Set(m.stages.flatMap((s) => s.puzzles.map((p) => p.mechanic)));
  const passed = allMechanics.size >= 3;

  return {
    check_id: "puzzle_variety",
    check_name: "At least 3 different mechanics",
    passed,
    severity: "warning",
    details: passed
      ? `${allMechanics.size} mechanics used`
      : `Only ${allMechanics.size} mechanic(s) — too repetitive`,
  };
}

function checkPuzzleQuality(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const hasEnoughPuzzles = allPuzzles.length >= 6;

  return {
    check_id: "puzzle_quality",
    check_name: "Sufficient puzzles",
    passed: hasEnoughPuzzles,
    severity: "blocking",
    details: hasEnoughPuzzles
      ? `${allPuzzles.length} puzzles`
      : `Only ${allPuzzles.length} puzzles — too shallow`,
  };
}

function checkHintsPresent(m: EscapeGameMission): MissionQACheck {
  const stagesWithHints = m.stages.filter((s) => s.hints.length > 0);
  const ratio = stagesWithHints.length / m.stages.length;
  const passed = ratio >= 0.6;

  return {
    check_id: "hints_present",
    check_name: "Progressive hints available",
    passed,
    severity: "warning",
    details: passed
      ? `${stagesWithHints.length}/${m.stages.length} stages have hints`
      : `Only ${stagesWithHints.length}/${m.stages.length} stages have hints — too frustrating`,
  };
}

function checkFeedbackPresent(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const withExplanation = allPuzzles.filter((p) => p.explanation.length >= 10);
  const ratio = allPuzzles.length > 0 ? withExplanation.length / allPuzzles.length : 0;
  const passed = ratio >= 0.8;

  return {
    check_id: "feedback_present",
    check_name: "Explanations on 80%+ puzzles",
    passed,
    severity: "blocking",
    details: passed
      ? `${withExplanation.length}/${allPuzzles.length} puzzles have explanations`
      : `Only ${withExplanation.length}/${allPuzzles.length} puzzles have explanations`,
  };
}

function checkDebriefPresent(m: EscapeGameMission): MissionQACheck {
  const d = m.debrief_template;
  const passed = d.key_takeaways.length >= 2
    && d.global_logic.length > 10
    && d.common_mistakes.length >= 1
    && d.active_recall_prompts.length >= 1;

  return {
    check_id: "debrief_present",
    check_name: "Debrief template complete",
    passed,
    severity: "blocking",
    details: passed ? "Debrief OK" : "Debrief is incomplete — needs takeaways, logic, mistakes, and recall prompts",
  };
}

function checkActiveRecall(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const servesMemo = allPuzzles.filter((p) => p.serves_memorization);
  const passed = servesMemo.length >= 3;

  return {
    check_id: "active_recall",
    check_name: "Active recall items present",
    passed,
    severity: "warning",
    details: passed
      ? `${servesMemo.length} items serve memorization`
      : `Only ${servesMemo.length} items serve memorization — retention risk`,
  };
}

function checkDifficultyCoherence(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const difficulties = allPuzzles.map((p) => p.difficulty);
  const min = Math.min(...difficulties);
  const max = Math.max(...difficulties);
  const spread = max - min;
  const passed = spread >= 2 && spread <= 4;

  return {
    check_id: "difficulty_coherence",
    check_name: "Difficulty range is coherent",
    passed,
    severity: "warning",
    details: passed
      ? `Difficulty spread: ${min}-${max}`
      : `Difficulty spread (${min}-${max}) is ${spread < 2 ? "too narrow" : "too wide"}`,
  };
}

function checkToneCoherence(m: EscapeGameMission): MissionQACheck {
  // Ensure narrative isn't empty/generic
  const hasNarrative = m.stages.every((s) => s.narrative_context.length > 20);
  const passed = hasNarrative;

  return {
    check_id: "tone_coherence",
    check_name: "Narrative tone is consistent",
    passed,
    severity: "warning",
    details: passed ? "Tone OK" : "Some stages have empty or generic narrative context",
  };
}

function checkNotQuizDisguised(m: EscapeGameMission): MissionQACheck {
  // A "quiz disguised" has only TRI/ELIMINATION, no narrative, no progression
  const allMechanics = new Set(m.stages.flatMap((s) => s.puzzles.map((p) => p.mechanic)));
  const onlyBasicQcm = allMechanics.size <= 2
    && (allMechanics.has("TRI") || allMechanics.has("ELIMINATION"))
    && !allMechanics.has("CODE_RECONSTRUCT")
    && !allMechanics.has("PUZZLE_STEPS")
    && !allMechanics.has("DECISION_TREE");

  const hasNarrativeFlow = m.brief.context.length > 20
    && m.universe.narrative_hook.length > 10
    && m.stages.length >= 3;

  const passed = !onlyBasicQcm && hasNarrativeFlow;

  return {
    check_id: "not_quiz_disguised",
    check_name: "Not a disguised quiz",
    passed,
    severity: "blocking",
    details: passed
      ? "Mission has real escape game structure"
      : "Mission resembles a quiz with cosmetic decoration — needs more varied mechanics and narrative depth",
  };
}

function checkBloomDiversity(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const blooms = new Set(allPuzzles.map((p) => p.bloom_level));
  const passed = blooms.size >= 3;

  return {
    check_id: "bloom_diversity",
    check_name: "Bloom level diversity",
    passed,
    severity: "warning",
    details: passed
      ? `${blooms.size} Bloom levels covered`
      : `Only ${blooms.size} Bloom level(s) — cognitive variety too low`,
  };
}

function checkDuration(m: EscapeGameMission): MissionQACheck {
  const totalMinutes = m.estimated_duration_sec / 60;
  const passed = totalMinutes >= 5 && totalMinutes <= 30;

  return {
    check_id: "duration_reasonable",
    check_name: "Duration 5-30 minutes",
    passed,
    severity: "warning",
    details: passed
      ? `Estimated ${Math.round(totalMinutes)} minutes`
      : `Estimated ${Math.round(totalMinutes)} minutes — ${totalMinutes < 5 ? "too short" : "too long"}`,
  };
}

// ---------- P0: Document Artifact / Noise QA Checks ----------

/**
 * BLOCKING: Check that no puzzle text (prompts, options, explanations) contains
 * document artifacts like CODEX, S-ECN, R2C, revision dates, branding, etc.
 */
function checkNoDocumentArtifactLeak(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const finalPuzzles = m.final_challenge?.puzzles ?? [];
  const allItems = [...allPuzzles, ...finalPuzzles];

  const leaks: string[] = [];

  for (const item of allItems) {
    // Check prompt
    const promptNoise = detectDocumentNoise(item.prompt ?? "");
    if (promptNoise.noisy) {
      leaks.push(`Prompt: "${(item.prompt ?? "").slice(0, 50)}..." → ${promptNoise.matches.join(", ")}`);
    }

    // Check all options/choices
    const choices = item.options ?? [];
    for (const choice of choices) {
      const choiceText = typeof choice === "string" ? choice : "";
      const choiceNoise = detectDocumentNoise(choiceText);
      if (choiceNoise.noisy) {
        leaks.push(`Option: "${choiceText.slice(0, 50)}..." → ${choiceNoise.matches.join(", ")}`);
      }
    }

    // Check explanation
    const explanation = item.explanation ?? "";
    if (explanation.length > 0) {
      const explNoise = detectDocumentNoise(explanation);
      if (explNoise.noisy) {
        leaks.push(`Explanation: "${explanation.slice(0, 50)}..." → ${explNoise.matches.join(", ")}`);
      }
    }

    // Check concept_key
    if (item.concept_key) {
      const keyNoise = detectDocumentNoise(item.concept_key);
      if (keyNoise.noisy) {
        leaks.push(`Concept key: "${item.concept_key}" → ${keyNoise.matches.join(", ")}`);
      }
    }
  }

  const passed = leaks.length === 0;
  return {
    check_id: "no_document_artifact_leak",
    check_name: "No document artifact in mission items",
    passed,
    severity: "blocking",
    details: passed
      ? "No document artifacts detected in mission items"
      : `${leaks.length} document artifact leak(s) found: ${leaks.slice(0, 3).join("; ")}${leaks.length > 3 ? ` (+${leaks.length - 3} more)` : ""}`,
  };
}

/**
 * WARNING: Check item cleanliness scores — items with high noise ratios
 * indicate poor content quality even if no blacklisted keyword is found.
 */
function checkItemNoiseCleanliness(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const finalPuzzles = m.final_challenge?.puzzles ?? [];
  const allItems = [...allPuzzles, ...finalPuzzles];

  let dirtyCount = 0;
  let totalScore = 0;

  for (const item of allItems) {
    const promptText = item.prompt ?? "";
    const choices = (item.options ?? []).map(
      (c: string | { label?: string }) => typeof c === "string" ? c : c.label ?? ""
    );
    const allText = [promptText, ...choices, item.explanation ?? ""].join(" ");
    const score = computeNoiseScore(allText);
    totalScore += score;

    if (score > 0.2) {
      dirtyCount++;
    }
  }

  const avgScore = allItems.length > 0 ? totalScore / allItems.length : 0;
  const passed = dirtyCount === 0 && avgScore < 0.1;

  return {
    check_id: "item_noise_cleanliness",
    check_name: "Item content cleanliness",
    passed,
    severity: "warning",
    details: passed
      ? `All items clean (avg noise score: ${avgScore.toFixed(3)})`
      : `${dirtyCount} item(s) have elevated noise scores (avg: ${avgScore.toFixed(3)})`,
  };
}

/**
 * BLOCKING: Check pedagogical validity — each item must have:
 * - A meaningful prompt (not just noise/metadata)
 * - At least 2 valid options
 * - A correct answer that is a real concept
 */
function checkPedagogicalValidity(m: EscapeGameMission): MissionQACheck {
  const allPuzzles = m.stages.flatMap((s) => s.puzzles);
  const finalPuzzles = m.final_challenge?.puzzles ?? [];
  const allItems = [...allPuzzles, ...finalPuzzles];

  const issues: string[] = [];

  for (const item of allItems) {
    const promptText = item.prompt ?? "";
    const choices = (item.options ?? []).map(
      (c: string | { label?: string }) => typeof c === "string" ? c : c.label ?? ""
    );

    // Prompt must have pedagogical content (not just structural labels)
    if (promptText.length < 10) {
      issues.push(`Item has too-short prompt: "${promptText}"`);
    }

    // Must have at least 2 meaningful options (only for mechanics that use options)
    if (choices.length > 0) {
      const meaningfulOptions = choices.filter((o: string) => o.length >= 3 && /[a-zA-ZÀ-ÿ]{3,}/.test(o));
      if (meaningfulOptions.length < 2) {
        issues.push(`Item has fewer than 2 meaningful options`);
      }
    }

    // Correct answer must be identifiable and clean
    const correctAnswer = item.correct_answer ?? "";
    if (typeof correctAnswer === "string" && correctAnswer.length < 3) {
      issues.push(`Correct answer too short: "${correctAnswer}"`);
    }
  }

  const passed = issues.length === 0;
  return {
    check_id: "pedagogical_validity",
    check_name: "Pedagogical validity of items",
    passed,
    severity: "blocking",
    details: passed
      ? `All ${allItems.length} items are pedagogically valid`
      : `${issues.length} pedagogical issue(s): ${issues.slice(0, 3).join("; ")}${issues.length > 3 ? ` (+${issues.length - 3} more)` : ""}`,
  };
}
