// ============================================================
// Product Domain Validators
// ============================================================

import { PRODUCT_EVENTS, type ProductEventName, type TrackEventInput } from "./events.types";
import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from "./featureFlags.types";

export function isValidEventName(name: string): name is ProductEventName {
  return (PRODUCT_EVENTS as readonly string[]).includes(name);
}

export function validateTrackEventInput(input: TrackEventInput): string[] {
  const errors: string[] = [];
  if (!input.event_name) errors.push("event_name is required");
  if (!isValidEventName(input.event_name)) errors.push(`Unknown event: ${input.event_name}`);
  return errors;
}

export function isValidFeatureFlagKey(key: string): key is FeatureFlagKey {
  return (FEATURE_FLAG_KEYS as readonly string[]).includes(key);
}

export function validateSeedTransformation(data: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!data.title || typeof data.title !== "string") errors.push("title is required");
  if (!data.subject || typeof data.subject !== "string") errors.push("subject is required");
  if (!data.audience_level || typeof data.audience_level !== "string") errors.push("audience_level is required");
  if (!data.format || typeof data.format !== "string") errors.push("format is required");
  if (!data.transformation_json || typeof data.transformation_json !== "object") errors.push("transformation_json is required");
  if (!data.recall_tests_json || typeof data.recall_tests_json !== "object") errors.push("recall_tests_json is required");
  return errors;
}

export interface MvpReadinessReport {
  core_loop_ok: boolean;
  seed_library_ok: boolean;
  qa_blocking_ok: boolean;
  tracking_ok: boolean;
  experiments_ready: boolean;
  latency_ok: boolean;
  cost_ok: boolean;
  critical_risks: string[];
}

export function computeReadinessReport(checks: {
  coreLoopErrors: number;
  seedCount: number;
  qaBlockRate: number;
  eventsCount: number;
  experimentsConfigured: boolean;
  avgLatencyMs: number;
  avgCostPerSession: number;
}): MvpReadinessReport {
  const risks: string[] = [];

  const coreOk = checks.coreLoopErrors === 0;
  if (!coreOk) risks.push(`${checks.coreLoopErrors} erreur(s) dans la boucle principale`);

  const seedOk = checks.seedCount >= 3;
  if (!seedOk) risks.push(`Seulement ${checks.seedCount} seed(s) — minimum 3 recommandé`);

  const qaOk = checks.qaBlockRate < 0.2;
  if (!qaOk) risks.push(`Taux QA block élevé : ${(checks.qaBlockRate * 100).toFixed(0)}%`);

  const trackingOk = checks.eventsCount > 0;
  if (!trackingOk) risks.push("Aucun événement enregistré");

  const latencyOk = checks.avgLatencyMs < 30000;
  if (!latencyOk) risks.push(`Latence moyenne élevée : ${Math.round(checks.avgLatencyMs / 1000)}s`);

  const costOk = checks.avgCostPerSession < 1.0;
  if (!costOk) risks.push(`Coût moyen par session élevé : ${checks.avgCostPerSession.toFixed(2)}€`);

  return {
    core_loop_ok: coreOk,
    seed_library_ok: seedOk,
    qa_blocking_ok: qaOk,
    tracking_ok: trackingOk,
    experiments_ready: checks.experimentsConfigured,
    latency_ok: latencyOk,
    cost_ok: costOk,
    critical_risks: risks,
  };
}
