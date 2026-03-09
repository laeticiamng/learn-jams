

# AUDIT TECHNIQUE COMPLET — STUDYBEATS

---

## 1. RESUME EXECUTIF

**Etat global** : Plateforme fonctionnellement mature, bien structurée, avec une bonne architecture frontend/backend. Qualité de code supérieure a la moyenne pour un projet Lovable. Cependant, plusieurs problemes de securite, de configuration et de coherence empechent un go-live serein.

**Niveau de preparation** : 75% — La majorite des fonctionnalites sont operationnelles mais des risques de securite et des incoherences structurelles doivent etre resolus.

**Verdict go-live** : **NON EN L'ETAT** — Correctifs P0 et P1 requis avant mise en production.

### 5 P0 principaux
1. **`poll-suno-status` absent de `config.toml`** — cette edge function ne se deploiera pas correctement (verify_jwt non configure)
2. **`dangerouslySetInnerHTML` non sanitise dans `CourseUploader.tsx`** — XSS possible via nom de fichier injecte
3. **Donnees sociales hardcodees trompeuses** (1200+ chansons, 500+ etudiants) — faux social proof
4. **`verify_jwt = false` sur TOUTES les edge functions** sans distinction — les fonctions sensibles (delete-account, customer-portal, create-checkout) sont exposees au niveau config meme si elles valident le JWT en code
5. **Profils SELECT restreint a `auth.uid() = user_id`** — la page League ne peut pas lire les profils des AUTRES utilisateurs pour afficher le leaderboard

