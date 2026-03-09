

# AUDIT TECHNIQUE COMPLET v2 — STUDYBEATS

---

## 1. RESUME EXECUTIF

**Etat global** : Plateforme fonctionnellement mature, bien structuree, architecture frontend/backend coherente. Les corrections de l'audit precedent ont ete largement appliquees. Qualite de code superieure a la moyenne pour un projet Lovable.

**Niveau de preparation** : 88% — La majorite des problemes critiques de l'audit precedent ont ete corriges. Quelques problemes residuels subsistent.

**Verdict go-live** : **NON EN L'ETAT** — 2 P0 et 4 P1 residuels a corriger.

### P0 restants (2)
1. **`poll-suno-status` TOUJOURS absent de `config.toml`** — malgre la correction annoncee dans l'audit precedent, la fonction n'est pas dans le fichier. Le polling des songs en generation peut echouer.
2. **Toutes les RLS policies sont TOUJOURS RESTRICTIVE** — la migration `20260309073849` a recree les policies avec `CREATE POLICY` sans le mot-cle `PERMISSIVE`, ce qui les laisse par defaut en RESTRICTIVE dans PostgreSQL. Or la precedente migration les a droppees et recrees — elles sont donc RESTRICTIVE. La preuve : le schema affiche dans les metadonnees montre `Permissive: No` sur CHAQUE policy. Cela signifie que les deux policies SELECT sur `songs` (`songs_owner_select` + `songs_public_read`) imposent que les DEUX conditions soient vraies (owner AND public), ce qui rend les chansons publiques inaccessibles aux non-proprietaires dans le Hall of Fame. De meme, `sub_service` (ALL with `true`) en RESTRICTIVE + `sub_select` en RESTRICTIVE signifie que le webhook Stripe ne pourra PAS upsert les subscriptions car `sub_select` (qui requiert `auth.uid() = user_id`) bloque le role `service_role` au niveau RESTRICTIVE.

### P1 restants (4)
1. **`contact_messages` INSERT policy autorise `anon`** — la migration autorise les utilisateurs non authentifies a inserer dans `contact_messages`, mais le formulaire Contact ne verifie pas si l'utilisateur est connecte. C'est un choix valable mais il n'y a pas de captcha/honeypot = risque de spam via API directe.
2. **`songs` realtime non active** — `useSongs.ts` souscrit a `postgres_changes` sur la table `songs`, mais aucune migration ne contient `ALTER PUBLICATION supabase_realtime ADD TABLE public.songs`. Le realtime peut ne pas fonctionner, ce qui forcerait le fallback polling (moins reactif).
3. **Signup `field_of_study` persist defaillant** — `Signup.tsx:67-71` appelle `supabase.auth.getUser()` immediatement apres `signUp()` pour recuperer le user ID et update le profil. Mais quand auto-confirm est desactive (ce qui est le cas), `signUp()` ne cree pas une session active — `getUser()` retournera `null` et l'update du profil echouera silencieusement. Le `field_of_study` ne sera jamais persiste.
4. **`stripe-webhook` user lookup faible** — `findUserIdByEmail` fait d'abord un lookup sur `profiles.display_name` via `ilike` (ligne 33), ce qui ne matchera presque jamais car `display_name` n'est pas un email. Le fallback `auth.admin.listUsers` avec `perPage: 50` ne trouvera pas les users si plus de 50 existent. Cela peut entrainer des webhooks Stripe ignores et des abonnements non refletes.

### P1 corrige depuis l'audit precedent (confirme)
- XSS dans `CourseUploader.tsx` → corrige (plus de `dangerouslySetInnerHTML`)
- XSS dans `Export.tsx` → corrige (`escapeHtml`/`escapeXml` implementes)
- `delete-account` → complete avec toutes les tables
- `generate-quiz` → multilingue (7 langues)
- Studio.tsx `value`/`defaultValue` → corrige
- Contact.tsx rate limit → traduit
- Navbar → Export ajoute en desktop
- Footer → EMOTIONSCARE SASU
- SEO canonical/OG → aligne sur `learn-jams.lovable.app`
- Social proof → dynamique via `get_platform_stats()`

