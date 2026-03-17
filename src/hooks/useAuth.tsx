import { useState, useEffect, createContext, useContext, useRef, ReactNode } from "react";
import { supabase, getSupabaseConfigStatus } from "@/integrations/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Auth error classification — allows the UI to show the RIGHT message
// ---------------------------------------------------------------------------
export type AuthErrorKind =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "too_many_requests"
  | "config_error"
  | "service_unreachable"
  | "unexpected";

export interface ClassifiedAuthError {
  kind: AuthErrorKind;
  message: string;
  /** Raw error for logging — never display to user */
  raw?: unknown;
}

/** Classify an error returned/thrown by a Supabase auth call. */
export function classifyAuthError(err: unknown): ClassifiedAuthError {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);

  // Supabase AuthApiError — server responded with an error
  if (msg.includes("Invalid login credentials")) {
    return { kind: "invalid_credentials", message: msg, raw: err };
  }
  if (msg.includes("Email not confirmed")) {
    return { kind: "email_not_confirmed", message: msg, raw: err };
  }
  if (msg.includes("Too many requests") || msg.includes("rate limit")) {
    return { kind: "too_many_requests", message: msg, raw: err };
  }

  // Fetch / network failures — request never reached the server
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||        // Safari
    msg.includes("network request failed") // React Native
  ) {
    // Distinguish: is it because the config is bad, or a real network problem?
    const config = getSupabaseConfigStatus();
    if (!config.configured) {
      return {
        kind: "config_error",
        message: config.diagnosticMessage,
        raw: err,
      };
    }
    return { kind: "service_unreachable", message: msg, raw: err };
  }

  // TypeError before fetch (e.g. invalid URL constructed)
  if (err instanceof TypeError) {
    const config = getSupabaseConfigStatus();
    if (!config.configured) {
      return {
        kind: "config_error",
        message: config.diagnosticMessage,
        raw: err,
      };
    }
  }

  return { kind: "unexpected", message: msg, raw: err };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, fieldOfStudy?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: ClassifiedAuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Subscribe to auth changes first — this handles token refreshes
    // and subsequent login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Get initial session only once to avoid race condition
    // The onAuthStateChange listener will handle it after this
    if (!initializedRef.current) {
      initializedRef.current = true;
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error("Failed to restore session:", error.message);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string, fieldOfStudy?: string) => {
    try {
      const metadata: Record<string, string> = { display_name: displayName };
      if (fieldOfStudy) metadata.field_of_study = fieldOfStudy;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: window.location.origin,
        },
      });
      return { error: error as Error | null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<{ error: ClassifiedAuthError | null }> => {
    // Pre-flight: abort early if Supabase is not configured
    const config = getSupabaseConfigStatus();
    if (!config.configured) {
      console.error(
        "[COGNITIO] signIn aborted — Supabase not configured:",
        config.diagnosticMessage,
      );
      return {
        error: {
          kind: "config_error",
          message: config.diagnosticMessage,
        },
      };
    }

    try {
      console.info("[COGNITIO] signIn — calling signInWithPassword");
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn("[COGNITIO] signIn — auth error:", error.message);
        return { error: classifyAuthError(error) };
      }

      console.info("[COGNITIO] signIn — success");
      return { error: null };
    } catch (err: unknown) {
      console.error("[COGNITIO] signIn — unexpected throw:", err);
      return { error: classifyAuthError(err) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error as Error | null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error as Error | null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
