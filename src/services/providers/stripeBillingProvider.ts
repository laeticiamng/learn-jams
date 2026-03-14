// ============================================================
// Stripe Billing Provider
// ============================================================

import type { BillingProvider, CheckoutInput, SubscriptionInfo } from "@/domain/providers/providerInterfaces";
import { supabase } from "@/integrations/supabase/client";

export const stripeBillingProvider: BillingProvider = {
  key: "stripe",

  async createCheckoutSession(input) {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: input,
    });
    if (error) throw new Error(`Stripe checkout failed: ${error.message}`);
    return { checkout_url: data.url, session_id: data.session_id };
  },

  async createPortalSession(customerId, returnUrl) {
    const { data, error } = await supabase.functions.invoke("customer-portal", {
      body: { customer_id: customerId, return_url: returnUrl },
    });
    if (error) throw new Error(`Stripe portal failed: ${error.message}`);
    return { portal_url: data.url };
  },

  async getSubscription(subscriptionId) {
    const { data, error } = await supabase.functions.invoke("check-subscription", {
      body: { subscription_id: subscriptionId },
    });
    if (error) throw new Error(`Stripe subscription check failed: ${error.message}`);
    return data as SubscriptionInfo;
  },

  async cancelSubscription(subscriptionId) {
    const { error } = await supabase.functions.invoke("cancel-subscription", {
      body: { subscription_id: subscriptionId },
    });
    if (error) throw new Error(`Stripe cancel failed: ${error.message}`);
  },
};