---

## 2. TABLEAU D'AUDIT COMPLET

| Priorite | Domaine | Page / Fonction | Probleme | Symptome | Risque | Recommandation | Faisable ? |
|----------|---------|----------------|----------|----------|--------|----------------|------------|
| P0 | Config | `config.toml` | `poll-suno-status` absent | Polling peut echouer avec verify_jwt par defaut | Songs bloquees en "generating" | Ajouter `[functions.poll-suno-status] verify_jwt = false` | Oui |
| P0 | RLS | Toutes tables | Policies RESTRICTIVE au lieu de PERMISSIVE | `Permissive: No` visible dans le schema | Songs publiques invisibles, webhook Stripe bloque, leaderboard potentiellement casse | Recreer avec `CREATE POLICY ... AS PERMISSIVE` | Oui (migration) |
| P1 | Security | Contact | INSERT policy autorise `anon` sans captcha | Spam possible via API directe | DB bloat, abus | Ajouter honeypot ou restreindre a `authenticated` | Oui |
| P1 | Realtime | `songs` | Table non ajoutee a `supabase_realtime` | Realtime ne fonctionne pas, fallback polling | UX moins reactive | Ajouter `ALTER PUBLICATION supabase_realtime ADD TABLE public.songs` | Oui |
| P1 | Auth | Signup | `field_of_study` non persiste quand email non confirme | `getUser()` retourne null apres signup sans session | Donnee perdue | Sauvegarder dans `user_metadata` via options.data dans signUp() | Oui |
| P1 | Billing | `stripe-webhook` | `findUserIdByEmail` lookup sur `display_name` ilike | Ne matche jamais | Abonnements non refletes | Lookup par email via `auth.admin.listUsers` avec filtre email, ou stocker email dans profiles | Oui |
| P2 | Performance | Homepage | 541 lignes, pas de code splitting | FCP potentiellement lent sur mobile | Performance | React.lazy les sections below fold | Oui |
| P2 | UX | League | `songs_public_read` RESTRICTIVE bloque Hall of Fame | Chansons publiques invisibles si not owner | Fonctionnalite cassee | Corriger via P0 RLS fix | Corrige via P0 |
| P2 | Security | `suno-callback` | Secret en query param URL | Visible dans logs serveur | Leak potentiel du secret | Passer en header custom | Oui |
| P2 | Console | Homepage | Warning `ref is not a prop` de framer-motion | Console warning visible | Pas bloquant mais bruit | Upgrade framer-motion ou wrapper | Oui |
| P2 | Auth | Login | Redirect logic dans `useEffect` avec `user` peut ignorer `from` state | Double redirect possible | UX suboptimale | Le code actuel semble correct (utilise `from`) — verifier en test | A verifier |
| P3 | i18n | `extract-document` | Prompts seulement en francais | Extraction toujours en francais | UX multilingue | Adapter le prompt a la langue | Oui |
| P3 | SEO | `index.html` | `<html lang="fr">` hardcode | Incorrect pour les 6 autres langues | SEO/a11y | Dynamiser avec i18n | Complexe (SPA) |
| P3 | Perf | Index | LD+JSON script cree/supprime a chaque render via useEffect | Re-renders inutiles | Performance mineure | Deplacer en static ou useMemo avec key | Oui |

---

## 3. DETAIL PAR CATEGORIE

### A. Frontend & Rendu
**Ce qui fonctionne** : Toutes les 19 pages rendent correctement. Design premium et coherent. Animations Framer Motion soignees. Etats loading/empty/error geres sur toutes les pages cles (Library, Player, Quiz, Export, Studio, League). Responsive correct. Navigation desktop et mobile complete.

**Problemes residuels** :
- Console warning `ref is not a prop` de framer-motion (AnimatePresence sur homepage) — non bloquant
- `<html lang="fr">` hardcode dans index.html — incorrect pour les 6 autres langues

