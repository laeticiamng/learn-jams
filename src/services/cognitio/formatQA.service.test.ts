import { describe, it, expect } from "vitest";
import { runSongQA, runSheetQA, runStoryQA, runVideoQA } from "./formatQA.service";
import type { SongQAInput, SheetQAInput, StoryQAInput, VideoQAInput } from "@/domain/cognitio/formatQA.types";

// ===== runSongQA =====

describe("runSongQA", () => {
  const wellFormedSong: SongQAInput = {
    title: "The Water Cycle Song",
    lyrics: "Water falls from the sky as rain\nIt flows into rivers and streams again\nThe sun heats the surface and water evaporates\nRising up into clouds where it condensates\nAnd the cycle begins once more\nEvaporation, condensation, precipitation, and more",
    style: "folk acoustic",
    duration_sec: 120,
    concept_keys: ["evaporation", "condensation"],
    learning_objectives: ["Understand the stages of the water cycle"],
    target_audience: "primary school",
    language: "en",
  };

  it("passes a well-formed song", () => {
    const report = runSongQA("gen_001", wellFormedSong);
    expect(report.publish_blocked).toBe(false);
    expect(report.format).toBe("music");
    expect(report.generation_id).toBe("gen_001");
    expect(report.overall_score).toBeGreaterThan(0);
    expect(report.blocking_violations).toHaveLength(0);
  });

  it("blocks a song with an empty title", () => {
    const song: SongQAInput = { ...wellFormedSong, title: "" };
    const report = runSongQA("gen_002", song);
    expect(report.publish_blocked).toBe(true);
    const titleCheck = report.blocking_violations.find(c => c.check_id === "song_title");
    expect(titleCheck).toBeDefined();
    expect(titleCheck?.passed).toBe(false);
    expect(titleCheck?.severity).toBe("blocking");
  });

  it("blocks a song with no lyrics (empty string)", () => {
    const song: SongQAInput = { ...wellFormedSong, lyrics: "" };
    const report = runSongQA("gen_003", song);
    expect(report.publish_blocked).toBe(true);
    const lyricsCheck = report.blocking_violations.find(c => c.check_id === "song_lyrics_present");
    expect(lyricsCheck).toBeDefined();
    expect(lyricsCheck?.passed).toBe(false);
  });

  it("blocks a song with very short lyrics (under 50 chars)", () => {
    const song: SongQAInput = { ...wellFormedSong, lyrics: "Short." };
    const report = runSongQA("gen_004", song);
    expect(report.publish_blocked).toBe(true);
    expect(report.blocking_violations.some(c => c.check_id === "song_lyrics_present")).toBe(true);
  });

  it("blocks a song with no learning objectives", () => {
    const song: SongQAInput = { ...wellFormedSong, learning_objectives: [] };
    const report = runSongQA("gen_005", song);
    expect(report.publish_blocked).toBe(true);
    const objCheck = report.blocking_violations.find(c => c.check_id === "song_objectives");
    expect(objCheck).toBeDefined();
    expect(objCheck?.passed).toBe(false);
  });

  it("warns on short duration (under 30s)", () => {
    const song: SongQAInput = { ...wellFormedSong, duration_sec: 10 };
    const report = runSongQA("gen_006", song);
    // Should not block publication (only a warning)
    expect(report.publish_blocked).toBe(false);
    const durationWarning = report.warnings.find(c => c.check_id === "song_duration");
    expect(durationWarning).toBeDefined();
    expect(durationWarning?.passed).toBe(false);
    expect(durationWarning?.severity).toBe("warning");
  });

  it("warns on high repetition in lyrics", () => {
    // All identical lines produces 100% repetition ratio — uniqueLines.size / lines.length < 0.4
    const repetitiveLyrics = Array(20).fill("Water falls down").join("\n");
    const song: SongQAInput = { ...wellFormedSong, lyrics: repetitiveLyrics };
    const report = runSongQA("gen_007", song);
    expect(report.publish_blocked).toBe(false);
    const repetitionWarning = report.warnings.find(c => c.check_id === "song_repetition");
    expect(repetitionWarning).toBeDefined();
    expect(repetitionWarning?.passed).toBe(false);
    expect(repetitionWarning?.severity).toBe("warning");
  });
});

// ===== runSheetQA =====

