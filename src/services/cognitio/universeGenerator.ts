// ============================================================
// UniverseGenerator — Maps course domains to immersive 3D
// universe configurations with theme-appropriate aesthetics.
// ============================================================

import type { DocumentDomain, MissionUniverseHint } from "@/domain/cognitio/contracts";
import type {
  UniverseConfig,
  UniverseTheme,
  RoomTemplate,
  ObjectAesthetic,
  LightingConfig,
  FogConfig,
} from "@/domain/cognitio/immersiveEngine.types";
import { getUniverseProfile } from "./immersiveUniverseProfiles";

// Re-export existing universe selection infrastructure
// This module EXTENDS missionUniverseSelector and missionUniverseProfiles
export { selectMissionUniverse } from "./missionUniverseSelector";
export { DOMAIN_UNIVERSE_PROFILES, adjustProfileForAudience } from "./missionUniverseProfiles";

// ---------- Input ----------

export interface UniverseGeneratorInput {
  domain: DocumentDomain;
  main_topic: string;
  reasoning_type: string;
  mission_universe_hint?: {
    domain: string;
    suggested_universe: string;
    reasoning_approach: string;
  };
  room_count: number;
  section_titles?: string[];
}

// ---------- Domain → Theme Mapping ----------

const DOMAIN_THEME_MAP: Record<DocumentDomain, UniverseTheme[]> = {
  medical_clinical: ["hospital_ward", "emergency_room", "epidemic_investigation"],
  medical_basic_science: ["molecular_facility", "body_systems", "cell_world"],
  public_health: ["epidemic_investigation", "hospital_ward"],
  law: ["courtroom", "legal_archives", "investigation_office"],
  computer_science: ["cyber_lab", "server_room", "network_operations"],
  history: ["archaeological_site", "time_museum", "archive_world"],
  fundamental_science: ["physics_lab", "chemistry_lab", "observatory"],
  engineering: ["cyber_lab", "physics_lab", "server_room"],
  humanities: ["philosophy_chamber", "literary_salon"],
  general: ["general_academy"],
};

/** Keywords that bias sub-theme selection within a domain. */
const THEME_KEYWORD_HINTS: Record<UniverseTheme, string[]> = {
  hospital_ward: ["hospital", "ward", "patient", "nursing", "care", "treatment", "clinical"],
  emergency_room: ["emergency", "urgency", "acute", "triage", "trauma", "resuscitation"],
  epidemic_investigation: ["epidemic", "outbreak", "infection", "contagion", "nosocomial", "public health", "prevention"],
  surgical_theater: ["surgery", "surgical", "operation", "anesthesia", "incision"],
  pharmacy_lab: ["pharmacy", "drug", "medication", "pharmacology", "dosage"],
  courtroom: ["court", "trial", "judge", "verdict", "litigation", "prosecution", "defense"],
  legal_archives: ["law", "legal", "statute", "regulation", "code", "legislation", "jurisprudence"],
  investigation_office: ["investigation", "detective", "evidence", "case", "inquiry", "criminal"],
  cyber_lab: ["programming", "software", "algorithm", "code", "development", "cyber", "AI"],
  server_room: ["server", "database", "infrastructure", "cloud", "deployment", "devops"],
  network_operations: ["network", "protocol", "routing", "tcp", "ip", "firewall", "security"],
  archaeological_site: ["archaeology", "ancient", "civilization", "ruins", "excavation", "artifact"],
  time_museum: ["history", "era", "century", "period", "museum", "exhibit", "timeline"],
  archive_world: ["archive", "document", "manuscript", "record", "chronicle", "source"],
  cell_world: ["cell", "cellular", "organelle", "membrane", "mitosis", "cytoplasm"],
  molecular_facility: ["molecule", "molecular", "DNA", "RNA", "protein", "gene", "biochemistry"],
  body_systems: ["anatomy", "organ", "system", "physiology", "body", "tissue", "skeletal"],
  physics_lab: ["physics", "mechanics", "force", "energy", "thermodynamics", "quantum"],
  observatory: ["astronomy", "star", "planet", "universe", "cosmos", "telescope", "orbit"],
  chemistry_lab: ["chemistry", "reaction", "element", "compound", "acid", "base", "solution"],
  math_workshop: ["math", "equation", "theorem", "proof", "algebra", "calculus"],
  economics_trading: ["economics", "market", "trade", "finance", "supply", "demand"],
  philosophy_chamber: ["philosophy", "ethics", "epistemology", "metaphysics", "logic", "morality"],
  literary_salon: ["literature", "novel", "poetry", "author", "narrative", "essay", "criticism"],
  general_academy: ["general", "learning", "study", "education"],
};

