

# Audit complet — StudyBeats (pré-production)

---

## RÉSUMÉ EXÉCUTIF

L'application StudyBeats est fonctionnelle et bien structurée mais présente **2 problèmes critiques bloquants**, **5 problèmes importants** et **plusieurs améliorations recommandées** avant mise en production.

---

## 🔴 CRITIQUE — Bloquant pour la production

### 1. Toutes les politiques RLS sont RESTRICTIVE (= inopérantes)

**Impact : Les données sont inaccessibles OU potentiellement exposées.**

Les 13 politiques RLS sur les tables `favorites`, `profiles`, `songs`, `subscriptions`, `usage_quotas` sont définies en mode `RESTRICTIVE`. En PostgreSQL, les politiques RESTRICTIVE ne fonctionnent que s'il existe au moins une politique PERMISSIVE. Sans celle-ci, aucune ligne n'est accessible — ce qui signifie que l'application fonctionne probablement grâce au service role key dans les edge functions, mais les requêtes client-side (bibliothèque, profil, favoris) devraient échouer silencieusement.

**Correction** : Recréer chaque politique en mode PERMISSIVE (le défaut PostgreSQL).

### 2. Protection contre les mots de passe compromis désactivée

Le scan de sécurité révèle que la protection « leaked password » est désactivée. Les utilisateurs pourraient s'inscrire avec des mots de passe déjà présents dans des fuites de données.

**Correction** : Activer la protection via les paramètres d'authentification.

---

## 🟠 IMPORTANT — À corriger avant production

### 3. Suppression de compte incomplète (Profile.tsx)

La fonction `handleDeleteAccount` supprime les données côté client (favorites, songs, profiles) mais **ne supprime pas le compte auth lui-même** (pas d'appel à `supabase.auth.admin.deleteUser`). L'utilisateur ne peut pas se réinscrire avec le même email. De plus, les tables `subscriptions` et `usage_quotas` ne sont pas nettoyées.

### 4. config.toml : `verify_jwt = false` sur toutes les fonctions

Toutes les edge functions (y compris `generate-lyrics`, `generate-music`, `generate-quiz`, `create-checkout`, `customer-portal`) ont `verify_jwt = false`. Même si certaines fonctions vérifient manuellement le JWT dans le code, le callback Suno et le webhook Stripe justifient cette config mais pas les autres. La mémoire du projet indique explicitement que les fonctions doivent vérifier le JWT.

**Correction** : Mettre `verify_jwt = true` pour les fonctions qui ne sont pas des callbacks externes (garder `false` uniquement pour `suno-callback` et `stripe-webhook`).

### 5. CORS `Access-Control-Allow-Origin: *` sur toutes les fonctions

En production, accepter toutes les origines expose les API à des abus cross-origin. 

**Correction** : Restreindre à l'origine de production `https://learn-jams.lovable.app` (ou `https://studybeats.app` si domaine custom).

### 6. Pas de `customer-portal` accessible dans l'UI

Le portail Stripe pour gérer l'abonnement existe en backend mais n'est pas exposé dans l'interface (ni dans Profile, ni dans Pricing). Un utilisateur Pro ne peut pas annuler ou gérer son abonnement.

### 7. Quota : race condition dans `generate-lyrics`

Le contrôle de quota (lecture puis écriture) n'est pas atomique. Deux requêtes simultanées pourraient passer le check et dépasser la limite. Utiliser une opération atomique (RPC SQL avec `UPDATE ... RETURNING` ou un verrou).

---

## 🟡 RECOMMANDATIONS — Qualité et robustesse

### 8. SEO : index.html mentionne 8 styles mais l'app en propose ~30

Le structured data `featureList` indique « 8 styles musicaux » alors que le StylePicker en propose bien plus. Mettre à jour pour refléter la réalité.

### 9. URL canonique vs URL publiée incohérentes

- `index.html` : canonical = `https://studybeats.app/`
- URL publiée réelle : `https://learn-jams.lovable.app`

Si le domaine custom `studybeats.app` n'est pas configuré, le canonical est incorrect et nuit au SEO.

### 10. Pas de gestion des erreurs réseau côté client

Les appels Supabase dans `useSongs`, `Player`, `Profile` n'affichent pas de toast/erreur en cas d'échec réseau. L'utilisateur voit juste un écran de chargement infini.

### 11. `extract-document` : limite de 200 MB en mémoire

La fonction convertit tout le fichier en base64 en mémoire. Pour un fichier de 200 MB, cela requiert ~300 MB de RAM, ce qui dépasse probablement les limites d'une edge function. Réduire la limite ou utiliser le stockage intermédiaire.

### 12. Pas de validation d'entrée côté client sur Create

- Le champ `title` et `subject` n'ont pas de `maxLength`
- Le `courseText` n'a qu'une vérification `length > 20` mais pas de limite haute côté UI (50 000 caractères max côté backend)

### 13. `check-subscription` non appelée automatiquement

L'auth context ne vérifie pas le statut d'abonnement au login. La page Create fait un check local, mais un cache global serait plus fiable (comme recommandé par le guide Stripe).

### 14. Absence de page de succès post-checkout

Le checkout Stripe redirige vers `/library?checkout=success` mais aucun traitement de ce paramètre n'est visible dans Library.tsx (pas de toast de bienvenue, pas de refresh d'abonnement).

### 15. Pas de mode light

L'app est dark-only (`class="dark"` en dur dans `index.html`). Pas de light theme défini dans les CSS variables. C'est un choix de design mais à noter.

---

## ✅ POINTS POSITIFS

- Architecture propre : séparation pages/components/hooks
- i18n complet en 7 langues
- Realtime + fallback polling bien implémenté
- Ownership checks dans toutes les edge functions
- Structured data / SEO soigné
- Paywall côté backend (pas bypass possible côté client)
- Gestion d'erreurs Suno avec retry et timeout

---

## PLAN D'ACTION PRIORITAIRE

```text
Priorité   │ Action                                          │ Effort
───────────┼─────────────────────────────────────────────────┼────────
P0 CRITIQUE│ Recréer les 13 RLS policies en PERMISSIVE       │ ~15 min
P0 CRITIQUE│ Activer la protection leaked password           │ ~2 min
P1 IMPORTANT│ Activer verify_jwt dans config.toml            │ ~5 min
P1 IMPORTANT│ Ajouter bouton "Gérer abonnement" dans Profile │ ~15 min
P1 IMPORTANT│ Corriger suppression de compte (+ cleanup)     │ ~20 min
P1 IMPORTANT│ Rendre le quota atomique                       │ ~15 min
P2 QUALITÉ │ Restreindre CORS en production                  │ ~10 min
P2 QUALITÉ │ Ajouter validation max sur les inputs           │ ~10 min
P2 QUALITÉ │ Traiter le paramètre checkout=success           │ ~10 min
P2 QUALITÉ │ Corriger canonical URL / structured data        │ ~5 min
```