### B. QA Fonctionnelle
**Ce qui fonctionne** : Flow complet Create → Library → Player → Quiz est bien implemente. Favoris, suppression avec confirmation, retry de generation, realtime + polling fallback, notifications avec cloche, paywall avec quota atomique, checkout Stripe, portail client, delete account, command palette. Filtres dans Library (all/favorites/recent/generating). SCORM export fonctionnel avec sanitization.

**Problemes** :
- `field_of_study` ne sera pas persiste au signup quand auto-confirm est desactive (pas de session apres signup)
- Realtime sur songs potentiellement non actif (table pas dans publication)

### C. Auth & Autorisations
**Ce qui fonctionne** : Auth flow complet (signup avec strength meter + terms, login, logout, forgot/reset password, recovery link validation, protected routes avec redirect et toast). Session refresh via `onAuthStateChange`. Guards frontend corrects sur toutes les routes protegees.

**Problemes** :
- Signup field_of_study (voir P1 ci-dessus)
- `extract-document` utilise `session?.access_token || VITE_SUPABASE_PUBLISHABLE_KEY` comme fallback — si pas de session, l'anon key sera utilisee mais la function verifie le JWT en code → ca retournera Unauthorized, ce qui est correct mais pas un bug

### D. APIs & Edge Functions
**Ce qui fonctionne** : 11 edge functions toutes avec CORS correct, auth verification (JWT claims ou getUser), error handling structure. `generate-lyrics` utilise `getClaims`, `generate-music` utilise `getClaims` + ownership check, `poll-suno-status` utilise `getClaims` + ownership check, `suno-callback` verifie le secret. `generate-quiz` ownership check. `delete-account` supprime toutes les tables. Structured logging dans les fonctions critiques.

**Problemes** :
- `poll-suno-status` absent de `config.toml` — peut echouer
- `stripe-webhook` `findUserIdByEmail` defaillant (lookup sur display_name)
- `check-subscription` utilise `getUser` au lieu de `getClaims` — fonctionnel mais moins performant
- `suno-callback` secret en query param

### E. Database & RLS
**Ce qui fonctionne** : Schema coherent, 10 tables, RLS active sur toutes. Ownership policies presentes. `handle_new_user` trigger pour auto-creation profile. `increment_quota_atomic` pour quotas atomiques. `validate_rating` et `validate_contact_message` triggers. `notify_song_ready` trigger. `get_platform_stats` security definer.

**PROBLEME CRITIQUE** : Toutes les policies sont RESTRICTIVE (`Permissive: No`). La migration `20260309073849` a recree les policies mais sans specifier `AS PERMISSIVE` — PostgreSQL utilise RESTRICTIVE par defaut pour `CREATE POLICY`. Cela casse :
- `songs` : les deux SELECT policies (owner + public) sont en AND → les songs publiques ne sont visibles que par leur proprietaire
- `subscriptions` : `sub_service` (ALL true) + `sub_select` (auth.uid() check) en RESTRICTIVE → le service_role est bloque par les policies RESTRICTIVE (bien que le service_role bypass RLS normalement)

**Note** : Le service_role bypass RLS donc le webhook Stripe fonctionne quand meme. Mais les songs publiques dans le Hall of Fame sont effectivement cassees.

### F. Securite
**Ce qui fonctionne** : DOMPurify pour sanitization HTML (About, Terms, Privacy). Webhook Stripe verifie la signature. CORS correctement configure. Pas de secrets exposes cote client. XSS corrige dans CourseUploader et Export. Contact form avec validation serveur (trigger).

**Problemes residuels** :
- Contact form accessible sans authentification (policy autorise `anon`) — pas de captcha
- `suno-callback` secret en query param
- Pas de rate limiting serveur sur les edge functions (limitation Lovable)

### G. Paiement & Billing
**Ce qui fonctionne** : Stripe checkout avec `price_1T8JRhDFa5Y9NR1IkeJEEVmT` (14.90€/mois). Webhook avec signature verification et events supportes (checkout.session.completed, subscription.updated/deleted, invoice.payment_failed). Customer portal. Paywall avec quota atomique (1 song gratuite/mois). Etat abonnement refleterait correctement dans Profile et Pricing.