// ---------- Color Palettes ----------

const THEME_COLOR_PALETTES: Record<UniverseTheme, { primary: string; secondary: string; accent: string; background: string; danger: string }> = {
  hospital_ward:          { primary: "#3B82F6", secondary: "#93C5FD", accent: "#10B981", background: "#F0F9FF", danger: "#EF4444" },
  emergency_room:         { primary: "#DC2626", secondary: "#FCA5A5", accent: "#F59E0B", background: "#1E1E2E", danger: "#FF0000" },
  epidemic_investigation: { primary: "#059669", secondary: "#6EE7B7", accent: "#F59E0B", background: "#ECFDF5", danger: "#DC2626" },
  surgical_theater:       { primary: "#0EA5E9", secondary: "#7DD3FC", accent: "#14B8A6", background: "#F0FDFA", danger: "#EF4444" },
  pharmacy_lab:           { primary: "#8B5CF6", secondary: "#C4B5FD", accent: "#06B6D4", background: "#F5F3FF", danger: "#EF4444" },
  courtroom:              { primary: "#6366F1", secondary: "#A5B4FC", accent: "#D97706", background: "#2D2A3E", danger: "#DC2626" },
  legal_archives:         { primary: "#78716C", secondary: "#D6D3D1", accent: "#B45309", background: "#FAF9F6", danger: "#DC2626" },
  investigation_office:   { primary: "#44403C", secondary: "#A8A29E", accent: "#CA8A04", background: "#1C1917", danger: "#EF4444" },
  cyber_lab:              { primary: "#22C55E", secondary: "#86EFAC", accent: "#F97316", background: "#0A0A0A", danger: "#EF4444" },
  server_room:            { primary: "#06B6D4", secondary: "#67E8F9", accent: "#A855F7", background: "#0F172A", danger: "#F43F5E" },
  network_operations:     { primary: "#3B82F6", secondary: "#93C5FD", accent: "#10B981", background: "#111827", danger: "#EF4444" },
  archaeological_site:    { primary: "#D97706", secondary: "#FCD34D", accent: "#92400E", background: "#FFFBEB", danger: "#DC2626" },
  time_museum:            { primary: "#B45309", secondary: "#FDE68A", accent: "#7C3AED", background: "#FEF3C7", danger: "#DC2626" },
  archive_world:          { primary: "#78716C", secondary: "#E7E5E4", accent: "#D97706", background: "#FAF9F6", danger: "#DC2626" },
  cell_world:             { primary: "#10B981", secondary: "#6EE7B7", accent: "#EC4899", background: "#042F2E", danger: "#F43F5E" },
  molecular_facility:     { primary: "#14B8A6", secondary: "#5EEAD4", accent: "#8B5CF6", background: "#0F172A", danger: "#EF4444" },
  body_systems:           { primary: "#F43F5E", secondary: "#FDA4AF", accent: "#3B82F6", background: "#FFF1F2", danger: "#DC2626" },
  physics_lab:            { primary: "#6366F1", secondary: "#A5B4FC", accent: "#EC4899", background: "#1E1B4B", danger: "#EF4444" },
  observatory:            { primary: "#1E3A5F", secondary: "#7DD3FC", accent: "#FBBF24", background: "#020617", danger: "#F43F5E" },
  chemistry_lab:          { primary: "#7C3AED", secondary: "#C4B5FD", accent: "#F59E0B", background: "#1E1B4B", danger: "#EF4444" },
  math_workshop:          { primary: "#8B5CF6", secondary: "#DDD6FE", accent: "#06B6D4", background: "#FAFAF9", danger: "#DC2626" },
  economics_trading:      { primary: "#059669", secondary: "#A7F3D0", accent: "#6366F1", background: "#F0FDF4", danger: "#DC2626" },
  philosophy_chamber:     { primary: "#7C3AED", secondary: "#C4B5FD", accent: "#D97706", background: "#2D2235", danger: "#DC2626" },
  literary_salon:         { primary: "#D97706", secondary: "#FDE68A", accent: "#7C3AED", background: "#FFFBEB", danger: "#DC2626" },
  general_academy:        { primary: "#3B82F6", secondary: "#BFDBFE", accent: "#F59E0B", background: "#F8FAFC", danger: "#EF4444" },
};

