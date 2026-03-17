

## Probleme actuel

Les logs console montrent deux warnings **forwardRef** :
1. **`Footer`** — utilisé dans `Index.tsx` et ~20 autres pages, reçoit une ref implicite (probablement via un parent `motion` ou `AnimatePresence`)
2. **`SeedLibraryGrid`** — utilisé dans `SeedDemoSection.tsx`, même pattern

Ce ne sont pas des erreurs bloquantes mais des warnings React qui polluent la console.

## Plan

### Partie 1 — Corriger les warnings forwardRef (2 fichiers)

**`src/components/Footer.tsx`** : Convertir en `forwardRef` + `displayName`
```tsx
const Footer = forwardRef<HTMLElement>((props, ref) => { ... });
Footer.displayName = "Footer";
export default Footer;
```

**`src/components/product/SeedLibraryGrid.tsx`** : Convertir en `forwardRef` + `displayName`
```tsx
export const SeedLibraryGrid = forwardRef<HTMLDivElement, SeedLibraryGridProps>(
  ({ seeds, loading, onStartSeed }, ref) => { ... }
);
SeedLibraryGrid.displayName = "SeedLibraryGrid";
```

### Partie 2 — Upgrade immersif de la scène 3D (5 fichiers)

L'infrastructure 3D existante est solide (rooms, nodes, camera, performance adaptive) mais l'expérience visuelle reste basique : géométries primitives, pas de post-processing, particules limitées, pas d'effets atmosphériques avancés.

**A. `Adaptive3DScene.tsx` — Post-processing conditionnel**
- Ajouter `@react-three/postprocessing` (Bloom, Vignette, ChromaticAberration) en mode `full_3d`
- Environment map via `<Environment preset="night" />` de drei pour des reflets réalistes
- Tone mapping cinématique (ACESFilmic)

**B. `LearningRoom3D.tsx` — Atmosphère premium**
- Sol : remplacement du plan basique par un shader custom avec grid animée (style hologramme/Tron)
- Murs : ajout d'un effet de scan-line animé (bande de lumière qui parcourt les murs)
- Particules : augmenter le budget (100→300 en full_3d), ajouter des fireflies avec mouvement organique
- Portal effect entre les salles : anneau lumineux animé à l'entrée/sortie
- Ambient sound cues visuels : ondes concentriques qui émanent des objets interactifs

**C. `ConceptNode3D.tsx` — Nodes vivants**
- Remplacer les sphères simples par des nodes avec shader Fresnel (lueur de bord)
- Ajouter des particules orbitales autour des nodes gate/synthesis (au lieu d'un simple torus)
- Connexions entre nodes : lignes animées avec dash pattern (flux de données visuel)
- Effet de "reveal" quand un concept passe de locked→available : explosion de particules

**D. `ImmersiveMissionScene.tsx` — Transitions cinématiques**
- Transition entre rooms : fondu + zoom-out/zoom-in avec motion blur
- Entrée en scène : caméra cinématique (dolly shot) à l'ouverture
- Background : skybox dynamique qui évolue avec la progression (plus lumineux au fur et à mesure)

**E. Nouveau fichier : `src/components/cognitio/immersive/ShaderEffects.tsx`**
- Shader holographique réutilisable (grid + scan-lines + glow)
- Shader Fresnel pour les nodes
- Shader portal (distortion circulaire)
- Tous conditionnels au renderMode pour ne pas impacter les performances

### Partie 3 — Prompt Claude Code mis à jour

```text
## Règles Cognitio — 3D, Refs, Pipeline

1. FORWARD REF : Tout composant susceptible d'être wrappé par motion/Radix/Slot 
   DOIT utiliser forwardRef + displayName. Inclut Footer, grids, cards custom.
2. POST-PROCESSING : Conditionnel au renderMode full_3d uniquement. 
   Toujours vérifier canUsePostProcessing() avant d'ajouter Bloom/Vignette.
3. SHADERS : Tous les custom shaders doivent avoir un fallback meshStandardMaterial 
   pour lite_3d/pseudo_3d. Jamais de shader obligatoire.
4. PARTICULES : Respecter profile.particle_budget. Ne jamais dépasser. 
   Utiliser useFrame + buffer updates (pas de nouveaux objets chaque frame).
5. R3F : <primitive object={new THREE.Line(...)} /> pour les lignes. 
   Versions : @react-three/fiber@^8, @react-three/drei@^9, three@^0.169.
6. SAFETY GUARD NETTOYAGE : Fallback texte original si nettoyage supprime >70%.
7. SUPABASE : .insert([{...}]) format tableau. Ne pas éditer client.ts/types.ts.
8. EDGE FUNCTIONS : catch (err: unknown) + instanceof Error. "deflate-raw" pour Deno.
```

### Dépendance npm à ajouter

- `@react-three/postprocessing@^2.16` (compatible avec R3F v8 + three 0.169)