### 5 P1 principaux
1. **Signup ne persiste pas `field_of_study`** dans la table profiles (le trigger `handle_new_user` n'inclut pas ce champ)
2. **`Export.tsx` — XSS dans SCORM HTML** : `song.title` injecte directement dans le `<title>` et `<h1>` sans echappement
3. **URL canonical incorrecte** dans `index.html` — pointe vers `https://studybeats.app/` mais le site publie est `https://learn-jams.lovable.app`
4. **`delete-account` ne supprime pas `league_points`, `song_ratings`, `session_participants`, `collaborative_sessions`** — donnees orphelines
5. **Contact form sans validation de longueur cote serveur** — pas de limite sur les champs `name`, `email`, `message` dans la table `contact_messages`

---

## 2. TABLEAU D'AUDIT COMPLET

| Priorite | Domaine | Page / Fonction | Probleme | Symptome | Risque | Recommandation | Faisable dans Lovable ? |
|----------|---------|----------------|----------|----------|--------|----------------|------------------------|
| P0 | Config | `poll-suno-status` | Absent de `config.toml` | Function peut echouer avec verify_jwt par defaut | Polling casse | Ajouter `[functions.poll-suno-status] verify_jwt = false` | Oui |
| P0 | Security | `CourseUploader.tsx:111` | `dangerouslySetInnerHTML` avec `fileName` non sanitise | XSS via nom de fichier | Injection code | Utiliser `sanitizeHtml()` ou text interpolation | Oui |
| P0 | UX/Ethique | Homepage | Faux social proof hardcode (1200+ chansons, 500+ etudiants) | Trompeur | Credibilite, legal | Retirer ou rendre dynamique | Decision produit |
| P0 | RLS | `profiles` | `prof_select` = `auth.uid() = user_id` | League ne peut pas lire profils autres utilisateurs | Leaderboard casse | Ajouter policy read publique limitee | Oui |
| P0 | Security | SCORM Export | `song.title` injecte dans HTML sans echappement | XSS dans package SCORM | Code malicieux dans LMS | Echapper le titre | Oui |
| P1 | Auth | Signup | `field_of_study` non persiste dans profiles | Champ perdu apres inscription | UX degradee | Modifier trigger ou insert apres signup | Oui |
| P1 | Data | `delete-account` | Ne supprime pas `league_points`, `song_ratings`, `session_participants`, `collaborative_sessions` | Donnees orphelines | RGPD non-conformite | Ajouter les DELETE | Oui |
| P1 | SEO | `index.html` | Canonical pointe vers `studybeats.app` non `learn-jams.lovable.app` | SEO incorrect | Deindexation | Aligner canonical avec domaine reel | Decision produit |
| P1 | SEO | `index.html` | OG URLs pointent vers `studybeats.app` | Partage social casse | Apercu lien brise | Aligner | Decision produit |
| P1 | Security | Contact form | Aucune validation longueur cote DB | Spam massif possible | DB bloat | Ajouter CHECK ou trigger | Oui |
| P1 | UX | Studio | Input `value` et `defaultValue` sur meme element (lignes 264-265, 274-275) | React warning, comportement imprevisible | Bug edition verse | Utiliser seulement `value` | Oui |
| P2 | RLS | `collaborative_sessions` | Policies RESTRICTIVE (not PERMISSIVE) | Toutes les policies sont RESTRICTIVE — le `session_select true` ne fait rien si la policy est restrictive sans permissive | Sessions inaccessibles | Verifier que les policies sont PERMISSIVE | A verifier |
| P2 | Performance | Homepage | 532 lignes, composants lourds (AudioWave, ParallaxOrbs, CountUp) | FCP potentiellement lent | Performance mobile | Lazy load sections below fold | Oui |
| P2 | i18n | Quiz | `generate-quiz` prompt en francais seulement | Quiz toujours en francais | UX multilingue | Adapter prompt a la langue | Oui |
| P2 | Security | `suno-callback` | Secret passe en query param URL | Secret visible dans logs serveur | Leak potentiel | Utiliser header custom | Complexe |
| P2 | UX | League | University tab = placeholder "coming soon" | Fausse fonctionnalite visible | Confusion utilisateur | Cacher ou implementer | Decision produit |
| P2 | Auth | Login | `from` state pas utilise correctement — redirige vers `/create` au lieu de `from` quand `user` change via `useEffect` | Redirect post-login ignore destination | UX degradee | Fixer redirect logic | Oui |
| P3 | a11y | Navbar | Export non present en desktop nav | Inconsistance navigation | Fonctionnalite cachee | Ajouter en desktop | Oui |
| P3 | SEO | Sitemap | Pointe vers `studybeats.app` | Incoherence domaine | SEO | Aligner | Decision produit |
| P3 | Perf | Index | `useEffect` cree et supprime script ld+json a chaque rendu | Re-renders inutiles | Perf | Deplacer dans SSR ou helmet | Oui |

---

## 3. DETAIL PAR CATEGORIE

### A. Frontend & Rendu
**Ce qui fonctionne** : Toutes les pages rendent correctement. Etats loading, empty et error bien geres. Design coherent et professionnel. Animations Framer Motion soignees. Responsive correct.

**Ce qui est douteux** :
- `CourseUploader.tsx:111` : `dangerouslySetInnerHTML` avec `fileName` — XSS si un fichier nomme `<img onerror=alert(1)>.pdf` est uploade
- `Studio.tsx:264-265` : `value={mySubtopic}` ET `defaultValue={myParticipant.subtopic}` sur meme input — React warning, etat incoherent
- Export non accessible depuis la navbar desktop (seulement mobile hamburger menu)

### B. QA Fonctionnelle
**Ce qui fonctionne** : Flow complet Create → Library → Player → Quiz est bien implemente. Favoris, suppression, retry, realtime updates, notifications all work. Paywall et quota fonctionnels. Checkout Stripe branche.

**Problemes** :
- Signup collecte `fieldOfStudy` mais ne l'envoie PAS au backend — le trigger `handle_new_user` n'insere que `display_name`
- Login redirect : `useEffect` avec `user` redirige vers `/create` meme si `from` state pointe ailleurs
- League : `profiles` RLS bloque la lecture des profils d'autres users → leaderboard affichera des noms `null`

### C. Auth & Autorisations
**Ce qui fonctionne** : Auth flow complet (signup, login, logout, forgot/reset password, protected routes, recovery link validation). Session refresh via `onAuthStateChange`. Guards frontend corrects.

**Ce qui est OK** : Toutes les edge functions valident le JWT en code avec `getClaims()` ou `getUser()`. Ownership checks presents dans generate-music, generate-quiz, poll-suno-status.

### D. APIs & Edge Functions
**Ce qui fonctionne** : 11 edge functions, toutes avec CORS, auth, error handling. Structured logging dans les fonctions critiques.

**Problemes** :
- `poll-suno-status` manque dans `config.toml` — risque de deployment
- `check-subscription` utilise `getUser` au lieu de `getClaims` — moins performant mais fonctionnel
- `customer-portal` utilise `getUser` — idem
- `generate-quiz` : prompt uniquement en francais quel que soit la langue

### E. Database & RLS
**Ce qui fonctionne** : RLS sur toutes les tables. Ownership policies correctes sur songs, favorites, notifications, profiles.

**Problemes critiques** :
- TOUTES les policies sont marquees `Permissive: No` (RESTRICTIVE) — cela signifie que les policies doivent TOUTES etre satisfaites pour accorder l'acces. `session_select` et `league_select` avec `true` en USING ne fonctionneront pas correctement si ce sont les seules policies RESTRICTIVE — elles bloqueront les operations car il n'y a pas de policy PERMISSIVE par defaut. **A verifier en production.**
- `profiles` : SELECT restreint a `auth.uid() = user_id` → League ne peut pas lire les profils des autres

### F. Securite
**Ce qui fonctionne** : DOMPurify pour sanitization HTML. Webhook Stripe verifie la signature. CORS correctement configure. Pas de secrets exposes cote client.

**Problemes** :
- XSS dans `CourseUploader.tsx` (fileName non sanitise)
- XSS dans `Export.tsx` — `song.title` injecte dans HTML SCORM sans echappement du `<title>` tag
- `suno-callback` : secret passe en query param visible dans logs
- Pas de rate limiting sur les edge functions (Lovable limitation)
- Contact form sans captcha/honeypot (rate limit client-side seulement 60s)

### G. Paiement & Billing
**Ce qui fonctionne** : Stripe checkout, webhook, customer portal, subscription status check, paywall, quota enforcement. Prix hardcode `price_1T8JRhDFa5Y9NR1IkeJEEVmT` — **a confirmer que c'est un price live et non test**.

**Non confirme** : Impossible de verifier si le price ID et le webhook endpoint sont en mode live ou test depuis l'interface.

### H. Performance
**Correct dans l'ensemble**. Pas de re-renders excessifs visibles. Realtime + polling fallback est un bon pattern. Lazy loading absent pour les sections below-fold de la homepage.

### I. SEO
**Probleme majeur** : Toutes les URLs canoniques, OG, structured data pointent vers `studybeats.app` mais le site est publie sur `learn-jams.lovable.app`. Si le domaine custom n'est pas configure, tout le SEO est casse.

**Ce qui est bien** : Schema.org FAQPage, SoftwareApplication. Meta tags dynamiques via `usePageSEO`. Sitemap et robots.txt presents.

### J. Accessibilite
**Correct** : Labels sur les formulaires, `aria-label` sur le player, `role="button"` sur le demo player, footer avec `aria-label` sur nav. Focus states visibles.

**A ameliorer** : Export absent de la nav desktop.

### K. i18n
**Bonne couverture** : 7 langues (fr, en, de, es, ar, zh, hi). Traductions completes pour les pages principales. Prompts AI multilingues dans `generate-lyrics`.

**Problemes** : `generate-quiz` prompt seulement en francais. Contact rate limit message hardcode en francais (ligne 32).

### L. Observabilite & Go-Live
- Logs structures dans les fonctions critiques
- Pas de health endpoint
- Pas de Sentry/monitoring
- Pas d'analytics visible
- Cookie consent present et fonctionnel
- Pages legales (CGU, Privacy) presentes et completes
- Donnees de demo : social proof hardcode (1200+ chansons, 500+ etudiants) = donnees fictives

---

## 4. PLAN D'ACTION PRIORISE

### P0 — Correctifs immediats
1. Ajouter `[functions.poll-suno-status] verify_jwt = false` dans `config.toml`
2. Corriger XSS dans `CourseUploader.tsx` — remplacer `dangerouslySetInnerHTML` par text interpolation
3. Corriger XSS dans `Export.tsx` — echapper `song.title` dans les tags HTML du SCORM
4. Ajouter une policy PERMISSIVE SELECT publique limitee sur `profiles` (display_name, university, country) pour le leaderboard
5. Verifier/corriger que les policies RLS sont bien PERMISSIVE (et non RESTRICTIVE) sur toutes les tables

### P1 — Correctifs rapides
1. Persister `field_of_study` lors du signup (update profile apres creation)
2. Completer `delete-account` avec `league_points`, `song_ratings`, `session_participants`, `collaborative_sessions`
3. Corriger Studio.tsx — supprimer `defaultValue` quand `value` est present
4. Fixer login redirect pour utiliser `from` state correctement
5. Traduire le prompt de `generate-quiz` selon la langue
6. Fixer le message rate limit hardcode en francais dans Contact.tsx

### P2 — Ameliorations
1. Ajouter Export dans la navbar desktop
2. Lazy load sections homepage below fold
3. Deplacer le secret suno-callback en header au lieu de query param
4. Implementer ou cacher l'onglet "University" dans League
5. Ajouter validation longueur sur `contact_messages`

### P3 — Polish
1. Rendre social proof dynamique ou le retirer
2. Resoudre incoherence domaine (studybeats.app vs learn-jams.lovable.app) — necessite decision produit sur le domaine final
3. Ajouter monitoring/Sentry

---

## 5. IMPLEMENTATION IMMEDIATE

Les corrections suivantes peuvent etre implementees immediatement et de maniere sure :

1. **`config.toml`** : Ajouter poll-suno-status
2. **`CourseUploader.tsx`** : Remplacer dangerouslySetInnerHTML par interpolation texte safe
3. **`Export.tsx`** : Echapper song.title dans le HTML SCORM genere
4. **`Studio.tsx`** : Supprimer les `defaultValue` en conflit avec `value`
5. **`Signup.tsx`** : Ajouter un update du profil avec `field_of_study` apres le signup reussi
6. **`delete-account`** : Ajouter la suppression des tables manquantes
7. **`Contact.tsx`** : Traduire le message rate limit
8. **`Navbar.tsx`** : Ajouter Export en desktop nav
9. **`generate-quiz`** : Adapter le prompt a la langue de l'utilisateur

**Ne PAS implementer** (necessite decision produit) :
- Changement domaine canonical/OG
- Social proof : decision de les rendre dynamiques ou les retirer
- Onglet University dans League

**Ne PAS implementer** (necessite verification backend) :
- Correction des policies RLS RESTRICTIVE vs PERMISSIVE — necessite une migration DB avec verification approfondie
- Policy publique sur profiles — necessite migration DB

---

## 6. COMPTE-RENDU

### Corrections a effectuer (approuvees pour implementation) :
- 9 corrections frontend + edge functions listees ci-dessus
- 2 migrations DB (profiles policy publique, delete-account cleanup)

### Elements restants apres corrections :
- Verification mode live/test Stripe
- Decision domaine final (studybeats.app vs learn-jams.lovable.app)
- Social proof hardcode
- Monitoring/Sentry
- Rate limiting serveur
- Onglet University League

### Prochaines etapes recommandees avant go-live :
1. Implementer les correctifs P0 et P1
2. Configurer le domaine custom si `studybeats.app` est le domaine final
3. Verifier que le Stripe price ID est en mode live
4. Ajouter un service de monitoring
5. Test E2E complet avec un vrai compte (inscription → creation → ecoute → quiz → export)