// ---------- Room Sequence ----------

const ROOM_SEQUENCE: { purpose: string; geometry: RoomTemplate["geometry"]; size: RoomTemplate["size"]; max_objects: number }[] = [
  { purpose: "briefing",    geometry: "rectangular",   size: "small",  max_objects: 4 },
  { purpose: "discovery",   geometry: "hexagonal",     size: "medium", max_objects: 8 },
  { purpose: "analysis",    geometry: "circular",      size: "medium", max_objects: 10 },
  { purpose: "reasoning",   geometry: "hexagonal",     size: "large",  max_objects: 12 },
  { purpose: "application", geometry: "rectangular",   size: "large",  max_objects: 10 },
  { purpose: "synthesis",   geometry: "amphitheater",  size: "large",  max_objects: 14 },
  { purpose: "debrief",     geometry: "circular",      size: "small",  max_objects: 4 },
];

/** Aesthetic tags associated with each theme for room decoration. */
const THEME_ROOM_TAGS: Record<UniverseTheme, string[]> = {
  hospital_ward:          ["medical_equipment", "patient_charts", "monitors", "sterile"],
  emergency_room:         ["urgency_lights", "trauma_gear", "resuscitation", "fast_pace"],
  epidemic_investigation: ["hazmat", "samples", "containment", "field_lab"],
  surgical_theater:       ["surgical_lights", "instruments", "operating_table", "sterile"],
  pharmacy_lab:           ["flasks", "compounds", "prescriptions", "molecular_models"],
  courtroom:              ["gavel", "benches", "law_books", "witness_stand"],
  legal_archives:         ["filing_cabinets", "leather_books", "desks", "parchment"],
  investigation_office:   ["evidence_board", "case_files", "magnifying_glass", "dim_lights"],
  cyber_lab:              ["holographic_displays", "code_terminals", "circuit_boards", "neon"],
  server_room:            ["server_racks", "cables", "cooling_units", "blinking_LEDs"],
  network_operations:     ["network_maps", "traffic_displays", "router_models", "dashboards"],
  archaeological_site:    ["excavation_tools", "fossils", "ancient_maps", "dusty_artifacts"],
  time_museum:            ["display_cases", "timeline_walls", "period_objects", "plaques"],
  archive_world:          ["scrolls", "old_books", "reading_desks", "candelabras"],
  cell_world:             ["organelle_models", "membrane_walls", "nucleus", "cytoplasm_floor"],
  molecular_facility:     ["dna_helix", "electron_microscope", "protein_models", "lab_benches"],
  body_systems:           ["anatomical_models", "organ_displays", "skeleton", "interactive_body"],
  physics_lab:            ["pendulums", "prisms", "oscilloscopes", "whiteboards"],
  observatory:            ["telescopes", "star_charts", "dome_ceiling", "celestial_models"],
  chemistry_lab:          ["beakers", "bunsen_burners", "periodic_table", "fume_hoods"],
  math_workshop:          ["geometric_shapes", "chalkboards", "number_displays", "graph_paper"],
  economics_trading:      ["trading_screens", "charts", "currency_displays", "data_feeds"],
  philosophy_chamber:     ["ancient_busts", "debate_podiums", "thought_clouds", "candles"],
  literary_salon:         ["bookshelves", "writing_desks", "quills", "manuscripts"],
  general_academy:        ["desks", "boards", "globes", "bookshelves"],
};

