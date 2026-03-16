# Audit Escape Game Pedagogique — Analyse Complete

> Audit realise sur la base du code source (Mars 2026)
> Comparaison avec les standards des escape games professionnels et les principes scientifiques de memorisation

## Sources de reference

- Nicholson S., *Creating Engaging Escape Rooms for the Classroom*, 2018
- Nicholson S., *Peeking Behind the Locked Door*, 2015
- Roediger & Karpicke, *Test-enhanced learning*, Psychological Science, 2006
- Wouters et al., *Meta-analysis of serious games*, Journal of Educational Psychology, 2013
- Mayer R., *Multimedia Learning*, Cambridge University Press
- Shohamy & Adcock, *Dopamine and memory*, Neuron, 2010

---

## 1. Ce que la plateforme fait deja (forces identifiees dans le code)

### Architecture mission complete

| Element | Fichier source | Status |
|---------|---------------|--------|
| Types escape game complets (14 brick types) | `domain/cognitio/escapeGame.types.ts` | Implemente |
| 8 familles de missions | `escapeGame.types.ts:30-41` | Implemente |
| 7 niveaux d'audience (college → adult_pro) | `escapeGame.types.ts:45-55` | Implemente |
| Profils univers adaptes par audience | `escapeGame.types.ts:59-69` | Implemente |
| 24 sous-themes narratifs (3 par famille) | `escapeGame.types.ts:203-580` | Implemente |
| Selection intelligente sous-theme/famille | `escapeGame.types.ts:586-777` | Implemente |

### Moteur de mission

| Element | Fichier source | Status |
|---------|---------------|--------|
| Blueprint engine complet | `services/cognitio/missionBlueprintEngine.ts` | Implemente |
| Filtrage bruit documentaire P0 | `missionBlueprintEngine.ts:72-165` | Implemente |
| Construction salles thematiques | `missionBlueprintEngine.ts:321-356` | Implemente |
| Boss final multi-brick | `missionBlueprintEngine.ts:358-387` | Implemente |
| Validation post-build (sanitization) | `missionBlueprintEngine.ts:263-283` | Implemente |
| Sequence brick progressive (OBS→...→DECISION) | `missionBlueprintEngine.ts:446-462` | Implemente |

### Systeme de hints progressifs

| Element | Fichier source | Status |
|---------|---------------|--------|
| 3 niveaux d'indices (nudge → reveal) | `services/cognitio/missionHintEngine.ts:41-67` | Implemente |
| Auto-trigger adaptatif Bloom | `missionHintEngine.ts:72-103` | Implemente |
| Penalites progressives (0.1 → 0.25 → 0.5) | `missionHintEngine.ts:47-65` | Implemente |
| Hints contextuels par brick type | `missionHintEngine.ts:144-198` | Implemente |

### Run lifecycle & scoring

| Element | Fichier source | Status |
|---------|---------------|--------|
| Create / save / resume / complete / abandon | `services/cognitio/missionRunService.ts` | Implemente |
| Score composite (accuracy, calibration, bloom, traps) | `missionRunService.ts:243-287` | Implemente |
| Debrief avec arbre d'erreurs | `missionRunService.ts:291-340` | Implemente |
| Detection zones de surconfiance | `missionRunService.ts:316-323` | Implemente |
| Plan de revision par concept | `missionRunService.ts:326-330` | Implemente |

### Profils univers par domaine

| Element | Fichier source | Status |
|---------|---------------|--------|
| 12 profils domaine (medecine, droit, info, etc.) | `services/cognitio/missionUniverseProfiles.ts:52-266` | Implemente |
| ChallengeType specifique (10 types) | `missionUniverseProfiles.ts:28-38` | Implemente |
| UI flavor par domaine (clinical, courtroom, terminal...) | `missionUniverseProfiles.ts:40` | Implemente |
| Ajustement par niveau audience | `missionUniverseProfiles.ts:273-310` | Implemente |

### UI de jeu

| Element | Fichier source | Status |
|---------|---------------|--------|
| MissionPlayerLayout (intro→rooms→boss→end) | `components/cognitio/MissionPlayerLayout.tsx` | Implemente |
| MissionRoom (question + options + confiance) | `components/cognitio/MissionRoom.tsx` | Implemente |
| MissionBossView (header boss + multi-brick) | `components/cognitio/MissionBossView.tsx` | Implemente |
| Timer, progression, transitions animees | MissionPlayerLayout + MissionRoom | Implemente |

### Pedagogie cognitive

