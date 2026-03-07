

## Plan : Mode Quiz interactif

### Approche

Le quiz sera **généré par l'IA** a partir des paroles et du cours original, puis stocké en base. L'utilisateur y accède depuis le Player ou la Library. Pas besoin de table dédiée pour les questions -- on génère le quiz à la volée via une Edge Function et on le garde en state client (simple, pas de persistence des scores pour l'instant).

### Architecture

```text
Player.tsx ──> bouton "Quiz" ──> /quiz/:songId ──> Quiz.tsx
                                                     │
                                        Edge Function generate-quiz
                                        (Gemini, paroles + cours)
                                                     │
                                              JSON: questions[]
```

### Modifications

**1. Edge Function `generate-quiz`**
- Input : `songId` (on fetch les paroles + `original_text` depuis la DB via service role)
- Appelle `google/gemini-2.5-flash` avec un prompt qui génère 10-15 QCM basées sur le contenu du cours ET les paroles
- Format de sortie : `{ questions: [{ question, options: string[], correctIndex, explanation }] }`

**2. Migration DB : aucune**
- Le quiz est généré à la demande et affiché en client-side. Pas de persistence des scores pour cette V1.

**3. Page `src/pages/Quiz.tsx`**
- Route protégée `/quiz/:id`
- Fetch la chanson depuis DB, appelle `generate-quiz`, affiche les questions une par une
- Interface : question + 4 choix, feedback immédiat (vert/rouge + explication), barre de progression
- Score final avec animation, bouton "Recommencer" et "Retour au player"
- Design cohérent avec le reste (glass-card, gradient-bg, framer-motion)

**4. Route dans `App.tsx`**
- Ajouter `/quiz/:id` comme route protégée

**5. Bouton dans `Player.tsx`**
- Ajouter un bouton "Mode Quiz 🧠" sous les paroles, qui navigue vers `/quiz/${song.id}`

**6. Bouton dans `Library.tsx`**
- Ajouter une icone quiz sur chaque chanson "ready"

### Détail du prompt quiz

Le prompt demandera à Gemini de :
- Générer 10 questions QCM à partir du cours original et des paroles
- Varier les types : définitions, associations, vrai/faux reformulé en QCM, compléter une phrase des paroles
- Inclure une explication courte pour chaque réponse
- Cibler les notions-clés pour viser 20/20

