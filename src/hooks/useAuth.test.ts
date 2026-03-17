import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyAuthError, type AuthErrorKind } from "./useAuth";

// Mock the Supabase client config status
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {},
  getSupabaseConfigStatus: vi.fn(),
}));

import { getSupabaseConfigStatus } from "@/integrations/supabase/client";
const mockConfigStatus = vi.mocked(getSupabaseConfigStatus);

function configuredStatus() {
  return {
    configured: true,
    hasUrl: true,
    hasKey: true,
    urlValid: true,
    diagnosticMessage: "Supabase configuration OK",
  };
}

function misconfiguredStatus(msg = "VITE_SUPABASE_URL is missing") {
  return {
    configured: false,
    hasUrl: false,
    hasKey: true,
    urlValid: false,
    diagnosticMessage: msg,
  };
}

describe("classifyAuthError", () => {
  beforeEach(() => {
    mockConfigStatus.mockReturnValue(configuredStatus());
  });

  it("classifies invalid credentials", () => {
    const result = classifyAuthError(new Error("Invalid login credentials"));
    expect(result.kind).toBe("invalid_credentials" satisfies AuthErrorKind);
  });

  it("classifies email not confirmed", () => {
    const result = classifyAuthError(new Error("Email not confirmed"));
    expect(result.kind).toBe("email_not_confirmed" satisfies AuthErrorKind);
  });

  it("classifies too many requests", () => {
    const result = classifyAuthError(new Error("Too many requests"));
    expect(result.kind).toBe("too_many_requests" satisfies AuthErrorKind);
  });

  it("classifies rate limit variant", () => {
    const result = classifyAuthError(new Error("rate limit exceeded"));
    expect(result.kind).toBe("too_many_requests" satisfies AuthErrorKind);
  });

  it("classifies fetch failure as service_unreachable when config is OK", () => {
    mockConfigStatus.mockReturnValue(configuredStatus());
    const result = classifyAuthError(new TypeError("Failed to fetch"));
    expect(result.kind).toBe("service_unreachable" satisfies AuthErrorKind);
  });

  it("classifies fetch failure as config_error when config is bad", () => {
    mockConfigStatus.mockReturnValue(misconfiguredStatus());
    const result = classifyAuthError(new TypeError("Failed to fetch"));
    expect(result.kind).toBe("config_error" satisfies AuthErrorKind);
  });

  it("classifies NetworkError as service_unreachable when config is OK", () => {
    mockConfigStatus.mockReturnValue(configuredStatus());
    const result = classifyAuthError(new Error("NetworkError when attempting to fetch"));
    expect(result.kind).toBe("service_unreachable" satisfies AuthErrorKind);
  });

  it("classifies NetworkError as config_error when config is bad", () => {
    mockConfigStatus.mockReturnValue(misconfiguredStatus());
    const result = classifyAuthError(new Error("NetworkError when attempting to fetch"));
    expect(result.kind).toBe("config_error" satisfies AuthErrorKind);
  });

  it("classifies Safari Load failed as network-related", () => {
    mockConfigStatus.mockReturnValue(configuredStatus());
    const result = classifyAuthError(new TypeError("Load failed"));
    expect(result.kind).toBe("service_unreachable" satisfies AuthErrorKind);
  });

  it("classifies TypeError with bad config as config_error", () => {
    mockConfigStatus.mockReturnValue(misconfiguredStatus("VITE_SUPABASE_URL does not look like a valid Supabase URL"));
    const result = classifyAuthError(new TypeError("Invalid URL"));
    expect(result.kind).toBe("config_error" satisfies AuthErrorKind);
  });

  it("classifies unknown errors as unexpected", () => {
    const result = classifyAuthError(new Error("something completely unknown"));
    expect(result.kind).toBe("unexpected" satisfies AuthErrorKind);
  });

  it("handles non-Error objects", () => {
    const result = classifyAuthError({ message: "Invalid login credentials" });
    expect(result.kind).toBe("invalid_credentials" satisfies AuthErrorKind);
  });

  it("handles string errors", () => {
    const result = classifyAuthError("some random error string");
    expect(result.kind).toBe("unexpected" satisfies AuthErrorKind);
  });

  it("never exposes raw error message in classified output for config errors", () => {
    mockConfigStatus.mockReturnValue(misconfiguredStatus("VITE_SUPABASE_URL is missing"));
    const result = classifyAuthError(new TypeError("Failed to fetch"));
    expect(result.kind).toBe("config_error");
    // The message should be the diagnostic, not the raw fetch error
    expect(result.message).toContain("VITE_SUPABASE_URL");
    expect(result.message).not.toContain("password");
  });
});
