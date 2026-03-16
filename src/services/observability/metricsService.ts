// ============================================================
// Observability Metrics Service
// Collects pipeline execution metrics, error rates, latencies,
// and quality scores for monitoring and alerting.
// ============================================================

// ---------- Metric Types ----------

export type MetricName =
  | "pipeline.started"
  | "pipeline.completed"
  | "pipeline.failed"
  | "pipeline.duration_ms"
  | "m1.ingestion_duration_ms"
  | "m1.word_count"
  | "m1.confidence"
  | "m1.segments_count"
  | "m2.analysis_duration_ms"
  | "m2.concepts_raw"
  | "m2.concepts_filtered"
  | "m2.concepts_rejected"
  | "m2.front_matter_detected"
  | "m2.body_pass_triggered"
  | "m2.llm_fallback_triggered"
  | "m2.semantic_gate_passed"
  | "m2.semantic_gate_failed"
  // Second-pass observability (Ticket 4)
  | "m2.second_pass_evaluated"
  | "m2.second_pass_triggered"
  | "m2.second_pass_skipped"
  | "m2.second_pass_completed"
  | "m2.second_pass_failed"
  | "m2.second_pass_duration_ms"
  | "m2.gate_evaluated"
  | "m2.gate_passed"
  | "m2.gate_failed"
  | "m3.memory_duration_ms"
  | "m3.segments_generated"
  | "m4.format_decision"
  | "m5.generation_duration_ms"
  | "m5.generation_success"
  | "m5.generation_failed"
  | "m5.empty_generation"
  | "quota.check_passed"
  | "quota.check_blocked"
  | "quota.source_used"
  | "error.ingestion"
  | "error.analysis"
  | "error.memory"
  | "error.format"
  | "error.generation";

export interface MetricEvent {
  name: MetricName;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

export interface MetricsSummary {
  total_events: number;
  events_by_name: Record<string, number>;
  errors: number;
  avg_pipeline_duration_ms: number | null;
  avg_concepts_extracted: number | null;
  gate_pass_rate: number | null;
  generation_success_rate: number | null;
}

// ---------- In-Memory Metrics Collector ----------

class MetricsCollector {
  private events: MetricEvent[] = [];
  private readonly MAX_EVENTS = 1000;

  /**
   * Record a metric event.
   */
  record(name: MetricName, value: number = 1, tags: Record<string, string> = {}): void {
    this.events.push({
      name,
      value,
      tags,
      timestamp: Date.now(),
    });

    // Evict oldest events if over limit
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Log in dev mode
    if (import.meta.env.DEV) {
      console.debug(`[METRICS] ${name}=${value}`, tags);
    }
  }

  /**
   * Record pipeline start.
   */
  startPipeline(format: string): PipelineTimer {
    this.record("pipeline.started", 1, { format });
    return new PipelineTimer(this, format);
  }

  /**
   * Get summary of collected metrics.
   */
  getSummary(since_ms?: number): MetricsSummary {
    const cutoff = since_ms ? Date.now() - since_ms : 0;
    const relevant = this.events.filter(e => e.timestamp >= cutoff);

    const byName: Record<string, number> = {};
    for (const e of relevant) {
      byName[e.name] = (byName[e.name] ?? 0) + 1;
    }

    const errors = relevant.filter(e => e.name.startsWith("error.")).length;

    const durations = relevant
      .filter(e => e.name === "pipeline.duration_ms")
      .map(e => e.value);
    const avgDuration = durations.length > 0
      ? durations.reduce((s, v) => s + v, 0) / durations.length
      : null;

    const concepts = relevant
      .filter(e => e.name === "m2.concepts_filtered")
      .map(e => e.value);
    const avgConcepts = concepts.length > 0
      ? concepts.reduce((s, v) => s + v, 0) / concepts.length
      : null;

    const gatePassed = byName["m2.semantic_gate_passed"] ?? 0;
    const gateFailed = byName["m2.semantic_gate_failed"] ?? 0;
    const gateTotal = gatePassed + gateFailed;
    const gatePassRate = gateTotal > 0 ? gatePassed / gateTotal : null;

    const genSuccess = byName["m5.generation_success"] ?? 0;
    const genFailed = byName["m5.generation_failed"] ?? 0;
    const genTotal = genSuccess + genFailed;
    const genSuccessRate = genTotal > 0 ? genSuccess / genTotal : null;

    return {
      total_events: relevant.length,
      events_by_name: byName,
      errors,
      avg_pipeline_duration_ms: avgDuration,
      avg_concepts_extracted: avgConcepts,
      gate_pass_rate: gatePassRate,
      generation_success_rate: genSuccessRate,
    };
  }

  /**
   * Get recent events (for dev tools).
   */
  getRecentEvents(limit: number = 50): MetricEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all events.
   */
  clear(): void {
    this.events = [];
  }
}

// ---------- Pipeline Timer ----------

export class PipelineTimer {
  private startTime: number;
  private stepStart: number;