describe("runSheetQA", () => {
  const makeSection = (title: string, conceptKeys: string[] = [], hasVisuals = false) => ({
    title,
    content: "This section contains detailed educational content about the topic at hand, covering all major points and explaining concepts clearly for students.",
    has_visuals: hasVisuals,
    concept_keys: conceptKeys,
  });

  const wellFormedSheet: SheetQAInput = {
    title: "Introduction to Photosynthesis",
    sections: [
      makeSection("What is Photosynthesis?", ["photosynthesis"]),
      makeSection("Chlorophyll and Light", ["chlorophyll", "light"]),
      makeSection("The Chemical Equation", ["glucose", "oxygen"]),
    ],
    concept_keys: ["photosynthesis", "chlorophyll", "light", "glucose", "oxygen"],
    has_summary: true,
    has_key_points: true,
    has_exercises: true,
    total_word_count: 800,
    language: "en",
  };

  it("passes a well-formed sheet with title, 3 sections with content, concepts, summary, key points, and exercises", () => {
    const report = runSheetQA("gen_010", wellFormedSheet);
    expect(report.publish_blocked).toBe(false);
    expect(report.format).toBe("dynamic_sheet");
    expect(report.blocking_violations).toHaveLength(0);
    expect(report.overall_score).toBeGreaterThan(0);
  });

  it("blocks a sheet with no sections (empty array)", () => {
    const sheet: SheetQAInput = { ...wellFormedSheet, sections: [] };
    const report = runSheetQA("gen_011", sheet);
    expect(report.publish_blocked).toBe(true);
    const sectionsCheck = report.blocking_violations.find(c => c.check_id === "sheet_sections");
    expect(sectionsCheck).toBeDefined();
    expect(sectionsCheck?.passed).toBe(false);
  });

  it("blocks a sheet with only one section (below minimum of 2)", () => {
    const sheet: SheetQAInput = {
      ...wellFormedSheet,
      sections: [makeSection("Only Section", ["photosynthesis", "chlorophyll", "light", "glucose", "oxygen"])],
    };
    const report = runSheetQA("gen_012", sheet);
    expect(report.publish_blocked).toBe(true);
    expect(report.blocking_violations.some(c => c.check_id === "sheet_sections")).toBe(true);
  });

  it("blocks a sheet with empty section content (under 50 chars)", () => {
    const sheet: SheetQAInput = {
      ...wellFormedSheet,
      sections: [
        { title: "Empty Section", content: "Too short.", has_visuals: false, concept_keys: ["photosynthesis"] },
        makeSection("Good Section", ["chlorophyll", "light", "glucose", "oxygen"]),
        makeSection("Another Good Section", []),
      ],
    };
    const report = runSheetQA("gen_013", sheet);
    expect(report.publish_blocked).toBe(true);
    const contentCheck = report.blocking_violations.find(c => c.check_id === "sheet_section_content");
    expect(contentCheck).toBeDefined();
    expect(contentCheck?.passed).toBe(false);
  });

  it("warns when summary is missing", () => {
    const sheet: SheetQAInput = { ...wellFormedSheet, has_summary: false };
    const report = runSheetQA("gen_014", sheet);
    expect(report.publish_blocked).toBe(false);
    const summaryWarning = report.warnings.find(c => c.check_id === "sheet_summary");
    expect(summaryWarning).toBeDefined();
    expect(summaryWarning?.passed).toBe(false);
    expect(summaryWarning?.severity).toBe("warning");
  });

  it("warns when exercises are missing", () => {
    const sheet: SheetQAInput = { ...wellFormedSheet, has_exercises: false };
    const report = runSheetQA("gen_015", sheet);
    expect(report.publish_blocked).toBe(false);
    const exercisesWarning = report.warnings.find(c => c.check_id === "sheet_exercises");
    expect(exercisesWarning).toBeDefined();
    expect(exercisesWarning?.passed).toBe(false);
    expect(exercisesWarning?.severity).toBe("warning");
  });
});

// ===== runStoryQA =====

