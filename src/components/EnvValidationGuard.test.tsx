import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnvValidationGuard } from "./EnvValidationGuard";

vi.mock("@/integrations/supabase/client", () => ({
  getSupabaseConfigStatus: vi.fn(),
  supabase: {},
}));

import { getSupabaseConfigStatus } from "@/integrations/supabase/client";
const mockGetStatus = vi.mocked(getSupabaseConfigStatus);

describe("EnvValidationGuard", () => {
  it("renders children when env is valid", () => {
    mockGetStatus.mockReturnValue({
      configured: true,
      hasUrl: true,
      hasKey: true,
      urlValid: true,
      diagnosticMessage: "",
    });

    render(
      <EnvValidationGuard>
        <div data-testid="app">App Content</div>
      </EnvValidationGuard>
    );

    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("shows error screen when env is invalid", () => {
    mockGetStatus.mockReturnValue({
      configured: false,
      hasUrl: false,
      hasKey: true,
      urlValid: false,
      diagnosticMessage: "",
    });

    render(
      <EnvValidationGuard>
        <div data-testid="app">App Content</div>
      </EnvValidationGuard>
    );

    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    expect(screen.getByText("Configuration Error")).toBeInTheDocument();
    expect(screen.getAllByText(/VITE_SUPABASE_URL/).length).toBeGreaterThan(0);
  });

  it("shows warnings when present", () => {
    mockGetStatus.mockReturnValue({
      configured: false,
      hasUrl: true,
      hasKey: false,
      urlValid: false,
      diagnosticMessage: "URL format invalid — expected https://<ref>.supabase.co",
    });

    render(
      <EnvValidationGuard>
        <div>App</div>
      </EnvValidationGuard>
    );

    expect(screen.getByText(/URL format invalid/)).toBeInTheDocument();
  });
});
