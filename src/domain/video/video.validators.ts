// ============================================================
// Video Domain Validators
// ============================================================

import {
  VIDEO_PROJECT_TYPES, VIDEO_PROJECT_STATUSES, VIDEO_MODES,
  VIDEO_ASSET_TYPES, VIDEO_RUN_TYPES,
  type VideoProjectType, type VideoProjectStatus, type VideoMode,
  type VideoAssetType, type VideoRunType,
  type CreateVideoProjectInput, type EnrichedSynopsis,
  type FallbackRenderPlan,
} from "./video.types";

export function isValidVideoProjectType(type: string): type is VideoProjectType {
  return (VIDEO_PROJECT_TYPES as readonly string[]).includes(type);
}

export function isValidVideoProjectStatus(status: string): status is VideoProjectStatus {
  return (VIDEO_PROJECT_STATUSES as readonly string[]).includes(status);
}

export function isValidVideoMode(mode: string): mode is VideoMode {
  return (VIDEO_MODES as readonly string[]).includes(mode);
}

export function isValidVideoAssetType(type: string): type is VideoAssetType {
  return (VIDEO_ASSET_TYPES as readonly string[]).includes(type);
}

export function isValidVideoRunType(type: string): type is VideoRunType {
  return (VIDEO_RUN_TYPES as readonly string[]).includes(type);
}

export function validateCreateVideoProject(input: CreateVideoProjectInput): string[] {
  const errors: string[] = [];

  if (!input.user_id) errors.push("user_id is required");
  if (!input.title || input.title.trim().length === 0) errors.push("title is required");

  if (!isValidVideoProjectType(input.project_type)) {
    errors.push(`project_type must be one of: ${VIDEO_PROJECT_TYPES.join(", ")}`);
  }

  if (input.mode && !isValidVideoMode(input.mode)) {
    errors.push(`mode must be one of: ${VIDEO_MODES.join(", ")}`);
  }

  return errors;
}

export function validateEnrichedSynopsis(synopsis: EnrichedSynopsis): string[] {
  const errors: string[] = [];

  if (!synopsis.logline && !synopsis.synopsis) {
    errors.push("At least logline or synopsis is required");
  }

  if (synopsis.characters) {
    for (const char of synopsis.characters) {
      if (!char.name) errors.push("Character name is required");
      if (!char.role) errors.push("Character role is required");
    }
  }

  return errors;
}

export function validateFallbackRenderPlan(plan: FallbackRenderPlan): string[] {
  const errors: string[] = [];

  if (!plan.slides || plan.slides.length === 0) {
    errors.push("At least one slide is required");
  }

  if (plan.slides) {
    for (const slide of plan.slides) {
      if (slide.duration_sec <= 0) {
        errors.push(`Slide ${slide.slide_index}: duration must be positive`);
      }
      if (!slide.image_path && !slide.text) {
        errors.push(`Slide ${slide.slide_index}: needs image_path or text`);
      }
    }
  }

  return errors;
}