  constructor(
    private collector: MetricsCollector,
    private format: string,
  ) {
    this.startTime = Date.now();
    this.stepStart = this.startTime;
  }

  /** Mark a step as completed and record its duration. */
  stepCompleted(step: MetricName, tags: Record<string, string> = {}): void {
    const duration = Date.now() - this.stepStart;
    this.collector.record(step, duration, { format: this.format, ...tags });
    this.stepStart = Date.now();
  }

  /** Mark pipeline as completed. */
  completed(tags: Record<string, string> = {}): void {
    const totalDuration = Date.now() - this.startTime;
    this.collector.record("pipeline.duration_ms", totalDuration, { format: this.format, ...tags });
    this.collector.record("pipeline.completed", 1, { format: this.format, ...tags });
  }

  /** Mark pipeline as failed. */
  failed(error: string, step: string): void {
    const totalDuration = Date.now() - this.startTime;
    this.collector.record("pipeline.duration_ms", totalDuration, { format: this.format, error_step: step });
    this.collector.record("pipeline.failed", 1, { format: this.format, error_step: step, error });
  }
}

// ---------- Singleton ----------

export const metrics = new MetricsCollector();

// ---------- Second-Pass Instrumentation Helpers (Ticket 4) ----------

/** Structured metadata for second-pass trigger evaluation */
export interface SecondPassEvalMetadata {
  document_type?: string;
  analysis_mode: "full" | "body_only" | "quick";
  trigger_reason: string;
  triggered: boolean;
  valid_body_concepts_count?: number;
  valid_concepts_count?: number;
  editorial_body_concepts_count?: number;
  segments_count?: number;
  artifact_ratio?: number;
  front_matter_detected?: boolean;
}

/** Structured metadata for gate evaluation */
export interface GateEvalMetadata {
  analysis_mode: "full" | "body_only";
  threshold_profile: string;
  passed: boolean;
  gate_failure_reasons?: string[];
  valid_concepts_count?: number;
  body_concepts_count?: number;
  editorial_artifact_ratio?: number;
  main_topic_is_editorial_artifact?: boolean;
  duration_ms?: number;
}

/**
 * Record a second-pass trigger evaluation event.
 * Emits structured metadata without raw document content.
 */
export function recordSecondPassEvaluation(meta: SecondPassEvalMetadata): void {
  const metricName: MetricName = meta.triggered
    ? "m2.second_pass_triggered"
    : "m2.second_pass_skipped";

  metrics.record("m2.second_pass_evaluated", 1, {
    analysis_mode: meta.analysis_mode,
    trigger_reason: meta.trigger_reason,
    triggered: String(meta.triggered),
  });

  metrics.record(metricName, 1, {
    analysis_mode: meta.analysis_mode,
    trigger_reason: meta.trigger_reason,
    valid_body_concepts_count: String(meta.valid_body_concepts_count ?? 0),
    valid_concepts_count: String(meta.valid_concepts_count ?? 0),
    editorial_body_concepts_count: String(meta.editorial_body_concepts_count ?? 0),
    segments_count: String(meta.segments_count ?? 0),
    artifact_ratio: String(meta.artifact_ratio ?? 0),
    front_matter_detected: String(meta.front_matter_detected ?? false),
  });
}

/**
 * Record a second-pass completion event.
 */
export function recordSecondPassCompletion(success: boolean, durationMs: number, conceptsCount: number): void {
  const metricName: MetricName = success ? "m2.second_pass_completed" : "m2.second_pass_failed";
  metrics.record(metricName, 1, {
    concepts_count: String(conceptsCount),
  });
  metrics.record("m2.second_pass_duration_ms", durationMs, {
    success: String(success),
  });
}

/**
 * Record a gate evaluation event with structured failure reasons.
 */
export function recordGateEvaluation(meta: GateEvalMetadata): void {
  metrics.record("m2.gate_evaluated", 1, {
    analysis_mode: meta.analysis_mode,
    threshold_profile: meta.threshold_profile,
    passed: String(meta.passed),
  });

  const metricName: MetricName = meta.passed ? "m2.gate_passed" : "m2.gate_failed";
  metrics.record(metricName, 1, {
    analysis_mode: meta.analysis_mode,
    threshold_profile: meta.threshold_profile,
    valid_concepts_count: String(meta.valid_concepts_count ?? 0),
    body_concepts_count: String(meta.body_concepts_count ?? 0),
    editorial_artifact_ratio: String(meta.editorial_artifact_ratio ?? 0),
    main_topic_is_editorial_artifact: String(meta.main_topic_is_editorial_artifact ?? false),
    ...(meta.gate_failure_reasons && meta.gate_failure_reasons.length > 0
      ? { gate_failure_reasons: meta.gate_failure_reasons.join("|") }
      : {}),
  });
}
