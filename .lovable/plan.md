

# Plan : Mettre en avant les 5 fonctionnalites sur la homepage

## Constat

La homepage actuelle a une section "Ce que tu obtiens" avec seulement 3 features generiques (Quiz, Import, Securite). Les 5 fonctionnalites differenciantes (Subject Selector, Collaborative Studio, European League, Accessibilite, LMS Export) ne sont **pas du tout mentionnees** sur la homepage.

## Plan

### 1. Ajouter une nouvelle section "Plateforme complete" sur la homepage

Inserer une section dediee entre les Testimonials et la section Features existante, avec une grille de 5 cartes visuelles, chacune representant une fonctionnalite cle :

| # | Fonctionnalite | Icone | CTA |
|---|---------------|-------|-----|
| 1 | Selecteur de matiere | GraduationCap | → /signup |
| 2 | Studio collaboratif | Users | → /studio |
| 3 | European League | Trophy | → /league |
| 4 | Accessibilite | Accessibility | Ouvre le panel |
| 5 | Export LMS/SCORM | BookOpen | → /export |

Design : cartes glass-card-elevated avec icone gradient, titre, description courte, et un lien/bouton. Layout en grille 2+3 ou 5 colonnes sur desktop, 1 colonne mobile.

### 2. Enrichir la section Features existante

Remplacer les 3 features actuelles par les 5 nouvelles (plus differenciantes) ou garder les 3 existantes et ajouter les 5 en section separee. **Choix : section separee** pour ne pas perdre les features existantes (Quiz, Import, RGPD).

### 3. Ajouter les traductions FR + EN

Ajouter dans `fr.json` et `en.json` les cles `home.platform_title`, `home.platform_subtitle`, et `home.platform[1-5]_title` / `home.platform[1-5]_desc` / `home.platform[1-5]_cta`.

### 4. Fichiers modifies

- `src/pages/Index.tsx` — nouvelle section avec 5 cartes
- `src/i18n/locales/fr.json` — traductions FR
- `src/i18n/locales/en.json` — traductions EN

