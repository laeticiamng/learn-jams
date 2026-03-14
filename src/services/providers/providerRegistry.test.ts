// ============================================================
// Tests: Provider Registry
// ============================================================

import { describe, it, expect } from "vitest";
import {
  registerProvider,
  getProvider,
  hasProvider,
  getAllProviderKeys,
} from "./providerRegistry";
import type { LLMProvider, LLMResponse } from "@/domain/providers/providerInterfaces";

describe("providerRegistry", () => {
  const mockLLM: LLMProvider = {
    key: "test_llm",
    async generateText(prompt) {
      return { text: `Mock: ${prompt}`, usage: { input_tokens: 10, output_tokens: 5 } } as LLMResponse;
    },
    async generateStructured<T>(prompt: string) {
      return { result: prompt } as unknown as T;
    },
  };

  it("registers and retrieves a provider", () => {
    registerProvider(mockLLM);
    expect(hasProvider("test_llm")).toBe(true);
    expect(getProvider("test_llm")).toBe(mockLLM);
  });

  it("returns null for unknown provider", () => {
    expect(getProvider("nonexistent")).toBeNull();
    expect(hasProvider("nonexistent")).toBe(false);
  });

  it("lists all registered providers", () => {
    registerProvider(mockLLM);
    const keys = getAllProviderKeys();
    expect(keys).toContain("test_llm");
  });

  it("mock LLM generates text", async () => {
    registerProvider(mockLLM);
    const llm = getProvider<LLMProvider>("test_llm")!;
    const result = await llm.generateText("hello");
    expect(result.text).toBe("Mock: hello");
  });
});
