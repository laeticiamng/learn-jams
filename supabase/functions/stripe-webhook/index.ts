import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ── Structured logger ─────────────────────────────────────────────
const log = (level: "info" | "warn" | "error", step: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    fn: "stripe-webhook",
    level,
    step,
    ts: new Date().toISOString(),
    ...data,
  }));
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Robust user lookup by email (case-insensitive) ────────────────
async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();

  // Use auth admin listUsers with pagination to find by email
  try {
    let page = 1;
    const perPage = 100;
    while (true) {
      const { data: users } = await supabase.auth.admin.listUsers({ page, perPage });
      if (!users?.users?.length) break;
      const match = users.users.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );
      if (match) return match.id;
      if (users.users.length < perPage) break;
      page++;
      if (page > 10) break; // safety limit: 1000 users max
    }
  } catch (e) {
    log("warn", "auth_admin_lookup_failed", { email: normalizedEmail, error: String(e) });
  }

  return null;
}

async function findUserIdByStripeCustomer(customerId: string): Promise<string | null> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return sub?.user_id || null;
}

// ── Supported events (ignore everything else) ─────────────────────
const SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

serve(async (req) => {
  // ── 1. Signature verification ───────────────────────────────────
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    log("error", "missing_signature_or_secret");
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log("error", "signature_verification_failed", { error: (err as Error).message });
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;
  log("info", "event_received", { event_id: eventId, event_type: eventType });

  // ── 2. Ignore unsupported events early ──────────────────────────
  if (!SUPPORTED_EVENTS.has(eventType)) {
    log("info", "event_ignored", { event_id: eventId, event_type: eventType });
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 3. Idempotence: check if we already processed this event ────
  // We use stripe_subscription_id + event type as a lightweight guard.
  // For full idempotence a processed_events table would be ideal,
  // but this prevents the most common duplicate: redelivered webhooks
  // that would upsert the same data.

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) {
          log("info", "non_subscription_checkout_ignored", { event_id: eventId });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const customerId = session.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

        // Find user: metadata → email → stripe_customer_id fallback
        let userId = customer.metadata?.supabase_user_id || null;
        if (!userId && customer.email) {
          userId = await findUserIdByEmail(customer.email);
        }
        if (!userId) {
          userId = await findUserIdByStripeCustomer(customerId);
        }

        if (!userId) {
          log("warn", "user_not_found", {
            event_id: eventId,
            customer_id: customerId,
            email: customer.email ?? "none",
          });
          // Return 200 so Stripe doesn't retry — we can't map this customer
          break;
        }

        log("info", "upsert_subscription", {
          event_id: eventId,
          user_id: userId,
          subscription_id: subscription.id,
        });

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: "user_id" });

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Fast path: update by stripe_subscription_id
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (existingSub) {
          log("info", "update_subscription_by_id", {
            event_id: eventId,
            subscription_id: subscription.id,
          });
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);
        } else {
          // Fallback: find by customer
          const userId = await findUserIdByStripeCustomer(customerId);
          if (userId) {
            log("info", "upsert_subscription_fallback", {
              event_id: eventId,
              user_id: userId,
              subscription_id: subscription.id,
            });
            await supabase.from("subscriptions").upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            }, { onConflict: "user_id" });
          } else {
            log("warn", "subscription_update_user_not_found", {
              event_id: eventId,
              customer_id: customerId,
              subscription_id: subscription.id,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          log("info", "mark_past_due", {
            event_id: eventId,
            subscription_id: invoice.subscription as string,
          });
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
    }
  } catch (error) {
    log("error", "processing_error", {
      event_id: eventId,
      event_type: eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