// ---------- Public Functions ----------

/**
 * Generate a complete UniverseConfig from document domain and mission data.
 * This extends the existing missionUniverseSelector by producing the 3D
 * immersive configuration that the rendering engine consumes.
 */
export function generateUniverseConfig(input: UniverseGeneratorInput): UniverseConfig {
  const hintSuggestion = input.mission_universe_hint?.suggested_universe;
  const theme = mapDomainToTheme(input.domain, hintSuggestion ?? input.main_topic);

  return {
    theme,
    domain: input.domain,
    color_palette: generateColorPalette(theme),
    ambient_preset: buildAmbientPreset(theme),
    room_templates: generateRoomTemplates(theme, input.room_count, input.section_titles),
    object_aesthetic: generateObjectAesthetic(theme),
    lighting: generateLighting(theme),
    fog: generateFog(theme),
    narrative_vocabulary: generateNarrativeVocabulary(input.domain, theme),
  };
}

/**
 * Map a DocumentDomain (and optional topic hint) to the best UniverseTheme.
 */
export function mapDomainToTheme(domain: DocumentDomain, hint?: string): UniverseTheme {
  const candidates = DOMAIN_THEME_MAP[domain] ?? DOMAIN_THEME_MAP.general;

  // Single candidate — return immediately
  if (candidates.length === 1) return candidates[0];

  // If no hint, return first (default) candidate
  if (!hint) return candidates[0];

  const lowerHint = hint.toLowerCase();

  // Score each candidate by keyword matches in the hint
  let bestTheme = candidates[0];
  let bestScore = 0;

  for (const theme of candidates) {
    const keywords = THEME_KEYWORD_HINTS[theme] ?? [];
    let score = 0;
    for (const kw of keywords) {
      if (lowerHint.includes(kw.toLowerCase())) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTheme = theme;
    }
  }

  return bestTheme;
}

/**
 * Generate a theme-specific color palette.
 */
export function generateColorPalette(theme: UniverseTheme): {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  danger: string;
} {
  return THEME_COLOR_PALETTES[theme] ?? THEME_COLOR_PALETTES.general_academy;
}

/**
 * Generate room templates following the canonical pedagogical sequence:
 * briefing → discovery → analysis → reasoning → application → synthesis → debrief.
 *
 * If `count` exceeds the canonical 7, intermediate rooms repeat the
 * discovery/analysis/reasoning cycle. If fewer, the sequence is truncated
 * but always keeps briefing (first) and debrief (last).
 */
export function generateRoomTemplates(
  theme: UniverseTheme,
  count: number,
  sectionTitles?: string[],
): RoomTemplate[] {
  const clampedCount = Math.max(2, Math.min(count, 20));
  const tags = THEME_ROOM_TAGS[theme] ?? THEME_ROOM_TAGS.general_academy;

  if (clampedCount <= ROOM_SEQUENCE.length) {
    // Truncate: keep first (briefing), last (debrief), fill middle
    const rooms: RoomTemplate[] = [];
    const midSlots = clampedCount - 2;
    const middleTemplates = ROOM_SEQUENCE.slice(1, 1 + midSlots);

    // Briefing
    rooms.push(buildRoom(ROOM_SEQUENCE[0], tags, sectionTitles?.[0]));

    // Middle rooms
    for (let i = 0; i < middleTemplates.length; i++) {
      rooms.push(buildRoom(middleTemplates[i], tags, sectionTitles?.[i + 1]));
    }

    // Debrief
    rooms.push(buildRoom(ROOM_SEQUENCE[ROOM_SEQUENCE.length - 1], tags, sectionTitles?.[clampedCount - 1]));

    return rooms;
  }

  // More rooms than canonical: cycle through middle phases
  const rooms: RoomTemplate[] = [];
  rooms.push(buildRoom(ROOM_SEQUENCE[0], tags, sectionTitles?.[0]));

  const cyclePhases = ROOM_SEQUENCE.slice(1, ROOM_SEQUENCE.length - 1); // discovery..synthesis
  const middleCount = clampedCount - 2;

  for (let i = 0; i < middleCount; i++) {
    const phase = cyclePhases[i % cyclePhases.length];
    rooms.push(buildRoom(phase, tags, sectionTitles?.[i + 1]));
  }

  rooms.push(buildRoom(ROOM_SEQUENCE[ROOM_SEQUENCE.length - 1], tags, sectionTitles?.[clampedCount - 1]));

  return rooms;
}

