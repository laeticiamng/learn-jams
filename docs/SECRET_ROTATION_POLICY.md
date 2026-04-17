# Politique de rotation des secrets — Cognitio

Tous les secrets critiques DOIVENT être tournés selon le calendrier ci-dessous. Aucune exception : un secret non tourné > 2× sa période est considéré comme compromis.

## Calendrier

| Secret                        | Fréquence | Owner            | Procédure       | Impact si compromis                       |
| ----------------------------- | --------- | ---------------- | --------------- | ----------------------------------------- |
| `STRIPE_SECRET_KEY`           | 12 mois   | CTO              | Stripe Dashboard → Developers → API keys → Roll | Encaissement frauduleux, fuite clients     |
| `STRIPE_WEBHOOK_SECRET`       | 6 mois    | CTO              | Stripe Dashboard → Webhooks → Endpoint → Roll secret | Webhooks falsifiés, double-billing         |
| `SUNO_API_KEY`                | 6 mois    | Lead Backend     | Console Suno → API → Regenerate | Coût Suno hors-cap, génération abusive      |
| `SUNO_CALLBACK_SECRET`        | 6 mois    | Lead Backend     | `secrets--update_secret` Lovable + redéploiement edge | Callbacks falsifiés (faux "ready")          |
| `LOVABLE_API_KEY`             | 12 mois   | CTO              | Console Lovable → AI Gateway → Rotate | Coût LLM hors-budget                        |
| `SUPABASE_SERVICE_ROLE_KEY`   | 24 mois   | CTO              | Console Supabase → API keys → Rotate (impacts edge functions) | Bypass RLS complet → fuite données massive |

## Procédure standard (zero-downtime)

1. **Préparer** — créer le nouveau secret côté provider, copier la valeur.
2. **Mettre à jour Lovable** — `Workspace Settings → Edge Function Secrets` ou tool `secrets--update_secret`. Ne PAS supprimer l'ancien.
3. **Redéployer** les edge functions concernées (`supabase--deploy_edge_functions`).
4. **Vérifier** — appeler les endpoints clés (génération musicale, webhook test) ; consulter `/admin/observability` → erreurs.
5. **Révoquer l'ancien** côté provider après 24 h sans erreur.
6. **Logger** — créer une entrée `security_audit_events` :
   ```sql
   INSERT INTO security_audit_events (event_type, severity, details_json)
   VALUES ('secret_rotated', 'info', jsonb_build_object('secret', 'STRIPE_SECRET_KEY', 'rotated_by', 'cto'));
   ```

## Procédure d'urgence (compromis avéré)

1. **Révoquer immédiatement** côté provider, sans attendre rotation propre.
2. **Activer kill-switch** via `feature_flags` pour la fonctionnalité concernée (ex. `enable_music_generation = false`).
3. **Créer un incident** sévérité `critical` dans `/admin/incidents`.
4. **Nouvelle clé** + redéploiement comme ci-dessus.
5. **Audit post-mortem** — `select * from security_audit_events where created_at > <date_compromission> and severity in ('error','critical')`.

## Vérification annuelle

Audit trimestriel par le CTO :
- `select event_type, max(created_at) from security_audit_events where event_type='secret_rotated' group by event_type;`
- Toute clé sans rotation depuis > 1× sa période → planifier dans le sprint.
- Toute clé sans rotation depuis > 2× → traiter comme compromis.

## Secrets jamais en code

Aucun secret listé ci-dessus ne doit jamais apparaître dans :
- Code source (frontend ou edge functions)
- Logs (vérifier que les `console.log` ne loggent pas les headers)
- Issues GitHub / tickets
- Captures d'écran partagées
