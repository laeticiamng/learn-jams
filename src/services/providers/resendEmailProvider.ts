// ============================================================
// Resend Email Provider
// ============================================================

import type { EmailProvider, EmailInput, EmailResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const resendEmailProvider: EmailProvider = {
  key: "resend",

  async sendEmail(input) {
    const { data, error } = await supabase.functions.invoke("provider-resend-email", {
      body: input,
    });
    if (error) throw new Error(`Resend email failed: ${error.message}`);
    return data as EmailResult;
  },
};