/**
 * Generate theme-specific object aesthetic configuration.
 */
export function generateObjectAesthetic(theme: UniverseTheme): ObjectAesthetic {
  const aesthetics: Record<string, ObjectAesthetic> = {
    // Medical themes
    hospital_ward:          { material: "glass",    glow_intensity: 0.3, interaction_highlight_color: "#3B82F6", locked_appearance: "sealed" },
    emergency_room:         { material: "metal",    glow_intensity: 0.6, interaction_highlight_color: "#EF4444", locked_appearance: "sealed" },
    epidemic_investigation: { material: "glass",    glow_intensity: 0.4, interaction_highlight_color: "#10B981", locked_appearance: "sealed" },
    surgical_theater:       { material: "metal",    glow_intensity: 0.3, interaction_highlight_color: "#0EA5E9", locked_appearance: "sealed" },
    pharmacy_lab:           { material: "glass",    glow_intensity: 0.5, interaction_highlight_color: "#8B5CF6", locked_appearance: "sealed" },
    // Law themes
    courtroom:              { material: "wood",     glow_intensity: 0.2, interaction_highlight_color: "#D97706", locked_appearance: "chained" },
    legal_archives:         { material: "wood",     glow_intensity: 0.2, interaction_highlight_color: "#B45309", locked_appearance: "chained" },
    investigation_office:   { material: "mixed",    glow_intensity: 0.3, interaction_highlight_color: "#CA8A04", locked_appearance: "chained" },
    // CS themes
    cyber_lab:              { material: "digital",  glow_intensity: 0.8, interaction_highlight_color: "#22C55E", locked_appearance: "encrypted" },
    server_room:            { material: "metal",    glow_intensity: 0.7, interaction_highlight_color: "#06B6D4", locked_appearance: "encrypted" },
    network_operations:     { material: "digital",  glow_intensity: 0.6, interaction_highlight_color: "#3B82F6", locked_appearance: "encrypted" },
    // History themes
    archaeological_site:    { material: "stone",    glow_intensity: 0.2, interaction_highlight_color: "#D97706", locked_appearance: "sealed" },
    time_museum:            { material: "mixed",    glow_intensity: 0.3, interaction_highlight_color: "#B45309", locked_appearance: "frozen" },
    archive_world:          { material: "wood",     glow_intensity: 0.2, interaction_highlight_color: "#78716C", locked_appearance: "sealed" },
    // Science themes
    cell_world:             { material: "organic",  glow_intensity: 0.6, interaction_highlight_color: "#10B981", locked_appearance: "frozen" },
    molecular_facility:     { material: "glass",    glow_intensity: 0.7, interaction_highlight_color: "#14B8A6", locked_appearance: "frozen" },
    body_systems:           { material: "organic",  glow_intensity: 0.5, interaction_highlight_color: "#F43F5E", locked_appearance: "frozen" },
    physics_lab:            { material: "metal",    glow_intensity: 0.5, interaction_highlight_color: "#6366F1", locked_appearance: "dimmed" },
    observatory:            { material: "metal",    glow_intensity: 0.4, interaction_highlight_color: "#FBBF24", locked_appearance: "dimmed" },
    chemistry_lab:          { material: "glass",    glow_intensity: 0.6, interaction_highlight_color: "#7C3AED", locked_appearance: "sealed" },
    math_workshop:          { material: "mixed",    glow_intensity: 0.3, interaction_highlight_color: "#8B5CF6", locked_appearance: "dimmed" },
    economics_trading:      { material: "digital",  glow_intensity: 0.5, interaction_highlight_color: "#059669", locked_appearance: "encrypted" },
    // Humanities themes
    philosophy_chamber:     { material: "stone",    glow_intensity: 0.3, interaction_highlight_color: "#7C3AED", locked_appearance: "dimmed" },
    literary_salon:         { material: "wood",     glow_intensity: 0.3, interaction_highlight_color: "#D97706", locked_appearance: "sealed" },
    // General
    general_academy:        { material: "mixed",    glow_intensity: 0.4, interaction_highlight_color: "#3B82F6", locked_appearance: "dimmed" },
  };

  return aesthetics[theme] ?? aesthetics.general_academy;
}

