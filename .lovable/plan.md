

The user wants me to keep cadrer/améliorer the platform with systems-architecture + governance lens. The previous waves covered: rate-limit + circuit breaker, observability dashboard, alerting/cron, RLS hardening, PWA, RGPD export, QuotaIndicator, webhooks config.

Let me think about what's still genuinely missing at a systems-architecture & governance level — without re-doing what's done.

Real remaining gaps (architecture & governance):

1. **SLO / SLI definition + visibility** — no documented service objectives, no error-budget tracking. Governance needs measurable targets.
2. **Incident runbook + status page** — no `/status` public page showing provider health (circuit breakers exposed publicly = trust signal).
3. **Tenant cost ceiling (hard cap)** — quotas exist per-feature but no global monthly USD cap per user → financial blast-radius unbounded.
4. **Audit trail UI for end-users** — users can't see their own security events (logins, exports, deletions). RGPD transparency.
5. **Idempotency keys on mutating endpoints** — generate-music, export-user-data, etc. Double-clicks → duplicate cost events.
6. **Feature flags / kill-switches** — no way to disable a feature (e.g. Suno) without redeploy when circuit is degraded.
7. **Data retention policies** — `cost_events`, `security_audit_events`, `webhook_events` grow unbounded → no TTL job.
8. **DR / backup verification** — no documented RPO/RTO, no automated check that backups are restorable.

I'll group into a single coherent wave focused on governance maturity, picking the highest-leverage items that fit a single implementation pass. Skip what requires manual ops (DR, runbook docs are markdown-only).

Concrete plan: 5 high-leverage additions.

