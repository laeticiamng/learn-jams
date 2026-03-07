

# 🎵 StudyBeats — Transforme tes cours en musique

**Concept** : Une plateforme révolutionnaire où n'importe quel étudiant peut uploader son cours (texte, PDF, photo) et le transformer en chanson avec l'IA pour mémoriser en écoutant.

---

## Pages & Navigation

### 1. Landing Page (/)
- Hero accrocheur : "Transforme tes cours en hits 🎧"
- Animation visuelle : texte qui se transforme en ondes sonores
- 3 étapes illustrées : Upload → Style → Écoute
- CTA "Commencer gratuitement"
- Témoignages / stats fictives

### 2. Authentification (/login, /signup, /reset-password)
- Inscription / connexion email via Supabase Auth
- Profil utilisateur avec table `profiles` (nom, avatar, filière d'études)

### 3. Créer une chanson (/create) — Page principale
**Étape 1 — Upload du cours :**
- Zone de texte (copier-coller)
- Upload PDF avec extraction de texte (edge function)
- Upload image/photo avec OCR (edge function)
- Prévisualisation du texte extrait, possibilité de l'éditer

**Étape 2 — Choix du style musical :**
- Grille visuelle de styles : Rap, Lo-Fi, Pop, Jazz, Rock, Spoken Word, Reggaeton, Classique
- Chaque style avec icône, couleur et mini description
- Option "Instrumental" (musique sans paroles, juste le texte en TTS par-dessus)

**Étape 3 — Génération :**
- Résumé IA du texte pour créer des paroles optimisées (edge function avec Lovable AI)
- Envoi à Suno API pour génération musicale (edge function)
- Barre de progression animée pendant la génération
- Prévisualisation immédiate une fois prêt

### 4. Lecteur musical (/player/:id)
- Interface lecteur immersive (inspirée de Spotify)
- Paroles synchronisées avec surlignage en temps réel
- Contrôles : play/pause, skip, volume, barre de progression
- Boutons : Ajouter aux favoris ❤️, Partager, Rejouer

### 5. Bibliothèque personnelle (/library)
- Toutes les chansons générées par l'utilisateur
- Filtres : par matière, date, style musical
- Favoris
- Recherche

### 6. Profil & Paramètres (/profile)
- Infos personnelles
- Statistiques d'écoute (temps total, nombre de chansons)
- Gestion de compte

---

## Backend (Supabase / Lovable Cloud)

### Tables
- `profiles` — nom, avatar, filière
- `songs` — titre, texte original, paroles générées, style, audio_url, user_id
- `favorites` — user_id, song_id

### Edge Functions
- `extract-pdf` — Extraction de texte depuis un PDF uploadé
- `extract-image` — OCR sur photo de cours
- `generate-lyrics` — Résumé IA du cours → paroles musicales optimisées
- `generate-music` — Appel à Suno API pour créer la chanson
- `check-generation-status` — Polling du statut de génération Suno

### Storage
- Bucket `course-uploads` — PDFs et images uploadés

---

## Design & UX
- Design moderne avec dégradés violet/bleu (ambiance musicale)
- Animations fluides sur les transitions entre étapes
- Mode sombre par défaut
- Responsive mobile-first
- Micro-interactions sur les boutons et cards