/**
 * Generate theme-specific lighting configuration.
 */
export function generateLighting(theme: UniverseTheme): LightingConfig {
  const configs: Record<string, LightingConfig> = {
    // Medical — bright, clinical
    hospital_ward:          { ambient_intensity: 0.8, directional_intensity: 0.6, point_light_count: 4, color_temperature: "clinical", shadows: true },
    emergency_room:         { ambient_intensity: 0.9, directional_intensity: 0.8, point_light_count: 6, color_temperature: "clinical", shadows: true },
    epidemic_investigation: { ambient_intensity: 0.6, directional_intensity: 0.5, point_light_count: 4, color_temperature: "cool",     shadows: true },
    surgical_theater:       { ambient_intensity: 0.9, directional_intensity: 0.9, point_light_count: 6, color_temperature: "clinical", shadows: true },
    pharmacy_lab:           { ambient_intensity: 0.7, directional_intensity: 0.6, point_light_count: 4, color_temperature: "cool",     shadows: true },
    // Law — warm, atmospheric
    courtroom:              { ambient_intensity: 0.5, directional_intensity: 0.7, point_light_count: 4, color_temperature: "warm",     shadows: true },
    legal_archives:         { ambient_intensity: 0.4, directional_intensity: 0.5, point_light_count: 3, color_temperature: "warm",     shadows: true },
    investigation_office:   { ambient_intensity: 0.3, directional_intensity: 0.6, point_light_count: 2, color_temperature: "warm",     shadows: true },
    // CS — dark, neon-accented
    cyber_lab:              { ambient_intensity: 0.2, directional_intensity: 0.3, point_light_count: 8, color_temperature: "cool",     shadows: true },
    server_room:            { ambient_intensity: 0.2, directional_intensity: 0.2, point_light_count: 6, color_temperature: "cool",     shadows: false },
    network_operations:     { ambient_intensity: 0.3, directional_intensity: 0.4, point_light_count: 6, color_temperature: "cool",     shadows: true },
    // History — warm, muted
    archaeological_site:    { ambient_intensity: 0.5, directional_intensity: 0.8, point_light_count: 3, color_temperature: "warm",     shadows: true },
    time_museum:            { ambient_intensity: 0.5, directional_intensity: 0.6, point_light_count: 4, color_temperature: "warm",     shadows: true },
    archive_world:          { ambient_intensity: 0.4, directional_intensity: 0.5, point_light_count: 3, color_temperature: "warm",     shadows: true },
    // Science — balanced
    cell_world:             { ambient_intensity: 0.4, directional_intensity: 0.3, point_light_count: 6, color_temperature: "cool",     shadows: true },
    molecular_facility:     { ambient_intensity: 0.5, directional_intensity: 0.5, point_light_count: 6, color_temperature: "cool",     shadows: true },
    body_systems:           { ambient_intensity: 0.6, directional_intensity: 0.5, point_light_count: 5, color_temperature: "neutral",  shadows: true },
    physics_lab:            { ambient_intensity: 0.5, directional_intensity: 0.6, point_light_count: 5, color_temperature: "neutral",  shadows: true },
    observatory:            { ambient_intensity: 0.1, directional_intensity: 0.2, point_light_count: 4, color_temperature: "cool",     shadows: true },
    chemistry_lab:          { ambient_intensity: 0.6, directional_intensity: 0.6, point_light_count: 5, color_temperature: "neutral",  shadows: true },
    math_workshop:          { ambient_intensity: 0.7, directional_intensity: 0.5, point_light_count: 3, color_temperature: "neutral",  shadows: false },
    economics_trading:      { ambient_intensity: 0.5, directional_intensity: 0.5, point_light_count: 4, color_temperature: "neutral",  shadows: true },
    // Humanities — warm, intimate
    philosophy_chamber:     { ambient_intensity: 0.3, directional_intensity: 0.4, point_light_count: 3, color_temperature: "warm",     shadows: true },
    literary_salon:         { ambient_intensity: 0.5, directional_intensity: 0.5, point_light_count: 4, color_temperature: "warm",     shadows: true },
    // General
    general_academy:        { ambient_intensity: 0.6, directional_intensity: 0.5, point_light_count: 4, color_temperature: "neutral",  shadows: true },
  };

  return configs[theme] ?? configs.general_academy;
}

