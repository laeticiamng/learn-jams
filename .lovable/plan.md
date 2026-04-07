

# Analyse complète du repo COGNITIO — Eléments manquants

## Etat actuel
Le repo est mature : 28 pages, 39 edge functions, 67 tables, i18n, PWA manifest, SEO, auth, billing, escape games, pipeline Cognitio. L'infrastructure est solide.

## Eléments manquants identifiés

### 1. Navigation mobile (Bottom Tab Bar)
Pas de barre de navigation fixe en bas pour mobile. Les utilisateurs connectés doivent ouvrir le menu hamburger pour naviguer. Sur mobile, c'est un frein UX majeur.

**Action** : Créer un composant `MobileBottomNav` avec 4-5 onglets (Créer, Missions, Révision, Profil) affiché uniquement sur mobile pour les utilisateurs connectés.

### 2. Upload d'avatar sur le profil
Le profil affiche uniquement la première lettre du nom (ligne 185). Pas de possibilité d'uploader une photo de profil alors que `avatar_url` existe dans la table `profiles` et que le composant `Avatar` UI est disponible.

**Action** : Ajouter un upload d'avatar avec stockage dans le bucket existant `course-uploads` (ou un sous-dossier dédié), mise à jour de `avatar_url` dans `profiles`.

### 3. Changement de mot de passe depuis le profil
`updatePassword` existe dans `useAuth` mais n'est accessible que via `/reset-password` (flux email). Aucun moyen de changer son mot de passe depuis le profil.

**Action** : Ajouter une section "Sécurité" dans la page Profil avec un formulaire de changement de mot de passe.

### 4. Streak / Gamification quotidienne
Pas de système de streak quotidien. La page League existe avec des points mais il n'y a pas de motivation quotidienne (connexion consécutive, objectifs journaliers).

**Action** : Créer un composant `DailyStreakBanner` affiché sur le profil et dans la navbar, qui track les jours consécutifs d'activité.

### 5. Service Worker pour le PWA
Le `manifest.json` existe mais aucun service worker n'est enregistré. L'app n'est donc pas vraiment installable ni utilisable offline.

**Action** : Ajouter un service worker minimal avec cache des assets statiques et enregistrement dans `main.tsx`.

### 6. Page de partage social
Pas de fonctionnalité de partage de ses résultats ou missions. Aucun bouton "Partager" nulle part.

**Action** : Créer un composant `ShareButton` réutilisable (Web Share API avec fallback copie de lien) et l'intégrer dans Player, MissionDebrief et le Profil.

### 7. Sitemap dynamique (pages login/signup manquantes)
Le sitemap est statique et n'inclut pas `/login` et `/signup` qui sont des pages publiques importantes pour le SEO.

**Action** : Ajouter `/login` et `/signup` au sitemap.xml.

### 8. Fix des 2 warnings RLS "always true"
Les politiques INSERT sur `contact_messages` sont intentionnelles (formulaire public). Les warnings du linter concernent ces 2 politiques. Pas d'action requise — c'est un faux positif documenté.

---

## Plan d'implémentation (par priorité)

### Etape 1 — Mobile Bottom Nav
- Créer `src/components/MobileBottomNav.tsx`
- 4 onglets : Créer, Missions, Révision, Profil
- Icônes + labels, highlight actif, affiché uniquement `md:hidden` + user connecté
- Intégrer dans `App.tsx` après les Routes

### Etape 2 — Avatar upload sur le profil
- Ajouter un input file sur le cercle avatar dans `Profile.tsx`
- Upload vers `course-uploads/avatars/{userId}.webp`
- Mettre à jour `profiles.avatar_url`
- Afficher l'image dans le Navbar et le Profil

### Etape 3 — Changement de mot de passe
- Ajouter une section "Sécurité" dans `Profile.tsx`
- Formulaire : mot de passe actuel (optionnel), nouveau mot de passe, confirmation
- Appel à `updatePassword` de `useAuth`

### Etape 4 — Service Worker PWA
- Créer `public/sw.js` avec cache des assets statiques
- Enregistrer dans `index.html` ou `main.tsx`

### Etape 5 — Bouton de partage
- Créer `src/components/ShareButton.tsx` avec Web Share API + fallback clipboard
- Intégrer dans `Player.tsx` et `MissionDebrief.tsx`

### Etape 6 — Streak quotidien
- Migration SQL : table `daily_streaks` (user_id, current_streak, longest_streak, last_active_date)
- Hook `useDailyStreak` qui met à jour le streak à chaque visite
- Composant `StreakBadge` affiché dans le Profil

### Etape 7 — Sitemap update
- Ajouter `/login` et `/signup` au `sitemap.xml`

---

## Détails techniques

**Fichiers créés** :
- `src/components/MobileBottomNav.tsx`
- `src/components/ShareButton.tsx`
- `src/components/StreakBadge.tsx`
- `src/hooks/useDailyStreak.ts`
- `public/sw.js`
- Migration SQL pour `daily_streaks`

**Fichiers modifiés** :
- `src/App.tsx` (ajout MobileBottomNav)
- `src/pages/Profile.tsx` (avatar upload, mot de passe, streak)
- `src/components/Navbar.tsx` (avatar + streak badge)
- `src/pages/Player.tsx` (bouton partage)
- `src/pages/MissionDebrief.tsx` (bouton partage)
- `public/sitemap.xml`
- `index.html` (enregistrement SW)

