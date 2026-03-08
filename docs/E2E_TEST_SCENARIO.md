# E2E Test Scenario: Stripe → Premium → Generate Music → Library

## Prerequisites
- Test user with valid email
- Stripe test mode with test card `4242 4242 4242 4242`
- Suno API key configured (or demo mode for non-audio tests)

---

## Scenario 1: Subscription Checkout → Premium Status

1. **Login** with test user credentials
2. **Navigate** to `/pricing`
3. **Click** "Subscribe" on the desired plan
4. **Complete** Stripe Checkout with test card
5. **Verify**: Stripe fires `checkout.session.completed` webhook
6. **Verify**: `subscriptions` table has new row with:
   - `user_id` = test user's ID
   - `status` = "active"
   - `stripe_subscription_id` is set
   - `current_period_end` > now()
7. **Verify**: `check-subscription` edge function returns `{ subscribed: true }`
8. **Verify**: UI shows premium badge / unlocked features

---

## Scenario 2: Generate Music with Ownership Check

1. **Login** as User A
2. **Navigate** to `/create`
3. **Upload** a document or enter text
4. **Start** generation → song row created with `user_id = User A`
5. **Verify**: `generate-music` logs show `ownership_check` passed
6. **Verify**: Song status progresses: `pending` → `generating` → `ready`
7. **Verify**: Song appears in User A's `/library`

### Negative Test: Cross-user access
8. **Login** as User B
9. **Call** `generate-music` with User A's `songId`
10. **Verify**: Returns 403 Unauthorized
11. **Verify**: Logs show `ownership_check_failed`

---

## Scenario 3: Webhook Idempotence

1. **Send** the same Stripe webhook event twice (same `event.id`)
2. **Verify**: Subscription table is updated correctly (no duplicates)
3. **Verify**: Logs show both events processed without error

---

## Scenario 4: Subscription Cancellation

1. **Cancel** subscription via Stripe Customer Portal
2. **Verify**: Webhook `customer.subscription.deleted` fires
3. **Verify**: `subscriptions.status` updated to "canceled"
4. **Verify**: `check-subscription` returns `{ subscribed: false }`
5. **Verify**: UI reflects free tier

---

## Scenario 5: Payment Failed

1. **Update** test subscription to use declining card `4000 0000 0000 0341`
2. **Wait** for invoice retry
3. **Verify**: Webhook `invoice.payment_failed` fires
4. **Verify**: `subscriptions.status` updated to "past_due"

---

## Log Verification Checklist

For each edge function invocation, verify logs contain:
- [ ] `fn` field (function name)
- [ ] `level` field (info/warn/error)
- [ ] `step` field (structured step name)
- [ ] `ts` field (ISO timestamp)
- [ ] `user_id` or `song_id` where applicable
- [ ] `event_id` for Stripe webhook events
- [ ] No secrets, tokens, or API keys in log output
