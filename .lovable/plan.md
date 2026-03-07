

## Audit : internationalisation complète de StudyBeats

### Constat

L'infrastructure i18n est en place (7 langues, détection auto, sélecteur) et les fichiers de traduction sont complets. Cependant, **presque aucune page ne consomme les traductions**. Seuls 3 composants utilisent `useTranslation` : Navbar, StylePicker, LanguageSelector.

**Pages avec texte français en dur (non internationalisées) :**
- `Index.tsx` — toute la landing (hero, FAQ, science, steps, CTA, etc.)
- `Footer.tsx` — liens, descriptions, copyright
- `Login.tsx` — formulaire, erreurs
- `Signup.tsx` — formulaire, CGU
- `ForgotPassword.tsx` / `ResetPassword.tsx`
- `Create.tsx` — labels, toasts, étapes
- `Library.tsx` — titres, statuts, recherche, états vides
- `Player.tsx` — contrôles, paroles, messages
- `Quiz.tsx` — questions, résultats, score
- `Profile.tsx` — formulaire, suppression compte
- `About.tsx` — contenu complet
- `Contact.tsx` — formulaire, FAQ
- `Terms.tsx` / `Privacy.tsx` — titres
- `NotFound.tsx`

**Edge function `generate-lyrics`** : le prompt système est en français, sans adaptation à la langue de l'utilisateur.

**Aussi manquant** : les nouvelles sections de la landing (science, "écoute partout") n'ont pas de clés de traduction dans les fichiers JSON.

### Plan d'implémentation

#### 1. Compléter les fichiers de traduction (7 fichiers JSON)
Ajouter les clés manquantes pour les nouvelles sections (science, "écoute partout", FAQ renforcée) dans les 7 locales. Mettre à jour `footer.styles_count` de "8" à "30".

#### 2. Internationaliser toutes les pages (13 fichiers .tsx)
Pour chaque page : importer `useTranslation`, remplacer chaque chaîne en dur par `t("clé")`. Fichiers concernés :
- `Index.tsx` — le plus gros chantier (~50 chaînes)
- `Footer.tsx`
- `Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`
- `Create.tsx`
- `Library.tsx`
- `Player.tsx`
- `Quiz.tsx`
- `Profile.tsx`
- `About.tsx`
- `Contact.tsx`
- `Terms.tsx`, `Privacy.tsx`, `NotFound.tsx`

#### 3. Adapter le prompt de génération de paroles à la langue de l'UI
- Modifier `Create.tsx` pour envoyer `i18n.language` dans le body de l'appel à `generate-lyrics`
- Modifier `generate-lyrics/index.ts` pour recevoir `language` et adapter le prompt système (écrire les paroles dans la langue demandée)

#### 4. Vérifications fonctionnelles
- Tester le changement de langue sur la landing, la bibliothèque et le flow de création
- Vérifier le support RTL (arabe) sur les pages principales