| Element | Fichier source | Status |
|---------|---------------|--------|
| Active recall (slider confiance) | `MissionRoom.tsx:152-172` | Implemente |
| Taxonomie de Bloom (6 niveaux) | `domain/cognitio/types.ts:53-59` | Implemente |
| Contrat pedagogique (budget cognitif) | `types.ts:267-288` | Implemente |
| Ancres visuelles (metaphore, mnemotechnique) | `types.ts:290-294` | Implemente |
| Tests de rappel (inline, final, J1, J7) | `types.ts:362-390` | Implemente |
| Noeud de connaissance apprenant | `types.ts:414-427` | Implemente |

---

## 2. Analyse des manques — comparaison escape game professionnel

### PRIORITE P0 — Critique pour l'experience escape game

#### 2.1 Puzzles logiques veritables

**Constat actuel**: Les 5 brick types de base (`OBSERVATION`, `TRI`, `SEQUENCE`, `ELIMINATION`, `DECISION`) sont essentiellement des QCM deguises. Le joueur choisit parmi des options pre-generees.

**Standard escape game**: Resolution d'enigmes concretes (deduction, combinaison, observation).

**Types etendus declares mais pas implementes dans le gameplay**:
Les 14 `ESCAPE_BRICK_TYPES` dans `escapeGame.types.ts:9-24` (dont `CODE_RECONSTRUCT`, `LOCK_LOGIC`, `PUZZLE_STEPS`, `DECISION_TREE`) sont declares mais **non utilises** dans le `missionBlueprintEngine.ts` qui n'utilise que les 5 types de base.

**Recommandation**: Implementer les mecaniques de gameplay pour les 9 brick types etendus:
- `CODE_RECONSTRUCT`: reconstituer un texte/code a partir de fragments
- `LOCK_LOGIC`: combinaison logique pour "ouvrir un verrou"
- `PUZZLE_STEPS`: chaine d'etapes dependantes
- `DECISION_TREE`: arbre de decision interactif
- `ASSOCIATION`: relier paires concept-definition par drag-and-drop
- `TRAP_DISTINCTION`: distinguer piege vs verite
- `ERROR_IDENTIFICATION`: trouver l'erreur dans un document/schema
- `ORDERING`: ordonner des elements (timeline, protocole)
- `COMPLETION`: texte a trous

#### 2.2 Puzzles multi-etapes (chaines d'enigmes)

**Constat actuel**: Chaque item est independant. Structure:
```
atelier → validation → feedback → suivant
```

**Standard escape game**: Chaines d'enigmes ou le resultat d'un puzzle sert d'input au suivant:
```
indice → puzzle → objet → puzzle → code → porte
```

**Dans le code**: `MissionStage.puzzles` dans `escapeGame.types.ts:107-116` a le champ `puzzles: EscapePuzzle[]` mais sans notion de dependance entre puzzles. Chaque puzzle est atomique.

**Recommandation**: Ajouter un champ `depends_on?: string` (puzzle ID) et `unlock_key?: string` dans `EscapePuzzle` pour creer des chaines. Le moteur de jeu devrait verifier les pre-requis avant d'afficher un puzzle.

#### 2.3 Inventaire fonctionnel

**Constat actuel**: Aucun systeme d'inventaire interactif dans le code. Les `MissionItem` sont des questions, pas des objets manipulables.

**Standard escape game**: Objets collectes qui servent a resoudre d'autres puzzles (cle → porte, scanner → analyse indice, fragments → puzzle final).

