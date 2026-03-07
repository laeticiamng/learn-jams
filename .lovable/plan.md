

## Plan: Pronunciation parfaite + Sortie streaming 20s

### Problème actuel
1. **Prononciation** : Aucune instruction explicite de prononciation/langue n'est transmise à Suno. Le style envoyé est juste "catchy pop" sans indication de langue, donc Suno peut chanter en anglais même pour du contenu français.
2. **Lenteur** : Le callback `first` (audio stream dispo en ~30-40s) est reçu mais le statut reste `"generating"`. L'utilisateur attend le callback `complete` (2-3 min) pour voir sa chanson — alors qu'un audio jouable est déjà disponible.

### Changements

#### 1. Prononciation parfaite — `generate-music/index.ts`
- Ajouter la langue de l'utilisateur dans le body envoyé depuis `Create.tsx`
- Injecter la langue dans le champ `style` envoyé à Suno (ex: `"catchy pop, sung in French"`) — c'est le mécanisme recommandé par Suno pour contrôler la langue du chant
- Passer aussi le titre dans la bonne langue (déjà fait)

**Fichiers** : `src/pages/Create.tsx` (passer `language`), `supabase/functions/generate-music/index.ts` (ajouter langue au style Suno)

#### 2. Sortie streaming rapide — `suno-callback/index.ts`
- Quand `callbackType === "first"` et qu'un `audio_url` est présent, passer le statut à `"ready"` au lieu de `"generating"`
- L'utilisateur voit sa chanson jouable en ~30-40s au lieu de 2-3 min
- Si le callback `complete` arrive ensuite, mettre à jour l'URL finale (meilleure qualité) sans changer le statut

**Fichier** : `supabase/functions/suno-callback/index.ts`

#### 3. Create.tsx — transmettre la langue à generate-music
- Ajouter `language: i18n.language` dans le body de l'appel `generate-music`

**Fichier** : `src/pages/Create.tsx`

### Résumé des modifications

| Fichier | Modification |
|---|---|
| `src/pages/Create.tsx` | Passer `language` à `generate-music` |
| `supabase/functions/generate-music/index.ts` | Lire `language`, ajouter `"sung in {langue}"` au style Suno |
| `supabase/functions/suno-callback/index.ts` | `first` + audio_url → statut `"ready"` immédiat |

