

# Audit final COGNITIO — Derniers manques

## État actuel
La plateforme est déjà très mature : navigation mobile, streak, avatar, partage, sécurité du profil, gouvernance complète (rate-limit, circuit breaker, audit log, quotas, observabilité, alerting/cron). Restent quelques **trous techniques critiques** identifiés.

## Manques restants

### 1. ⚠️ Webhooks externes non configurés dans `config.toml` (CRITIQUE)
Les fonctions `webhook-resend`, `webhook-twilio`, `webhook-suno`, `webhook-stripe` ne sont **pas déclarées** dans `supabase/config.toml`. Sans `verify_jwt = false`, elles rejettent les callbacks externes avec un 401 → notifications mail/SMS et événements provider perdus.

**Fix** : Ajouter les blocs dans `config.toml`.

### 2. Service Worker PWA absent
Manifest présent mais aucun SW. L'app n'est pas réellement installable ni cache-first.

**Fix** : `public/sw.js` minimal (cache static assets, network-first pour API), enregistré dans `index.html`.

### 3. Export RGPD des données utilisateur
Bouton "Supprimer mon compte" présent, mais pas de **droit à la portabilité** (RGPD art. 20). L'utilisateur ne peut pas exporter ses données.

**Fix** : Edge function `export-user-data` qui retourne un JSON (profile, songs, missions, runs, transformations) + bouton dans Profil → Sécurité.

### 4. Lien `/admin/observability` absent du menu admin
La page existe mais aucun lien depuis `AdminDashboard`. Les admins doivent connaître l'URL.

**Fix** : Ajouter une carte/lien dans `AdminDashboard.tsx`.

### 5. Quotas client non affichés
Le hook `useFeatureQuota` existe mais aucun composant ne montre à l'utilisateur ses quotas restants (génération mission, analyse, musique).

**Fix** : Composant `QuotaIndicator` affiché dans `Create` et `Profile`.

### 6. Page `/offline` PWA
Pour une vraie PWA, il faut une page de fallback offline gérée par le SW.

**Fix** : `public/offline.html` minimal cohérent avec le branding.

---

## Plan d'implémentation (un seul passage)

### Étape 1 — Config webhooks
- Ajouter dans `supabase/config.toml` :
  ```toml
  [functions.webhook-resend]   verify_jwt = false
  [functions.webhook-twilio]   verify_jwt = false
  [functions.webhook-suno]     verify_jwt = false
  [functions.webhook-stripe]   verify_jwt = false
  ```

### Étape 2 — Service Worker + offline
- Créer `public/sw.js` (cache v1 : assets statiques, stratégie network-first)
- Créer `public/offline.html` (page sobre branded)
- Enregistrer le SW dans `index.html` (script inline avec garde dev)

### Étape 3 — Export RGPD
- Créer edge function `supabase/functions/export-user-data/index.ts` (verify_jwt=true, agrège profile/songs/missions/transformations/runs/streak)
- Ajouter bouton "Télécharger mes données" dans Profil → Sécurité (déclenche download JSON)

### Étape 4 — Lien observability dans Admin
- Ajouter carte cliquable "Observabilité système" dans `AdminDashboard.tsx` → `/admin/observability`

### Étape 5 — Composant QuotaIndicator
- Créer `src/components/QuotaIndicator.tsx` (utilise `useFeatureQuota`, affiche progress bar X/Y avec couleur seuil)
- Intégrer dans `Create.tsx` (haut de page) et section quota Profil

---

## Fichiers

**Créés** :
- `public/sw.js`
- `public/offline.html`
- `src/components/QuotaIndicator.tsx`
- `supabase/functions/export-user-data/index.ts`

**Modifiés** :
- `supabase/config.toml` (4 blocs webhook + export-user-data)
- `index.html` (enregistrement SW)
- `src/pages/Profile.tsx` (bouton export RGPD + QuotaIndicator)
- `src/pages/Create.tsx` (QuotaIndicator)
- `src/pages/AdminDashboard.tsx` (lien observability)