describe("runStoryQA", () => {
  const makeScene = (index: number, conceptKeys: string[] = [], visualDescription = "A vivid scene showing the main character exploring the forest.") => ({
    scene_index: index,
    title: `Scene ${index + 1}`,
    narration: "The character walked through the forest, noticing the light filtering through the leaves above them.",
    visual_description: visualDescription,
    concept_keys: conceptKeys,
    interaction_type: index === 1 ? "tap_to_continue" : undefined,
  });

  const wellFormedStory: StoryQAInput = {
    title: "The Adventure of Learning",
    scenes: [
      makeScene(0, ["ecosystem"]),
      makeScene(1, ["biodiversity"]),
      makeScene(2, ["food_chain"]),
      makeScene(3, ["habitat"]),
    ],
    narrative_arc: "A young explorer discovers a magical forest and learns about the ecosystem, encountering each concept as part of their journey.",
    concept_keys: ["ecosystem", "biodiversity", "food_chain", "habitat"],
    learning_objectives: ["Understand core ecological relationships"],
    estimated_duration_sec: 240,
    language: "en",
  };

  it("passes a well-formed story with title, 4 scenes, narrative arc, sequential indices, and objectives", () => {
    const report = runStoryQA("gen_020", wellFormedStory);
    expect(report.publish_blocked).toBe(false);
    expect(report.format).toBe("animated_story");
    expect(report.blocking_violations).toHaveLength(0);
    expect(report.overall_score).toBeGreaterThan(0);
  });

  it("blocks a story with no scenes", () => {
    const story: StoryQAInput = { ...wellFormedStory, scenes: [] };
    const report = runStoryQA("gen_021", story);
    expect(report.publish_blocked).toBe(true);
    expect(report.blocking_violations.some(c => c.check_id === "story_scenes")).toBe(true);
  });

  it("blocks a story with fewer than 3 scenes", () => {
    const story: StoryQAInput = {
      ...wellFormedStory,
      scenes: [makeScene(0, ["ecosystem"]), makeScene(1, ["biodiversity"])],
    };
    const report = runStoryQA("gen_022", story);
    expect(report.publish_blocked).toBe(true);
    const scenesCheck = report.blocking_violations.find(c => c.check_id === "story_scenes");
    expect(scenesCheck).toBeDefined();
    expect(scenesCheck?.passed).toBe(false);
  });

  it("blocks a story with no narrative arc (empty string)", () => {
    const story: StoryQAInput = { ...wellFormedStory, narrative_arc: "" };
    const report = runStoryQA("gen_023", story);
    expect(report.publish_blocked).toBe(true);
    const arcCheck = report.blocking_violations.find(c => c.check_id === "story_arc");
    expect(arcCheck).toBeDefined();
    expect(arcCheck?.passed).toBe(false);
  });

  it("blocks a story with a narrative arc that is too short (under 20 chars)", () => {
    const story: StoryQAInput = { ...wellFormedStory, narrative_arc: "Short arc." };
    const report = runStoryQA("gen_024", story);
    expect(report.publish_blocked).toBe(true);
    expect(report.blocking_violations.some(c => c.check_id === "story_arc")).toBe(true);
  });

  it("blocks a story with non-sequential scene indices", () => {
    const story: StoryQAInput = {
      ...wellFormedStory,
      scenes: [
        makeScene(0, ["ecosystem"]),
        makeScene(2, ["biodiversity"]), // skipped index 1
        makeScene(3, ["food_chain"]),
        makeScene(4, ["habitat"]),
      ],
    };
    const report = runStoryQA("gen_025", story);
    expect(report.publish_blocked).toBe(true);
    const progressionCheck = report.blocking_violations.find(c => c.check_id === "story_progression");
    expect(progressionCheck).toBeDefined();
    expect(progressionCheck?.passed).toBe(false);
  });

  it("warns when visual descriptions are missing or too short", () => {
    const story: StoryQAInput = {
      ...wellFormedStory,
      scenes: [
        makeScene(0, ["ecosystem"], ""), // missing visual description
        makeScene(1, ["biodiversity"]),
        makeScene(2, ["food_chain"]),
        makeScene(3, ["habitat"]),
      ],
    };
    const report = runStoryQA("gen_026", story);
    expect(report.publish_blocked).toBe(false);
    const visualsWarning = report.warnings.find(c => c.check_id === "story_visuals");
    expect(visualsWarning).toBeDefined();
    expect(visualsWarning?.passed).toBe(false);
    expect(visualsWarning?.severity).toBe("warning");
  });
});

// ===== runVideoQA =====

