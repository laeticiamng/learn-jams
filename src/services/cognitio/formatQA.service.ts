import type {
  FormatQAReport, QACheckResult, QACheckSeverity,
  SongQAInput, SheetQAInput, StoryQAInput, VideoQAInput, OutputFormat,
} from "@/domain/cognitio/formatQA.types";

// ===== Song QA =====
export function runSongQA(generationId: string, song: SongQAInput): FormatQAReport {
  const checks: QACheckResult[] = [];

  // 1. Title present and meaningful
  checks.push(check("song_title", "Title present", song.title.length >= 3, "blocking", "Song must have a title"));

  // 2. Lyrics not empty and minimum length
  checks.push(check("song_lyrics_present", "Lyrics present", song.lyrics.length >= 50, "blocking", "Lyrics must be at least 50 characters"));

  // 3. Lyrics contain educational content (concept keys mentioned or adapted)
  const lyricsLower = song.lyrics.toLowerCase();
  const conceptCoverage = song.concept_keys.filter(k => lyricsLower.includes(k.toLowerCase().replace(/_/g, " "))).length;
  checks.push(check("song_concept_coverage", "Concept coverage", conceptCoverage > 0 || song.concept_keys.length === 0, "warning", `Only ${conceptCoverage}/${song.concept_keys.length} concepts referenced in lyrics`));

  // 4. Duration reasonable (30s - 300s)
  checks.push(check("song_duration", "Duration reasonable", song.duration_sec >= 30 && song.duration_sec <= 300, "warning", `Duration ${song.duration_sec}s outside recommended 30-300s range`));

  // 5. Style specified
  checks.push(check("song_style", "Style specified", song.style.length >= 3, "warning", "Musical style should be specified"));

  // 6. Learning objectives present
  checks.push(check("song_objectives", "Learning objectives", song.learning_objectives.length > 0, "blocking", "At least one learning objective required"));

  // 7. Not too repetitive (check for repeated lines)
  const lines = song.lyrics.split("\n").filter(l => l.trim().length > 0);
  const uniqueLines = new Set(lines.map(l => l.trim().toLowerCase()));
  const repetitionRatio = lines.length > 0 ? uniqueLines.size / lines.length : 1;
  checks.push(check("song_repetition", "Not overly repetitive", repetitionRatio >= 0.4, "warning", `High repetition detected (${Math.round(repetitionRatio * 100)}% unique lines)`));

  // 8. Language consistency
  checks.push(check("song_language", "Language specified", song.language.length >= 2, "info", "Language should be specified for accessibility"));

  return buildReport("music", generationId, checks);
}

// ===== Sheet QA =====
export function runSheetQA(generationId: string, sheet: SheetQAInput): FormatQAReport {
  const checks: QACheckResult[] = [];

  // 1. Title present
  checks.push(check("sheet_title", "Title present", sheet.title.length >= 3, "blocking", "Sheet must have a title"));

  // 2. Has sections
  checks.push(check("sheet_sections", "Has sections", sheet.sections.length >= 2, "blocking", "Sheet must have at least 2 sections"));

  // 3. Has summary
  checks.push(check("sheet_summary", "Summary present", sheet.has_summary, "warning", "A summary section improves retention"));

  // 4. Has key points
  checks.push(check("sheet_key_points", "Key points present", sheet.has_key_points, "warning", "Key points help memorization"));

  // 5. Has exercises
  checks.push(check("sheet_exercises", "Exercises present", sheet.has_exercises, "warning", "Practice exercises improve learning"));

  // 6. Word count reasonable (200 - 5000)
  checks.push(check("sheet_word_count", "Word count reasonable", sheet.total_word_count >= 200 && sheet.total_word_count <= 5000, "warning", `Word count ${sheet.total_word_count} outside 200-5000 range`));

  // 7. Concept coverage
  const sectionConcepts = new Set(sheet.sections.flatMap(s => s.concept_keys));
  const coverage = sheet.concept_keys.length > 0 ? sectionConcepts.size / sheet.concept_keys.length : 1;
  checks.push(check("sheet_concept_coverage", "Concept coverage", coverage >= 0.7, "blocking", `Only ${Math.round(coverage * 100)}% of concepts covered in sections`));

  // 8. Sections have content
  const emptySections = sheet.sections.filter(s => s.content.length < 50);
  checks.push(check("sheet_section_content", "Sections have content", emptySections.length === 0, "blocking", `${emptySections.length} sections have insufficient content`));

  // 9. Visual elements
  const hasVisuals = sheet.sections.some(s => s.has_visuals);
  checks.push(check("sheet_visuals", "Visual elements", hasVisuals, "info", "Adding visuals improves engagement"));

  return buildReport("dynamic_sheet", generationId, checks);
}