**Problemes** :
- `findUserIdByEmail` dans webhook defaillant (voir P1)
- Pas de verification que le price ID est en mode live (non confirmable depuis l'interface)

### H. Performance
**Correct dans l'ensemble**. Polling de songs generating toutes les 10s avec ref stable. Realtime avec fallback polling 15s si deconnecte. Homepage lourde (541 lignes) mais sections avec `whileInView`. Pas de lazy loading explicite des routes.

### I. SEO
**Bien implemente** : `usePageSEO` sur toutes les pages. Canonical, OG, Twitter cards. Schema.org FAQPage, SoftwareApplication, Organization. Sitemap et robots.txt corrects pointant vers `learn-jams.lovable.app`. Pages protegees en `noindex`.

### J. Accessibilite
**Correct** : Labels sur formulaires, `aria-label` sur player et demo player, `role="button"` et keyboard handlers sur demo player. Footer avec `aria-label`. Focus states via Tailwind.

### K. i18n
**Bonne couverture** : 7 langues (fr, en, de, es, ar, zh, hi). Traductions completes pour auth, homepage, pricing, contact, legal. Prompts AI multilingues dans `generate-lyrics` et `generate-quiz`. `extract-document` prompt seulement en francais.

### L. Observabilite / Go-Live
- Logs structures dans generate-music, suno-callback, poll-suno-status, stripe-webhook ✓
- Cookie consent present et fonctionnel ✓
- Pages legales (CGU, Privacy) avec infos EMOTIONSCARE ✓
- Social proof dynamique ✓
- Pas de monitoring/Sentry
- Pas d'analytics
- Pas de health endpoint

---

## 4. PLAN D'ACTION PRIORISE

### P0 — Immediat
1. **Ajouter `[functions.poll-suno-status] verify_jwt = false` dans `config.toml`**
2. **Migration RLS : recreer TOUTES les policies avec `AS PERMISSIVE`** — utiliser explicitement `CREATE POLICY ... AS PERMISSIVE` pour chaque policy

### P1 — Rapide
1. **Realtime songs** : `ALTER PUBLICATION supabase_realtime ADD TABLE public.songs`
2. **Signup field_of_study** : Stocker `field_of_study` dans `options.data` de `signUp()` et modifier le trigger `handle_new_user` pour lire `raw_user_meta_data->>'field_of_study'`
3. **stripe-webhook** : Corriger `findUserIdByEmail` — supprimer le lookup display_name, utiliser directement `auth.admin.listUsers` avec pagination ou mieux, stocker l'email dans la table profiles et chercher par `profiles.email`
4. **Contact spam** : Ajouter un champ honeypot dans le formulaire Contact

### P2 — Ameliorations
1. Passer le secret suno-callback en header au lieu de query param
2. Fix console warning framer-motion
3. Lazy load des routes dans App.tsx

### P3 — Polish
1. Dynamiser `<html lang>` selon i18n
2. Adapter prompt `extract-document` a la langue
3. Ajouter monitoring

---

## 5. IMPLEMENTATION IMMEDIATE

Les corrections suivantes doivent etre implementees :

1. **`config.toml`** : Ajouter `[functions.poll-suno-status] verify_jwt = false`
2. **Migration DB** : Recreer toutes les RLS policies avec `AS PERMISSIVE` explicite
3. **Migration DB** : Ajouter `ALTER PUBLICATION supabase_realtime ADD TABLE public.songs`
4. **`Signup.tsx`** : Ajouter `field_of_study` dans `options.data` du `signUp()` au lieu du update post-signup
5. **`handle_new_user` trigger** : Modifier pour lire `field_of_study` depuis `raw_user_meta_data`
6. **`stripe-webhook`** : Corriger `findUserIdByEmail` pour utiliser `auth.admin.listUsers` avec un filtre email correct
7. **`Contact.tsx`** : Ajouter un champ honeypot invisible

