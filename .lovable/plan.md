

## Audit UX/Marketing — Landing Page StudyBeats (vue directeur marketing senior)

### Constat global
La page est fonctionnelle, traduite, et le dark mode est coherent. Le positionnement "neurosciences + musique" est clair. Cependant, plusieurs faiblesses nuisent a la conversion, a la lisibilite et a la credibilite. Voici le diagnostic section par section.

---

### 1. NAVBAR (mobile critique)
- **Probleme** : sur mobile (390px), les items "Pricing", "Sign in" et le bouton "Sign up" se tassent sur une seule ligne, le bouton Sign up est coupe a droite.
- **Correction** : ajouter un **hamburger menu mobile** (sheet/drawer) qui regroupe les liens de navigation. Ne garder que le logo + le bouton CTA principal visible sur mobile.

### 2. HERO — Above the fold
- **Badge** : "Music-based memorization backed by neuroscience — free" => le mot "free" contredit le pricing a 14.90 EUR. **Supprimer "free"** ou reformuler en "start free" / "try free".
- **Sous-titre** : trop long (3 lignes desktop, 8 lignes mobile). **Reduire a 1-2 lignes**. Ex: "Upload your notes, pick a style, and AI turns them into songs you'll memorize effortlessly."
- **CTA secondaire** : "I already have an account" n'est pas un CTA marketing — c'est un lien utilitaire. Le reduire visuellement (texte link plutot que bouton outline pleine largeur).
- **Audio wave** : l'animation est **alignee a gauche** et non centree. Corriger le centrage (`justify-center`).
- **Social proof manquante** : zero temoignage, zero chiffre, zero logo. Ajouter au minimum un compteur ("1 200+ chansons generees") ou des avatars utilisateurs.

### 3. SECTION "EN BREF"
- Redondante avec le sous-titre hero. **Fusionner ou supprimer** pour raccourcir le scroll.

### 4. SECTION SCIENCE (4 cartes)
- Bonne structure, mais les textes sont tres longs (paragraphes de 3-4 lignes). Pour du marketing, **limiter a 2 lignes max par carte**.
- Les icones sont generiques (Brain, Repeat, Timer, Dumbbell). Envisager des illustrations ou des emojis plus evocateurs.

### 5. SECTION "HOW IT WORKS" (3 etapes)
- Correct visuellement. Manque une **fleche ou un connecteur visuel** entre les etapes pour guider l'oeil.
- Le spacing vertical entre la section Science et celle-ci est trop grand (py-24 + py-24 = ~200px de vide). Reduire a py-16.

### 6. SECTION "LISTEN ANYWHERE"
- OK structurellement. Les emojis fonctionnent bien comme accroche visuelle.

### 7. SECTION "WHO IS IT FOR"
- Les 4 cartes cible sont statiques (pas de `motion`), contrairement aux autres sections. **Ajouter une animation d'entree** pour la coherence.
- Les emojis sont hardcodes dans le JSX au lieu de venir des traductions — incoherent avec la section Listen qui utilise `t()` pour les emojis.

### 8. SECTION "WHAT YOU GET" (3 features)
- Trop generique. "Interactive quiz", "Smart import", "Secure data" — ces features devraient etre **au-dessus dans le funnel**, pas en bas de page.
- Deplacer cette section juste apres le Hero ou apres "How it works".

### 9. FAQ
- 8 questions c'est beaucoup. Les 3-4 premieres suffisent pour une landing. Les autres peuvent aller sur une page dediee.
- **FAQ7** dit "14.90 EUR/month, no commitment" mais le badge hero dit "free". Incoherence a corriger.

### 10. CTA FINAL
- "Create my free account" => meme incoherence avec le pricing. Si le produit est payant, dire "Start now" ou "Try StudyBeats".
- Manque un **element d'urgence ou de benefice** ("Join 1,000+ students already using StudyBeats").

### 11. FOOTER
- Propre et bien traduit. RAS.

### 12. PRICING PAGE
- Le prix "14,90" utilise une virgule (format FR) meme en anglais. **Adapter au format de la locale** (14.90 en EN).
- Pas de comparaison gratuit vs pro. Ajouter une ligne "Free tier" pour contextualiser.

### 13. PERFORMANCE / TECHNIQUE
- `AudioWave` recalcule `Math.random()` a chaque render, ce qui cree des hauteurs differentes si le composant re-render. Memoiser les valeurs.
- Le `<script type="application/ld+json">` est dans le JSX React — il ne sera pas vu par les crawlers qui ne font pas de JS rendering. Utiliser `useEffect` + `document.head.appendChild` ou react-helmet.

---

### Plan d'implementation (priorise par impact conversion)

| Priorite | Action | Fichiers |
|----------|--------|----------|
| P0 | Hamburger menu mobile | `Navbar.tsx` |
| P0 | Supprimer "free" du badge / harmoniser avec pricing | `fr.json`, `en.json` + 5 locales |
| P0 | Raccourcir le sous-titre hero (1-2 lignes) | 7 locales |
| P1 | Centrer l'AudioWave | `Index.tsx` |
| P1 | Ajouter social proof (compteur ou avatars) | `Index.tsx` + 7 locales |
| P1 | Reduire les textes des cartes Science a 2 lignes | 7 locales |
| P1 | Remonter la section Features apres Steps | `Index.tsx` |
| P2 | Animer les cartes Target (motion) | `Index.tsx` |
| P2 | Adapter le format du prix par locale (14.90 vs 14,90) | `Pricing.tsx` |
| P2 | Deplacer le JSON-LD dans le head | `Index.tsx` |
| P2 | Reduire la FAQ a 4-5 questions | `Index.tsx` |
| P3 | Fusionner ou supprimer la section "En bref" | `Index.tsx` |
| P3 | Ajouter des connecteurs visuels entre les 3 etapes | `Index.tsx` |

