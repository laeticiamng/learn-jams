

Looking at what's already done across waves 1-4: rate-limit, circuit breaker, observability, alerting/cron, RLS, PWA, RGPD export, QuotaIndicator, webhooks, cost cap, public status, audit log, feature flags, TTL retention.

From my original 8-gap list, what remains genuinely missing:
1. **Idempotency keys** on mutating endpoints (generate-music, export-user-data) — prevents duplicate cost events from double-clicks/retries
2. **SLO/SLI tracking + error budget** — measurable governance targets
3. **DR/backup verification** — automated check
4. **Incident runbook** — markdown only, low value alone

Best wave-5 focus: high-leverage technical hardening that closes real risks. Pick **idempotency** (financial safety, blocks double-billing) + **SLO tracker** (governance maturity, exposes error budget in admin) + **incident timeline** (links alerts → status → resolution).

Wave 5 — 3 chantiers ciblés.

# Plan — Vague 5 : Hardening transactionnel & SLO

## Constat
Les vagues 1-4 ont couvert résilience, observabilité, gouvernance financière, transparence. Restent 3 manques structurels :
- **Pas d'idempotency** sur les endpoints mutants → un double-clic ou un retry réseau génère 2 événements de coût
- **Pas de SLO/SLI mesurés** → la gouvernance n'a pas d'objectifs chiffrés ni d'error budget
- **Pas de timeline d'incident** → les alertes existent mais aucun fil chronologique consultable

## 3 chantiers

### 1. Idempotency keys (sécurité transactionnelle)
- Table `idempotency_keys` (key text PK, user_id, endpoint, response_json, status, expires_at 24h)
- Helper `_shared/idempotency.ts` : check key → return cached response OR proceed + store
- Intégration dans `generate-music`, `export-user-data`, `create-checkout`, `generate-quiz`, `extract-document`
- Header client `Idempotency-Key` (UUID auto-généré côté client)
- Hook `useIdempotentInvoke` qui ajoute le header automatiquement
- Cleanup auto via `cleanup_observability_tables` (déjà cron quotidien)

### 2. SLO/SLI tracker + error budget
- Table `slo_definitions` (key, target_pct, window_days, description) — seedée :
  - `music_generation_success` ≥ 95% sur 7j
  - `api_p95_latency_ms` ≤ 3000 sur 7j
  - `webhook_delivery_success` ≥ 99% sur 7j
- Table `slo_measurements` (slo_key, measured_at, value, met bool)
- RPC `compute_slo_status(slo_key)` agrège mesures + calcule error budget restant
- Composant admin `SLODashboard.tsx` dans `/admin/observability` : 3 cartes avec gauge (vert/ambre/rouge), error budget %, sparkline 7j
- Cron horaire `compute_slos_hourly` qui insère mesures depuis `cost_events`/`webhook_events`/edge logs

### 3. Timeline d'incidents
- Table `incidents` (id, title, severity, status [investigating/identified/monitoring/resolved], started_at, resolved_at, affected_components text[])
- Table `incident_updates` (incident_id, message, posted_at, status_at_post)
- Auto-création depuis `triggerAlert()` quand sévérité = critical (helper `_shared/incident.ts`)
- Section "Incidents en cours" sur `/status` (publique, 30 derniers jours)
- Page admin `/admin/incidents` : créer/updater/résoudre manuellement, lier à un alert_event

## Fichiers

**Migration SQL** : tables `idempotency_keys`, `slo_definitions`, `slo_measurements`, `incidents`, `incident_updates` + RPC `compute_slo_status`, `get_or_create_idempotency` + RLS + seed SLO + cron horaire SLO + extension cleanup TTL.

**Créés (code)** :
- `supabase/functions/_shared/idempotency.ts`
- `supabase/functions/_shared/incident.ts`
- `src/hooks/useIdempotentInvoke.ts`
- `src/components/admin/SLODashboard.tsx`
- `src/components/admin/IncidentTimeline.tsx`
- `src/pages/admin/Incidents.tsx`
- `supabase/functions/compute-slos/index.ts` (déclenchée par cron)

**Modifiés** :
- 5 edge functions (generate-music, export-user-data, create-checkout, generate-quiz, extract-document) : wrap idempotency
- `src/pages/Status.tsx` : section "Incidents 30j"
- `src/pages/AdminObservability.tsx` : intégration `SLODashboard`
- `src/App.tsx` : route `/admin/incidents`
- `supabase/config.toml` : `[functions.compute-slos]`

