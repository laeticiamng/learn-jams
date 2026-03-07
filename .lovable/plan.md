

## Plan : Internationaliser le composant CourseUploader

### Constat
Après audit complet de toutes les pages et composants, **un seul fichier** contient encore du texte hardcodé en français : `src/components/create/CourseUploader.tsx`.

Il y a environ 15 chaînes non traduites :
- Onglets : "Texte", "PDF", "Image / Photo"
- Messages d'erreur et de succès : "Fichier trop volumineux", "Texte extrait de...", "Aucun texte extrait", etc.
- Labels d'upload : "Upload ton PDF de cours", "Glisse ton PDF ici...", "Photo de notes, diapos..."
- Boutons : "Voir le texte", "Recommencer", "Supprimer"
- Compteur : "caractères · ~X min de lecture"

Toutes les autres pages (Index, Login, Signup, ForgotPassword, ResetPassword, Create, Library, Player, Quiz, Profile, Contact, About, Terms, Privacy, Pricing, NotFound, Navbar, Footer) sont déjà 100% internationalisées.

### Changements prévus

**1. Ajouter les clés `create.uploader_*` dans les 7 fichiers de locale** (`fr.json`, `en.json`, `de.json`, `es.json`, `ar.json`, `zh.json`, `hi.json`)

Clés à ajouter :
- `create.tab_text`, `create.tab_pdf`, `create.tab_image`
- `create.file_too_large`
- `create.extracted_from` (avec interpolation `{{file}}`)
- `create.no_text_extracted`
- `create.extract_success` (avec interpolation `{{file}}`)
- `create.extract_error`
- `create.textarea_placeholder`
- `create.extracting`
- `create.pdf_analyzing`, `create.image_analyzing`
- `create.extract_done`
- `create.view_text`, `create.restart`, `create.delete`
- `create.upload_pdf_label`, `create.upload_image_label`
- `create.upload_pdf_hint`, `create.upload_image_hint`
- `create.char_count` (avec interpolation `{{chars}}`, `{{minutes}}`)

**2. Mettre à jour `CourseUploader.tsx`** pour utiliser `useTranslation()` et remplacer chaque chaîne hardcodée par `t("create.xxx")`.

