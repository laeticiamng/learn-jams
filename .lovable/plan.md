

## Analyse : Prompt actuel vs. Prompt souhaité

Le prompt interne que tu as partagé est **déjà intégré à ~90%** dans `supabase/functions/generate-lyrics/index.ts`. Voici ce qui manque ou diffère :

### Éléments déjà présents ✓
- Protocole 4 étapes (Extraction, Plan, Rédaction, Contrôle Qualité)
- Contraintes d'assonances internes
- Objectif pédagogique absolu (6 points)
- Règles de fidélité
- Adaptation au style musical (23 styles)
- Découpage intelligent si cours trop long
- Prompts localisés dans les 7 langues

### Éléments manquants ou à renforcer

| Élément | Statut |
|---------|--------|
| Format de sortie détaillé (annotations `[Notions couvertes]`, `[Mots-clés]`, `[Subtilités/pièges]` sous chaque section) | ❌ Absent — actuellement le prompt dit "ne pas inclure les étapes intermédiaires" |
| "Ancrage examen" (formulations exactes à savoir redire pour 20/20) | ❌ Absent |
| 10-20 punchlines flash (actuellement limité à 5-10) | ⚠️ Partiel |
| Check-list de couverture finale (notion/mot-clé présent ou absent) | ❌ Absent — mais volontairement exclu du output pour ne pas polluer les paroles envoyées à Suno |
| Prononciation parfaite dans toutes les langues | ⚠️ Géré côté `generate-music` via les tags Suno, pas dans le prompt lyrics |

### Décision architecturale importante

Le prompt actuel demande explicitement de **ne pas afficher** les étapes intermédiaires (extraction, plan, check-list) car le output est directement envoyé à Suno pour la génération musicale. Ajouter les annotations `[Notions couvertes: ...]` et la check-list dans les paroles **casserait la génération musicale** — Suno chanterait ces annotations.

### Plan proposé

1. **Enrichir le `userPrompt`** dans `generate-lyrics/index.ts` :
   - Passer les punchlines flash de 5-10 à 10-20
   - Ajouter une section "ancrage examen" (formulations clés à retenir)
   - Renforcer l'instruction sur l'exhaustivité des subtilités/pièges

2. **Conserver la séparation paroles / métadonnées** :
   - Les paroles pures (envoyées à Suno) restent sans annotations
   - Les annotations pédagogiques (`[Notions couvertes]`, check-list, ancrage examen) sont demandées **après un séparateur** `---METADATA---`
   - Le code parse et sépare : `lyrics` (pour Suno) et `metadata` (stocké en DB pour affichage dans le Player)

3. **Stocker les métadonnées pédagogiques** :
   - Ajouter une colonne `lyrics_metadata` (type `text`) à la table `songs`
   - Afficher ces infos dans la page Player (onglet "Notes de révision" ou section dépliable)

4. **Prononciation** : Déjà géré par les tags Suno dans `generate-music` — aucun changement nécessaire.

### Fichiers impactés
- `supabase/functions/generate-lyrics/index.ts` — enrichir le prompt + parser metadata
- Migration DB — ajouter colonne `lyrics_metadata`
- `src/pages/Player.tsx` — afficher les métadonnées pédagogiques
- `src/pages/Create.tsx` — stocker metadata lors de l'insert