/**
 * Generate theme-specific fog configuration.
 */
export function generateFog(theme: UniverseTheme): FogConfig {
  const configs: Record<string, FogConfig> = {
    // Medical — minimal fog
    hospital_ward:          { enabled: false, color: "#FFFFFF", near: 50, far: 200 },
    emergency_room:         { enabled: false, color: "#FFFFFF", near: 50, far: 200 },
    epidemic_investigation: { enabled: true,  color: "#D1FAE5", near: 30, far: 150 },
    surgical_theater:       { enabled: false, color: "#FFFFFF", near: 50, far: 200 },
    pharmacy_lab:           { enabled: false, color: "#EDE9FE", near: 40, far: 180 },
    // Law — atmospheric fog
    courtroom:              { enabled: true,  color: "#1E1B4B", near: 40, far: 160 },
    legal_archives:         { enabled: true,  color: "#78716C", near: 30, far: 120 },
    investigation_office:   { enabled: true,  color: "#1C1917", near: 20, far: 100 },
    // CS — digital haze
    cyber_lab:              { enabled: true,  color: "#022C22", near: 20, far: 120 },
    server_room:            { enabled: true,  color: "#0F172A", near: 15, far: 100 },
    network_operations:     { enabled: true,  color: "#111827", near: 25, far: 130 },
    // History — dusty atmosphere
    archaeological_site:    { enabled: true,  color: "#D97706", near: 25, far: 130 },
    time_museum:            { enabled: true,  color: "#FEF3C7", near: 35, far: 160 },
    archive_world:          { enabled: true,  color: "#A8A29E", near: 30, far: 140 },
    // Science — varied
    cell_world:             { enabled: true,  color: "#042F2E", near: 15, far: 100 },
    molecular_facility:     { enabled: true,  color: "#0F172A", near: 20, far: 120 },
    body_systems:           { enabled: false, color: "#FFF1F2", near: 40, far: 180 },
    physics_lab:            { enabled: false, color: "#1E1B4B", near: 40, far: 180 },
    observatory:            { enabled: true,  color: "#020617", near: 10, far: 200 },
    chemistry_lab:          { enabled: true,  color: "#EDE9FE", near: 30, far: 150 },
    math_workshop:          { enabled: false, color: "#FFFFFF", near: 50, far: 200 },
    economics_trading:      { enabled: false, color: "#F0FDF4", near: 50, far: 200 },
    // Humanities — moody
    philosophy_chamber:     { enabled: true,  color: "#2D2235", near: 20, far: 110 },
    literary_salon:         { enabled: true,  color: "#FFFBEB", near: 35, far: 160 },
    // General
    general_academy:        { enabled: false, color: "#F8FAFC", near: 50, far: 200 },
  };

  return configs[theme] ?? configs.general_academy;
}

/**
 * Generate domain-specific vocabulary for narrative generation.
 * These words/phrases are used by the narrative engine to flavour
 * mission text, NPC dialogue, and room descriptions.
 */