**Recommandation**: Creer un type `InventoryItem` avec:
- `id`, `name`, `description`, `icon`
- `usable_in_puzzles: string[]` (IDs des puzzles ou l'objet peut etre utilise)
- `obtained_from_puzzle: string` (ID du puzzle qui l'accorde)
- `combined_with?: string[]` (IDs d'objets combinables)

#### 2.4 Meta-puzzle final

**Constat actuel**: Le boss final est un ensemble de questions independantes utilisant les 3 brick types (`TRI`, `DECISION`, `ELIMINATION`). Cf. `missionBlueprintEngine.ts:369`.

**Standard escape game**: Le boss devrait etre un meta-puzzle qui **assemble les connaissances** de toutes les salles.

**Recommandation**: Le `FinalChallenge` dans `escapeGame.types.ts:139-148` a la bonne structure mais n'est pas utilise — le `missionBlueprintEngine` construit un `MissionBossRoom` standard. Implementer la logique de `FinalChallenge` avec:
- Puzzles qui referencent des concepts de TOUTES les salles
- Mecaniques differentes de celles vues dans les salles
- Synthese narrative ("assembler les fragments")

#### 2.5 Exploration et indices caches

**Constat actuel**: Le contenu est presente directement. Parcours lineaire: salle 1 → salle 2 → ... → boss. Pas d'exploration.

**Standard escape game**: Chercher les indices, decouvrir des elements caches, explorer l'environnement.

**Recommandation**:
- Ajouter des "cliquables" dans le contexte narratif (mots-cles, images)
- Indices caches dans la description narrative (reveles au hover/click)
- Elements optionnels qui donnent un bonus mais ne sont pas obligatoires
- "Fog of war" sur les salles non visitees (la structure existe dans le MissionProgressBar mais pas l'exploration libre)

---

### PRIORITE P1 — Important pour l'immersion et la retention

#### 2.6 Narration progressive et surprises

**Constat actuel**: La narration existe (sub-themes avec `intro`, `roomNarratives`, `bossIntro`). C'est tres bien. Mais c'est statique — le meme texte s'affiche quelle que soit la performance du joueur.

**Recommandation**:
- Narration reactive a la performance (encouragements si bon, suspense si mediocre)
- Revelations narratives a certains seuils (ex: a 60% de completion, un "twist" narrative)
- Elements lore decouverts en bonus (notes, journaux, documents)

#### 2.7 Variete des mecaniques de gameplay

**Constat actuel**: Le gameplay UI est uniquement du choix parmi options (`MissionRoom.tsx:107-149`). Meme avec les 5 brick types differents, l'interaction est identique: cliquer sur une option.

**Recommandation**: Implementer des widgets UI differents par brick type:
- `SEQUENCE` / `ORDERING`: drag-and-drop pour ordonner
- `ASSOCIATION`: relier par lignes (match pairs)
- `COMPLETION`: texte a trous avec input libre
- `CODE_RECONSTRUCT`: assembler des blocs de code/texte
- `ERROR_IDENTIFICATION`: cliquer sur l'element fautif dans un document

#### 2.8 Tension et contraintes cognitives

**Constat actuel**: Timer present (`MissionRoom.tsx:83-88`) et `time_limit_sec` calcule avec facteur de tension (`missionBlueprintEngine.ts:528-533`).

**Manques**:
- Pas de consequence reelle au depassement du temps (le timer tourne mais n'expire jamais)
- Pas de systeme d'energie/vies
- Pas de penalite d'erreur (on peut juste reessayer)

**Recommandation**:
- Implementer l'expiration du timer (auto-submit ou passage au puzzle suivant)
- Ajouter un systeme d'energie optionnel (3 erreurs = indice force)
- Feedback de tension progressive (changement couleur timer, musique/son)
- **Attention**: ne pas surstresser — Mayer (2009) montre que le stress excessif nuit a l'apprentissage

#### 2.9 Difficulte progressive verifiable

**Constat actuel**: `difficulty_ramp: number` dans `MissionStage` et `difficulty: number` dans `EscapePuzzle`. La sequence de bricks va de OBSERVATION → DECISION. Le `missionBlueprintEngine` distribue les concepts par index proportionnel.

**Manque**: Pas de verification que la difficulte augmente effectivement. Les concepts sont distribues par index sequentiel, pas par niveau de difficulte.

**Recommandation**: Trier les concepts par difficulte croissante avant distribution dans les salles.

#### 2.10 Recompenses emotionnelles dietetiques

**Constat actuel**: Feedback correct/incorrect basique (`MissionRoom.tsx:191-207`). Score composite en fin de mission.

**Standard escape game**: Dopamine peaks a chaque decouverte (Shohamy & Adcock, 2010).

**Recommandation**:
- Animations de celebration a chaque salle completee
- Transformation visuelle de l'environnement au fil de la progression
- Revelations narratives comme recompense ("Vous decouvrez un passage secret...")
- Badges/trophees contextuels ("Diagnosticien hors pair", "Zero erreur sur le triage")

---

### PRIORITE P2 — Optimisations pour la memorisation maximale

#### 2.11 Spaced repetition integree

**Constat actuel**: `RepetitionPlan` (`types.ts:283-288`) avec inline_recall, final_test, J1, J7. `RecallTest` et `LearnerKnowledgeNode` existent.

**Manque**: Pas de lien visible entre les missions et le systeme de spaced repetition. Les concepts fragiles identifies dans le debrief ne sont pas automatiquement reinjectes dans les prochaines missions.

**Recommandation**: Apres chaque mission, les concepts fragiles devraient automatiquement remonter dans la file de revision (`review-queue.service.ts` existe deja).

#### 2.12 Generation effect

**Constat actuel**: Le joueur choisit parmi des options. Il ne "genere" pas de reponse.

**Principe pedagogique** (Roediger & Karpicke): La generation active (produire la reponse) est plus efficace que la reconnaissance (choisir la bonne reponse).

**Recommandation**: Pour certains brick types, demander une reponse en texte libre avant de montrer les options. Notamment pour `COMPLETION` et `CODE_RECONSTRUCT`.

#### 2.13 Contextualisation multi-puzzle

**Principe**: Une notion apparait dans plusieurs puzzles sous des angles differents pour renforcer la trace mnesique.

**Constat actuel**: Chaque concept apparait dans un seul puzzle de sa salle, puis potentiellement dans le boss.

**Recommandation**: Introduire des "rappels" de concepts des salles precedentes dans les salles suivantes (reinforcement_items existe deja dans `CognitiveSegment.reinforcement_items`).

---

## 3. Architecture ideale d'un escape game pedagogique

### Structure cible

```
Zone
 ├── Room (OBSERVATION)
 │    ├── Puzzle A (concept 1) → obtient Cle Alpha
 │    └── Puzzle B (concept 2) → indice pour Room 3
 │
 ├── Room (TRI)
 │    ├── Puzzle C (concept 3, utilise Cle Alpha)
 │    └── Puzzle D (concept 1+3, multi-concept)
 │
 ├── Room (SEQUENCE)
 │    ├── Puzzle E (concept 4, drag-and-drop)
 │    └── Puzzle F (concept 5, chaine d'etapes)
 │
 ├── Room (ELIMINATION)
 │    ├── Puzzle G (concept 2+4, erreur a trouver)
 │    └── Puzzle H (concept 6, piege vs verite)
 │
 ├── Room (DECISION)
 │    ├── Puzzle I (concept 1+5, arbre decision)
 │    └── Puzzle J (concept 3+6, cas clinique)
 │
 └── Boss (META-PUZZLE)
      ├── Synthese de TOUS les concepts
      ├── Mecaniques differentes des salles
      └── Puzzle final: assembler fragments → revelation narrative
```

### Boucle cognitive optimale par puzzle

```
Exploration narrative (contexte immersif)
      ↓
Decouverte d'indice (active recall)
      ↓
Resolution d'enigme (generation)
      ↓
Feedback immediat (correction)
      ↓
Explication pedagogique (consolidation)
      ↓
Recompense narrative (dopamine)
      ↓
Objet/Fragment obtenu (inventaire)
      ↓
Progression vers puzzle suivant
```

---

## 4. Bilan synthetique

### Ce qui existe et qui est excellent

- **Architecture mission tres solide**: types, familles, sous-themes, profils univers
- **14 brick types declares** (base pour l'expansion)
- **Systeme de hints progressifs** bien pense (3 niveaux, auto-trigger, penalites)
- **Score composite multi-dimensionnel** (accuracy, calibration, bloom, traps)
- **Debrief cognitif avance** (arbre erreurs, surconfiance, plan revision)
- **Adaptation audience** complete (college → adult_pro)
- **24 sous-themes narratifs** riches et immersifs
- **12 profils domaine** avec UI flavor et challenge type specifiques

### Ce qui manque pour un vrai escape game

| Categorie | Priorite | Effort estime |
|-----------|----------|---------------|
| Puzzles logiques veritables (9 brick types non implementes) | P0 | Eleve |
| Chaines d'enigmes (dependances inter-puzzles) | P0 | Moyen |
| Inventaire fonctionnel | P0 | Moyen |
| Meta-puzzle final (pas juste des QCM) | P0 | Moyen |
| Exploration et indices caches | P0 | Eleve |
| Widgets UI varies par brick type (drag-drop, match, input) | P1 | Eleve |
| Narration reactive a la performance | P1 | Moyen |
| Timer avec consequences reelles | P1 | Faible |
| Difficulte progressive verifiee | P1 | Faible |
| Recompenses emotionnelles (animations, revelations) | P1 | Moyen |
| Lien spaced repetition ↔ missions | P2 | Moyen |
| Generation effect (reponses libres) | P2 | Moyen |
| Rappels multi-puzzle inter-salles | P2 | Faible |

### Verdict

La plateforme est actuellement un **serious game gamifie tres avance** avec une excellente base technique et pedagogique. La structure (zones, salles, boss, hints, scoring, debrief) est en place.

Pour devenir un **vrai escape game pedagogique**, il manque principalement:
1. La **variete des mecaniques de gameplay** (pas uniquement du QCM)
2. Les **dependances inter-puzzles** (chaines d'enigmes)
3. L'**exploration non-lineaire** (choix, decouverte, indices caches)
4. L'**inventaire fonctionnel** (objets qui servent)
5. Le **meta-puzzle final** qui assemble tout

Le potentiel est enorme: la combinaison IA + game design + pedagogie scientifique + 8 familles de missions + 24 sous-themes n'existe nulle part ailleurs a ce niveau de sophistication.
