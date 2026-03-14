import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnvValidationGuard } from "./EnvValidationGuard";

vi.mock("@/security/env", () => ({
  validateClientEnv: vi.fn(),
}));

import { validateClientEnv } from "@/security/env";
const mockValidate = vi.mocked(validateClientEnv);

describe("EnvValidationGuard", () => {
  it("renders children when env is valid", () => {
    mockValidate.mockReturnValue({ valid: true, missing: [], warnings: [] });

    render(
      <EnvValidationGuard>
        <div data-testid="app">App Content</div>
      </EnvValidationGuard>
    );

    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("shows error screen when env is invalid", () => {
    mockValidate.mockReturnValue({
      valid: false,
      missing: ["VITE_SUPABASE_URL (Supabase project URL)"],
      warnings: [],
    });

    render(
      <EnvValidationGuard>
        <div data-testid="app">App Content</div>
      </EnvValidationGuard>
    );

    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    expect(screen.getByText("Configuration Error")).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument();
  });

  it("shows warnings when present", () => {
    mockValidate.mockReturnValue({
      valid: false,
      missing: ["VITE_SUPABASE_URL (Supabase project URL)"],
      warnings: ["SOME_OPTIONAL_KEY not set (optional: description)"],
    });

    render(
      <EnvValidationGuard>
        <div>App</div>
      </EnvValidationGuard>
    );

    expect(screen.getByText(/SOME_OPTIONAL_KEY/)).toBeInTheDocument();
  });
});