export function generateNarrativeVocabulary(domain: DocumentDomain, theme: UniverseTheme): string[] {
  const domainVocab: Record<DocumentDomain, string[]> = {
    medical_clinical: [
      "patient", "diagnostic", "symptom", "treatment", "protocol",
      "prognosis", "contraindication", "complication", "prescription",
      "clinical evidence", "differential diagnosis", "vital signs",
    ],
    medical_basic_science: [
      "molecule", "receptor", "pathway", "enzyme", "substrate",
      "mechanism", "cascade", "expression", "mutation", "biomarker",
      "signal transduction", "homeostasis",
    ],
    public_health: [
      "population", "incidence", "prevalence", "risk factor", "prevention",
      "epidemiology", "screening", "outbreak", "public policy", "surveillance",
      "intervention", "determinant",
    ],
    law: [
      "statute", "precedent", "jurisprudence", "liability", "defendant",
      "plaintiff", "ruling", "appeal", "evidence", "testimony",
      "constitutional", "obligation",
    ],
    computer_science: [
      "algorithm", "data structure", "runtime", "complexity", "interface",
      "protocol", "encryption", "stack", "thread", "pipeline",
      "abstraction", "module",
    ],
    history: [
      "era", "dynasty", "revolution", "treaty", "empire",
      "chronicle", "archive", "civilization", "reform", "legacy",
      "primary source", "epoch",
    ],
    fundamental_science: [
      "hypothesis", "experiment", "variable", "equation", "constant",
      "theorem", "observation", "measurement", "spectrum", "field",
      "conservation", "equilibrium",
    ],
    engineering: [
      "system", "design", "specification", "tolerance", "prototype",
      "calibration", "load", "stress", "optimization", "efficiency",
      "schematic", "component",
    ],
    humanities: [
      "thesis", "argument", "interpretation", "dialectic", "narrative",
      "paradigm", "discourse", "hermeneutics", "canon", "critique",
      "perspective", "meaning",
    ],
    general: [
      "concept", "principle", "example", "definition", "category",
      "relationship", "pattern", "evidence", "analysis", "conclusion",
      "foundation", "application",
    ],
  };

  // Merge domain vocabulary with theme-specific room tags for richer narrative
  const baseVocab = domainVocab[domain] ?? domainVocab.general;
  const themeTags = THEME_ROOM_TAGS[theme] ?? [];

  // Enrich with immersive universe profile motifs and signature objects
  const universeProfile = getUniverseProfile(domain);
  const immersiveTerms = [
    ...universeProfile.atmosphere.motifs,
    ...universeProfile.atmosphere.signature_objects,
    ...universeProfile.atmosphere.color_mood,
  ];

  // Deduplicate
  const combined = new Set<string>([...baseVocab, ...themeTags, ...immersiveTerms]);
  return Array.from(combined);
}

// ---------- Internal Helpers ----------

function buildAmbientPreset(theme: UniverseTheme): string {
  const presets: Record<string, string> = {
    hospital_ward: "clinical_hum",
    emergency_room: "emergency_pulse",
    epidemic_investigation: "biohazard_ambient",
    surgical_theater: "surgical_focus",
    pharmacy_lab: "lab_gentle",
    courtroom: "courtroom_echo",
    legal_archives: "archive_silence",
    investigation_office: "noir_tension",
    cyber_lab: "digital_pulse",
    server_room: "server_drone",
    network_operations: "network_flow",
    archaeological_site: "desert_wind",
    time_museum: "museum_hush",
    archive_world: "parchment_rustle",
    cell_world: "cellular_rhythm",
    molecular_facility: "molecular_hum",
    body_systems: "heartbeat_ambient",
    physics_lab: "lab_oscillation",
    observatory: "cosmic_drone",
    chemistry_lab: "bubbling_reaction",
    math_workshop: "chalk_scratch",
    economics_trading: "trading_floor",
    philosophy_chamber: "contemplation",
    literary_salon: "page_turn",
    general_academy: "academy_ambient",
  };

  return presets[theme] ?? "academy_ambient";
}

function buildRoom(
  template: (typeof ROOM_SEQUENCE)[number],
  themeTags: string[],
  sectionTitle?: string,
): RoomTemplate {
  const purposeLabel = sectionTitle
    ? `${template.purpose}: ${sectionTitle}`
    : template.purpose;

  return {
    purpose: purposeLabel,
    geometry: template.geometry,
    size: template.size,
    aesthetic_tags: [...themeTags],
    max_objects: template.max_objects,
  };
}
