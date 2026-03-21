/**
 * Route / page smoke tests
 * Verify that every public page renders without crashing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: null, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

// Auth hook – always unauthenticated for public route tests
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    updatePassword: vi.fn().mockResolvedValue({ error: null }),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useProductTracking (used by Index)
vi.mock("@/hooks/useProductTracking", () => ({
  useProductTracking: () => ({ track: vi.fn() }),
}));

// Mock useNotifications (used by Navbar > NotificationBell)
vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

// Mock useAccessibility (used by AccessibilityPanel in Navbar)
vi.mock("@/hooks/useAccessibility", () => ({
  useAccessibility: () => ({
    settings: {
      dyslexiaFont: false,
      adhdMode: false,
      colorblindSafe: false,
      fontSize: 1,
      highContrast: false,
    },
    update: vi.fn(),
    reset: vi.fn(),
  }),
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock image / asset imports so Vitest doesn't choke on binary files
vi.mock("@/assets/founder-laeticia.png", () => ({ default: "founder.png" }));

// Mock IntersectionObserver (used by framer-motion / useInView)
const IntersectionObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn().mockReturnValue([]),
}));
vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

// Mock ResizeObserver
const ResizeObserverMock = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// Mock scrollTo
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// ---------------------------------------------------------------------------
// Page imports (direct, not lazy)
// ---------------------------------------------------------------------------
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import About from "@/pages/About";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";
import NotFound from "@/pages/NotFound";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function renderPage(ui: React.ReactElement, { route = "/" } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Route smoke tests — public pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("/ (Index) renders without crashing", async () => {
    renderPage(<Index />);
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/login renders without crashing", async () => {
    renderPage(<Login />, { route: "/login" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/signup renders without crashing", async () => {
    renderPage(<Signup />, { route: "/signup" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/forgot-password renders without crashing", async () => {
    renderPage(<ForgotPassword />, { route: "/forgot-password" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/reset-password renders without crashing", async () => {
    renderPage(<ResetPassword />, { route: "/reset-password" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/terms renders without crashing", async () => {
    renderPage(<Terms />, { route: "/terms" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/privacy renders without crashing", async () => {
    renderPage(<Privacy />, { route: "/privacy" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/about renders without crashing", async () => {
    renderPage(<About />, { route: "/about" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/pricing renders without crashing", async () => {
    renderPage(<Pricing />, { route: "/pricing" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/contact renders without crashing", async () => {
    renderPage(<Contact />, { route: "/contact" });
    await waitFor(() => {
      expect(document.body.textContent!.length).toBeGreaterThan(0);
    });
  });

  it("/not-found-page renders the 404 page", async () => {
    renderPage(<NotFound />, { route: "/not-found-page" });
    await waitFor(() => {
      expect(screen.getByText("404")).toBeInTheDocument();
    });
  });
});
