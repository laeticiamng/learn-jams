// ============================================================
// Tests — Mission QA Service (Escape Game Quality Assurance)
// ============================================================

import { describe, it, expect } from "vitest";
import { runMissionQA, generateRetentionReport } from "./missionQA.service";
import type { EscapeGameMission } from "@/domain/cognitio/escapeGame.types";

function createValidMission(): EscapeGameMission {
  return {
    brief: {
      context: "You are trapped in an ancient library with magical knowledge scrolls.",
      objective: "Decode the three seals to escape by demonstrating mastery of cellular biology.",
      rules: ["Each room has a puzzle", "Use hints wisely", "Time is limited"],
      learning_preview: ["Cell structure", "Mitosis phases", "DNA replication"],
    },
    universe: {
      name: "The Enchanted Library",
      setting: "A medieval library with glowing books and shifting shelves",
      ambiance_description: "Dim lighting, floating particles, mystical music",
      narrative_hook: "The librarian has vanished and the exit seals have activated...",
      coherence_with_course: "Biology concepts mapped to magical discoveries",
    },
    stages: [
      {
        stage_index: 0,
        title: "The Entrance Hall",
        narrative_context: "You discover ancient scrolls describing cell structures on dusty shelves.",
        puzzles: [
          {
            id: "p1", mechanic: "TRI", prompt: "Sort organelles by function",
            instructions: "Drag each organelle to the correct category",
            options: ["Mitochondria", "Ribosome", "Golgi", "Nucleus"],
            correct_answer: ["Energy", "Protein synthesis", "Transport", "Control"],
            explanation: "Mitochondria produce ATP for energy, ribosomes synthesize proteins...",
            concept_key: "cell_organelles", bloom_level: "understand", difficulty: 2,
            serves_memorization: true,
          },
          {
            id: "p2", mechanic: "ASSOCIATION", prompt: "Match each organelle to its description",
            instructions: "Connect the pairs",
            options: ["Mitochondria", "Ribosome"],
            correct_answer: ["Powerhouse of the cell", "Protein factory"],
            explanation: "Understanding the role of each organelle is fundamental to cell biology.",
            concept_key: "cell_organelles", bloom_level: "remember", difficulty: 1,
            serves_memorization: true,
          },
        ],
        hints: [
          { level: 1, text: "Think about what each organelle produces", reveals_answer: false },
          { level: 2, text: "Mitochondria are related to energy", reveals_answer: false },
          { level: 3, text: "The answer involves ATP production", reveals_answer: true },
        ],
        target_concepts: ["cell_organelles"],
        difficulty_ramp: 1,
      },
      {
        stage_index: 1,
        title: "The Sequence Chamber",
        narrative_context: "A wall of ancient symbols shows the phases of cell division...",
        puzzles: [
          {
            id: "p3", mechanic: "SEQUENCE", prompt: "Order the phases of mitosis",
            instructions: "Put these phases in the correct order",
            options: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
            correct_answer: ["Prophase", "Metaphase", "Anaphase", "Telophase"],
            explanation: "Mitosis follows PMAT: Prophase, Metaphase, Anaphase, Telophase.",
            concept_key: "mitosis_phases", bloom_level: "apply", difficulty: 3,
            serves_memorization: true,
          },
          {
            id: "p4", mechanic: "ERROR_IDENTIFICATION", prompt: "Find the error in this cell division diagram",
            instructions: "Identify what is wrong",
            correct_answer: "Chromosomes are not aligned at the metaphase plate",
            explanation: "During metaphase, chromosomes must align at the cell equator.",
            concept_key: "mitosis_phases", bloom_level: "analyze", difficulty: 3,
            serves_memorization: false,
          },
        ],
        hints: [
          { level: 1, text: "Remember the mnemonic: PMAT", reveals_answer: false },
        ],
        target_concepts: ["mitosis_phases"],
        difficulty_ramp: 2,
      },
      {
        stage_index: 2,
        title: "The Code Vault",
        narrative_context: "The final room contains a locked vault with a DNA-based combination lock.",
        puzzles: [
          {
            id: "p5", mechanic: "CODE_RECONSTRUCT", prompt: "Reconstruct the DNA sequence",
            instructions: "Fill in the complementary base pairs",
            correct_answer: "TACGGA",
            explanation: "A pairs with T, C pairs with G in DNA base pairing.",
            concept_key: "dna_replication", bloom_level: "apply", difficulty: 4,
            serves_memorization: true,
          },
          {
            id: "p6", mechanic: "DECISION_TREE", prompt: "Decide which enzyme starts DNA replication",
            instructions: "Follow the decision tree to identify the correct enzyme",
            options: ["Helicase", "DNA Polymerase", "Ligase", "Primase"],
            correct_answer: "Helicase",
            explanation: "Helicase unwinds the double helix, initiating replication.",
            concept_key: "dna_replication", bloom_level: "evaluate", difficulty: 4,
            serves_memorization: false,
          },
        ],
        hints: [
          { level: 1, text: "Remember: A-T, C-G", reveals_answer: false },
          { level: 2, text: "The complementary strand mirrors the template", reveals_answer: false },
        ],
        target_concepts: ["dna_replication"],
        difficulty_ramp: 3,
      },
    ],
    final_challenge: {
      title: "The Grand Seal",
      narrative_context: "Combine all your knowledge to break the final seal!",
      mechanic_types: ["PUZZLE_STEPS", "ELIMINATION", "DECISION"],
      puzzles: [
        {
          id: "boss1", mechanic: "PUZZLE_STEPS", prompt: "Complete the cell division flowchart",
          instructions: "Fill in the missing steps",
          correct_answer: ["Interphase", "Prophase", "Metaphase"],
          explanation: "The complete cell cycle includes interphase followed by PMAT phases.",
          concept_key: "cell_cycle", bloom_level: "analyze", difficulty: 5,
          serves_memorization: true,
        },
      ],
      hints: [{ level: 1, text: "Think about the complete cell cycle", reveals_answer: false }],
      target_concepts: ["cell_cycle", "mitosis_phases", "dna_replication"],
      is_timed: true,
      time_limit_sec: 300,
    },
    debrief_template: {
      key_takeaways: [
        "Cell organelles have specialized functions",
        "Mitosis follows the PMAT sequence",
        "DNA replication relies on complementary base pairing",
      ],
      global_logic: "Understanding cell biology requires knowing structure (organelles), process (mitosis), and information flow (DNA replication).",
      common_mistakes: [
        "Confusing mitosis with meiosis",
        "Reversing base pairs (A-C instead of A-T)",
      ],
      active_recall_prompts: [
        "Name the 4 phases of mitosis in order",
        "What is the complementary base pair of Adenine?",
        "Which organelle produces ATP?",
      ],
      transfer_suggestions: [
        "Apply this knowledge to understanding cancer (uncontrolled cell division)",
      ],
    },
    mission_family: "scientific_discovery",
    universe_profile: {
      audience_level: "lycee",
      tone: "engaging",
      ambiance: "mystery",
      narrative_style: "immersive",
      tension_level: 3,
      abstraction_level: 3,
      hint_style: "moderate",
      reward_style: "achievement_based",
      interface_style: "clean",
    },
    estimated_duration_sec: 900,
    target_bloom_levels: ["remember", "understand", "apply", "analyze", "evaluate"],
    mechanic_variety_count: 6,
  };
}

