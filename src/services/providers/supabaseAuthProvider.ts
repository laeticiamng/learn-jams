// ============================================================
// Supabase Auth Provider
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { AuthProvider } from "@/domain/providers/providerInterfaces";

export const supabaseAuthProvider: AuthProvider = {
  key: "supabase_auth",

  async signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw new Error(`Auth signUp failed: ${error.message}`);
    return { userId: data.user!.id };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Auth signIn failed: ${error.message}`);
    return { userId: data.user.id, token: data.session.access_token };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Auth signOut failed: ${error.message}`);
  },

  async getUser(token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id, email: data.user.email ?? "" };
  },
};
