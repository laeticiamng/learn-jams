// ============================================================
// Untyped Supabase client for tables not yet in generated types
// ============================================================
//
// Many domain tables (cognitio, billing, security, etc.) are not yet
// reflected in the auto-generated types.ts. This helper provides a
// pre-cast client so we don't sprinkle `(supabase as any)` everywhere.

import { supabase } from "./client";

/**
 * Use this client for tables that are NOT in the generated Database types.
 * e.g. source_documents, course_profiles, concepts, transformations, etc.
 *
 * Usage:
 *   import { db } from "@/integrations/supabase/untyped";
 *   const { data } = await db.from("source_documents").select("*").eq("id", id).single();
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
