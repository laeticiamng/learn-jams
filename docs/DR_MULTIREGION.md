# Disaster Recovery & Multi-Region — Cognitio

Engagements de continuité de service. À réviser tous les 6 mois par le CTO.

## Objectifs

| Indicateur | Cible | Mesure                                         |
| ---------- | ----- | ---------------------------------------------- |
| **RPO**    | 24 h  | Snapshot Supabase quotidien (Point Objective)  |
| **RTO**    | 4 h   | Temps de restauration depuis snapshot         |
| **MTTD**   | 15 min | Détection via `/admin/observability` + alertes |
| **MTTR critical** | 1 h | Voir `INCIDENT_RUNBOOK.md`                |

## Sauvegardes

- **Quotidiennes** : Supabase Pro plan inclut 7 j de PITR (Point In Time Recovery).
- **Vérification automatique** : `run_backup_verification()` toutes les 24 h, résultats dans `backup_verification_runs` (visible `/admin/observability`).
- **Restauration test** : trimestrielle, sur projet de staging, documentée dans Confluence.

### Procédure de restauration

1. Console Supabase → Project → Database → Backups → choisir snapshot.
2. Restaurer dans un nouveau projet (`cognitio-recovery-YYYY-MM-DD`).
3. Pointer DNS vers le nouveau projet (mise à jour `VITE_SUPABASE_URL` côté frontend, redéploiement).
4. Vérifier `run_backup_verification()` retourne `healthy`.
5. Communiquer via `/status` + email Pro.

## Single-region : risques connus

L'instance Supabase est en région unique (Frankfurt). En cas de panne majeure régionale :
- **Indisponibilité** : 100 % pendant la durée de l'incident.
- **Perte de données** : limitée au RPO (≤ 24 h).
- **Pas de bascule automatique** vers une autre région.

## Multi-region : roadmap

Activable uniquement via contrat Supabase Enterprise. Évalué si :
- ARR > 200k€
- Clients Enterprise demandent SLA ≥ 99.9 %
- Régulateur (santé/éducation) exige résidence multi-zone

Architecture cible :
- **Read replicas** dans 2 régions secondaires (eu-west, us-east).
- **Failover DNS** via Cloudflare.
- **Edge functions** déjà multi-region par défaut (Deno Deploy).
- **Storage** : réplication S3 cross-region.

## Données sensibles : portabilité

- Export RGPD (`export-user-data`) garantit qu'un utilisateur peut récupérer ses données même si on perd notre infra.
- Format JSON/CSV interopérable, pas de verrou propriétaire.

## Communication d'incident

| Statut       | Canal                       | Délai   |
| ------------ | --------------------------- | ------- |
| Détecté      | Slack #oncall + alerte auto | < 5 min |
| Reconnu      | `/status` + incident timeline | < 15 min |
| Identifié    | Update toutes les 30 min    | continu |
| Résolu       | Email Pro + post-mortem     | < 24 h  |

## Tests de continuité

- **Trimestriels** : restore complet sur staging, mesure du RTO réel.
- **Annuels** : table-top exercise (équipe simule un scénario worst-case).
- **Chaos test** : `scripts/chaos-test.ts` à lancer mensuellement contre staging.
