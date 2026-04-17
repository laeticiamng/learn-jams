# Incident Runbook — Cognitio

Operational guide for on-call response. Pair with `/admin/observability`, `/admin/incidents`, and `/status`.

## Severity matrix

| Severity   | Trigger                                                                                  | Response time | Comms                         |
| ---------- | ---------------------------------------------------------------------------------------- | ------------- | ----------------------------- |
| `critical` | Auth down, DB unreachable, payment broken, data leak, > 5 % users impacted               | < 15 min      | Public incident + email Pro   |
| `major`    | One provider open (Suno/OpenAI), SLO breached, cost cap reached for many users           | < 1 h         | Public incident, no email     |
| `minor`    | Provider degraded (half-open), single-user errors, slow latency                          | Same day      | Internal note only            |

## Detection sources

1. `/admin/observability` — alerts open (auto-created by `triggerAlert`)
2. `/admin/observability` → SLO tab — error budget < 0
3. `/status` — providers in `degraded` / `outage`
4. Cost anomaly: `detect_cost_anomalies()` cron at 03:30 UTC

## Standard response loop

1. **Acknowledge** the alert in `/admin/observability` → Alertes → "Acquitter".
2. **Open an incident** in `/admin/incidents`:
   - Title: short, user-facing ("Génération musicale ralentie")
   - Severity: see matrix
   - Affected components: `suno`, `openai`, `auth`, `db`, `stripe`, `email`...
3. **Investigate** — check Edge Function logs, `provider_health`, `cost_events`, recent migrations.
4. **Post updates** every 30 min minimum until `monitoring`.
5. **Resolve** — set status to `resolved`, post a final root-cause + prevention note.
6. **Post-mortem** — within 5 working days for `critical` / `major`.

## Provider-specific playbooks

### Suno open circuit
- Confirm with `select * from provider_health where provider_key='suno'`.
- Check Suno status page + recent callbacks (`webhook-suno` logs).
- Mitigation: kill-switch via feature flag `enable_music_generation` (`/admin/observability` → Feature flags) → set `enabled=false` to display a maintenance message.
- Recovery: circuit auto-transitions to `half_open` after `cooldown_seconds`. First success closes it.

### OpenAI / Lovable AI Gateway down
- Affects: `extract-document`, `generate-quiz`, `cognitio-analyze`, `cognitio-generate-puzzles`.
- Local fallback (puzzles) auto-engages — verify `mission_runs.fallback_mode = 'local'`.
- Otherwise notify Pro users via banner (toggle a feature flag with `message`).

### Stripe webhook backlog
- Check `webhook_events` table for `status = 'failed'`.
- Re-trigger via Stripe dashboard → Developers → Events → Resend.
- If signature mismatch: rotate `STRIPE_WEBHOOK_SECRET`.

### Cost anomaly (single user)
- Inspect `/admin/observability` → Top coûts (24 h).
- Lower their `user_cost_caps.monthly_cap_usd` to halt further spend.
- Contact user if Pro; auto-block via cap is sufficient for free.

## Escalation contacts

| Role             | Channel               |
| ---------------- | --------------------- |
| On-call engineer | Pager / Slack #oncall |
| Product owner    | Slack #product        |
| Legal (RGPD)     | legal@emotionscare.fr |

## After every incident

- Update `feature_flags.metadata_json` with the workaround used.
- Add a regression test to the affected edge function.
- If a new failure mode → extend `triggerAlert()` rules.
