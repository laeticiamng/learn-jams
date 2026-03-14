// ============================================================
// Twilio SMS Provider
// ============================================================

import type { SMSProvider, SMSInput, SMSResult } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const twilioSmsProvider: SMSProvider = {
  key: "twilio",

  async sendSMS(input) {
    const { data, error } = await supabase.functions.invoke("provider-twilio-sms", {
      body: input,
    });
    if (error) throw new Error(`Twilio SMS failed: ${error.message}`);
    return data as SMSResult;
  },
};
