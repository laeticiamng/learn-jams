import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all service hooks before importing
vi.mock("@/hooks/useDocumentIngestion", () => ({
  useDocumentIngestion: () => ({
    steps: [],
    isRunning: false,
    error: null,
    result: null,
    ingest: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCourseAnalysis", () => ({
  useCourseAnalysis: () => ({
    steps: [],
    isRunning: false,
    error: null,
    result: null,
    analyze: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMemoryArchitecture", () => ({
  useMemoryArchitecture: () => ({
    steps: [],
    isRunning: false,
    error: null,
    result: null,
    build: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useFormatDecision", () => ({
  useFormatDecision: () => ({
    steps: [],
    isRunning: false,
    error: null,
    result: null,
    decide: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useDynamicSheetGeneration", () => ({
  useDynamicSheetGeneration: () => ({
    steps: [],
    isRunning: false,
    error: null,
    result: null,
    generate: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAnimatedStoryGeneration", () => ({
  useAnimatedStoryGeneration: () => ({
    steps: [],
    isRunning: false,
    error: null,
    result: null,
    generate: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQAStatus", () => ({
  useQAStatus: () => ({
    isRunning: false,
    error: null,
    qaReport: null,
    publishDecision: null,
    runQA: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProductTracking", () => ({
  useProductTracking: () => ({
    track: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "test@example.com" },
    session: { user: { id: "test-user-id" } },
    loading: false,
  }),
}));

vi.mock("@/services/cognitio/recall-generator.service", () => ({
  generateRecallSuiteLocally: vi.fn(() => ({
    final_test: { questions: [] },
  })),
}));

import { renderHook, act } from "@testing-library/react";
import { useCreatePipeline } from "./useCreatePipeline";

describe("useCreatePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in import phase", () => {
    const { result } = renderHook(() => useCreatePipeline());
    expect(result.current.phase).toBe("import");
    expect(result.current.anyError).toBeFalsy();
    expect(result.current.hasBlocking).toBe(false);
  });

  it("resets all hooks and returns to import phase", () => {
    const { result } = renderHook(() => useCreatePipeline());

    act(() => {
      result.current.reset();
    });

    expect(result.current.phase).toBe("import");
    expect(result.current.pipelineError).toBeNull();
  });

  it("aggregates steps from all sub-hooks", () => {
    const { result } = renderHook(() => useCreatePipeline());
    // In import phase, allSteps should include at least ingestion steps
    expect(Array.isArray(result.current.allSteps)).toBe(true);
  });

  it("exposes sub-hook results for display", () => {
    const { result } = renderHook(() => useCreatePipeline());
    expect(result.current.ingestion).toBeDefined();
    expect(result.current.analysis).toBeDefined();
    expect(result.current.memory).toBeDefined();
    expect(result.current.format).toBeDefined();
    expect(result.current.generation).toBeDefined();
    expect(result.current.storyGeneration).toBeDefined();
    expect(result.current.qa).toBeDefined();
  });
});