describe("missionQA", () => {
  describe("runMissionQA", () => {
    it("passes a well-structured mission", () => {
      const mission = createValidMission();
      const result = runMissionQA("test-mission-1", mission);

      expect(result.overall_score).toBeGreaterThanOrEqual(70);
      expect(result.publish_blocked).toBe(false);
      expect(result.blocking_violations).toHaveLength(0);
    });

    it("blocks a mission with empty universe", () => {
      const mission = createValidMission();
      mission.universe.name = "";
      mission.universe.setting = "";
      mission.universe.ambiance_description = "";

      const result = runMissionQA("test-mission-2", mission);
      expect(result.blocking_violations.length).toBeGreaterThan(0);
      expect(result.publish_blocked).toBe(true);
    });

    it("blocks a mission with incomplete brief", () => {
      const mission = createValidMission();
      mission.brief.context = "";
      mission.brief.objective = "";

      const result = runMissionQA("test-mission-3", mission);
      expect(result.publish_blocked).toBe(true);
    });

    it("blocks a mission with too few stages", () => {
      const mission = createValidMission();
      mission.stages = [mission.stages[0]]; // Only 1 stage

      const result = runMissionQA("test-mission-4", mission);
      expect(result.publish_blocked).toBe(true);
    });

    it("blocks a quiz-disguised mission", () => {
      const mission = createValidMission();
      // Make all puzzles use only TRI mechanic
      for (const stage of mission.stages) {
        for (const puzzle of stage.puzzles) {
          puzzle.mechanic = "TRI";
        }
      }
      // Remove narrative
      mission.brief.context = "";
      mission.universe.narrative_hook = "";
      mission.stages = [mission.stages[0]]; // Single stage

      const result = runMissionQA("test-mission-5", mission);
      expect(result.publish_blocked).toBe(true);
    });

    it("warns when hints are missing", () => {
      const mission = createValidMission();
      // Remove hints from all stages
      for (const stage of mission.stages) {
        stage.hints = [];
      }

      const result = runMissionQA("test-mission-6", mission);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("blocks when explanations are missing", () => {
      const mission = createValidMission();
      for (const stage of mission.stages) {
        for (const puzzle of stage.puzzles) {
          puzzle.explanation = "";
        }
      }

      const result = runMissionQA("test-mission-7", mission);
      expect(result.publish_blocked).toBe(true);
    });

    it("blocks when debrief is incomplete", () => {
      const mission = createValidMission();
      mission.debrief_template = {
        key_takeaways: [],
        global_logic: "",
        common_mistakes: [],
        active_recall_prompts: [],
        transfer_suggestions: [],
      };

      const result = runMissionQA("test-mission-8", mission);
      expect(result.publish_blocked).toBe(true);
    });
  });

  describe("generateRetentionReport", () => {
    it("generates report with correct concept coverage", () => {
      const mission = createValidMission();
      const report = generateRetentionReport("test-mission-1", mission);

      expect(report.concepts_covered.length).toBeGreaterThan(0);
      expect(report.concepts_covered).toContain("cell_organelles");
      expect(report.concepts_covered).toContain("mitosis_phases");
      expect(report.concepts_covered).toContain("dna_replication");
    });

    it("counts active recalls correctly", () => {
      const mission = createValidMission();
      const report = generateRetentionReport("test-mission-1", mission);

      expect(report.active_recalls_present).toBeGreaterThan(0);
    });

    it("records bloom distribution", () => {
      const mission = createValidMission();
      const report = generateRetentionReport("test-mission-1", mission);

      expect(Object.keys(report.bloom_distribution).length).toBeGreaterThan(2);
    });

    it("records mechanic distribution", () => {
      const mission = createValidMission();
      const report = generateRetentionReport("test-mission-1", mission);

      expect(Object.keys(report.mechanic_distribution).length).toBeGreaterThan(2);
    });
  });
});