describe("runVideoQA", () => {
  const makeVideoScene = (index: number, durationSec: number, conceptKeys: string[] = []) => ({
    scene_index: index,
    duration_sec: durationSec,
    script_text: "In this scene we explore the concept through a vivid animated sequence showing the process in detail.",
    visual_type: "animation" as const,
    concept_keys: conceptKeys,
  });

  const wellFormedVideo: VideoQAInput = {
    title: "How Volcanoes Work",
    script: "This educational video walks students through the formation of volcanoes, starting from tectonic plate movement and ending with a dramatic eruption sequence. Each scene builds on the previous to create a cohesive learning journey.",
    scenes: [
      makeVideoScene(0, 40, ["tectonics"]),
      makeVideoScene(1, 40, ["magma"]),
      makeVideoScene(2, 40, ["eruption"]),
    ],
    total_duration_sec: 120,
    concept_keys: ["tectonics", "magma", "eruption"],
    has_subtitles: true,
    has_voiceover: true,
    language: "en",
  };

  it("passes a well-formed video with title, script 200+ chars, 3 scenes, 120s duration, subtitles, and voiceover", () => {
    const report = runVideoQA("gen_030", wellFormedVideo);
    expect(report.publish_blocked).toBe(false);
    expect(report.format).toBe("video");
    expect(report.generation_id).toBe("gen_030");
    expect(report.blocking_violations).toHaveLength(0);
    expect(report.overall_score).toBeGreaterThan(0);
  });

  it("blocks a video with no script (empty string)", () => {
    const video: VideoQAInput = { ...wellFormedVideo, script: "" };
    const report = runVideoQA("gen_031", video);
    expect(report.publish_blocked).toBe(true);
    const scriptCheck = report.blocking_violations.find(c => c.check_id === "video_script");
    expect(scriptCheck).toBeDefined();
    expect(scriptCheck?.passed).toBe(false);
  });

  it("blocks a video with a script under 100 chars", () => {
    const video: VideoQAInput = { ...wellFormedVideo, script: "Too short." };
    const report = runVideoQA("gen_032", video);
    expect(report.publish_blocked).toBe(true);
    expect(report.blocking_violations.some(c => c.check_id === "video_script")).toBe(true);
  });

  it("blocks a video with no scenes", () => {
    const video: VideoQAInput = { ...wellFormedVideo, scenes: [] };
    const report = runVideoQA("gen_033", video);
    expect(report.publish_blocked).toBe(true);
    const scenesCheck = report.blocking_violations.find(c => c.check_id === "video_scenes");
    expect(scenesCheck).toBeDefined();
    expect(scenesCheck?.passed).toBe(false);
  });

  it("blocks a video with only one scene (below minimum of 2)", () => {
    const video: VideoQAInput = {
      ...wellFormedVideo,
      scenes: [makeVideoScene(0, 120, ["tectonics", "magma", "eruption"])],
    };
    const report = runVideoQA("gen_034", video);
    expect(report.publish_blocked).toBe(true);
    expect(report.blocking_violations.some(c => c.check_id === "video_scenes")).toBe(true);
  });

  it("warns when subtitles are missing", () => {
    const video: VideoQAInput = { ...wellFormedVideo, has_subtitles: false };
    const report = runVideoQA("gen_035", video);
    expect(report.publish_blocked).toBe(false);
    const subtitlesWarning = report.warnings.find(c => c.check_id === "video_subtitles");
    expect(subtitlesWarning).toBeDefined();
    expect(subtitlesWarning?.passed).toBe(false);
    expect(subtitlesWarning?.severity).toBe("warning");
  });

  it("warns on duration inconsistency between scenes and total", () => {
    // Scenes sum to 90s but total declared as 120s — difference of 30s exceeds allowed ±5s
    const video: VideoQAInput = {
      ...wellFormedVideo,
      scenes: [
        makeVideoScene(0, 30, ["tectonics"]),
        makeVideoScene(1, 30, ["magma"]),
        makeVideoScene(2, 30, ["eruption"]),
      ],
      total_duration_sec: 120,
    };
    const report = runVideoQA("gen_036", video);
    expect(report.publish_blocked).toBe(false);
    const consistencyWarning = report.warnings.find(c => c.check_id === "video_duration_consistency");
    expect(consistencyWarning).toBeDefined();
    expect(consistencyWarning?.passed).toBe(false);
    expect(consistencyWarning?.severity).toBe("warning");
    expect(consistencyWarning?.message).toContain("90s");
    expect(consistencyWarning?.message).toContain("120s");
  });
});