// ===== Story QA =====
export function runStoryQA(generationId: string, story: StoryQAInput): FormatQAReport {
  const checks: QACheckResult[] = [];

  // 1. Title present
  checks.push(check("story_title", "Title present", story.title.length >= 3, "blocking", "Story must have a title"));

  // 2. Has scenes
  checks.push(check("story_scenes", "Has scenes", story.scenes.length >= 3, "blocking", "Story must have at least 3 scenes"));

  // 3. Narrative arc
  checks.push(check("story_arc", "Narrative arc", story.narrative_arc.length >= 20, "blocking", "Story needs a narrative arc description"));

  // 4. Scene progression (indices sequential)
  const indicesSequential = story.scenes.every((s, i) => s.scene_index === i);
  checks.push(check("story_progression", "Scene progression", indicesSequential, "blocking", "Scene indices must be sequential starting from 0"));

  // 5. Each scene has narration
  const emptyNarrations = story.scenes.filter(s => s.narration.length < 20);
  checks.push(check("story_narrations", "Scenes have narration", emptyNarrations.length === 0, "blocking", `${emptyNarrations.length} scenes lack sufficient narration`));

  // 6. Visual descriptions present
  const missingVisuals = story.scenes.filter(s => s.visual_description.length < 10);
  checks.push(check("story_visuals", "Visual descriptions", missingVisuals.length === 0, "warning", `${missingVisuals.length} scenes lack visual descriptions`));

  // 7. Concept coverage
  const sceneConcepts = new Set(story.scenes.flatMap(s => s.concept_keys));
  const conceptCoverage = story.concept_keys.length > 0 ? sceneConcepts.size / story.concept_keys.length : 1;
  checks.push(check("story_concepts", "Concept coverage", conceptCoverage >= 0.6, "warning", `Only ${Math.round(conceptCoverage * 100)}% of concepts covered`));

  // 8. Duration reasonable
  checks.push(check("story_duration", "Duration reasonable", story.estimated_duration_sec >= 120 && story.estimated_duration_sec <= 600, "warning", `Duration ${story.estimated_duration_sec}s outside 120-600s range`));

  // 9. Learning objectives
  checks.push(check("story_objectives", "Learning objectives", story.learning_objectives.length > 0, "blocking", "Story needs learning objectives"));

  // 10. Not just narration (has interactions)
  const hasInteractions = story.scenes.some(s => s.interaction_type);
  checks.push(check("story_interactions", "Has interactions", hasInteractions, "warning", "Adding interactive elements improves engagement"));

  return buildReport("animated_story", generationId, checks);
}

// ===== Video QA =====
export function runVideoQA(generationId: string, video: VideoQAInput): FormatQAReport {
  const checks: QACheckResult[] = [];

  // 1. Title present
  checks.push(check("video_title", "Title present", video.title.length >= 3, "blocking", "Video must have a title"));

  // 2. Script present
  checks.push(check("video_script", "Script present", video.script.length >= 100, "blocking", "Video script must be at least 100 characters"));

  // 3. Has scenes
  checks.push(check("video_scenes", "Has scenes", video.scenes.length >= 2, "blocking", "Video must have at least 2 scenes"));

  // 4. Duration reasonable (30s - 600s)
  checks.push(check("video_duration", "Duration reasonable", video.total_duration_sec >= 30 && video.total_duration_sec <= 600, "warning", `Duration ${video.total_duration_sec}s outside 30-600s range`));

  // 5. Scene durations add up
  const sceneDurationTotal = video.scenes.reduce((sum, s) => sum + s.duration_sec, 0);
  const durationDiff = Math.abs(sceneDurationTotal - video.total_duration_sec);
  checks.push(check("video_duration_consistency", "Duration consistency", durationDiff <= 5, "warning", `Scene durations (${sceneDurationTotal}s) don't match total (${video.total_duration_sec}s)`));

  // 6. Has subtitles
  checks.push(check("video_subtitles", "Has subtitles", video.has_subtitles, "warning", "Subtitles improve accessibility"));

  // 7. Has voiceover
  checks.push(check("video_voiceover", "Has voiceover", video.has_voiceover, "warning", "Voiceover improves learning engagement"));

  // 8. Concept coverage
  const videoConcepts = new Set(video.scenes.flatMap(s => s.concept_keys));
  const conceptCoverage = video.concept_keys.length > 0 ? videoConcepts.size / video.concept_keys.length : 1;
  checks.push(check("video_concepts", "Concept coverage", conceptCoverage >= 0.5, "warning", `Only ${Math.round(conceptCoverage * 100)}% of concepts covered`));

  // 9. Each scene has script text
  const emptyScripts = video.scenes.filter(s => s.script_text.length < 20);
  checks.push(check("video_scene_scripts", "Scene scripts present", emptyScripts.length === 0, "blocking", `${emptyScripts.length} scenes lack script text`));

  return buildReport("video", generationId, checks);
}

// ===== Helpers =====

function check(id: string, name: string, passed: boolean, severity: QACheckSeverity, failMessage: string): QACheckResult {
  return {
    check_id: id,
    check_name: name,
    passed,
    severity,
    message: passed ? `${name}: OK` : failMessage,
  };
}

function buildReport(format: OutputFormat, generationId: string, checks: QACheckResult[]): FormatQAReport {
  const blocking = checks.filter(c => !c.passed && c.severity === "blocking");
  const warnings = checks.filter(c => !c.passed && c.severity === "warning");
  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    format,
    generation_id: generationId,
    overall_score: score,
    publish_blocked: blocking.length > 0,
    checks,
    blocking_violations: blocking,
    warnings,
    suggestions: warnings.map(w => w.message),
    reviewed_at: new Date().toISOString(),
  };
}
