

# AUDIT BETA-TESTEUR NON TECHNIQUE — STUDYBEATS

---

## 1. RESUME EXECUTIF

### Ce qu'un novice comprend en arrivant
- Le hero est clair : "Transforme tes cours en chansons." OK, je comprends le concept en 3 secondes.
- Le badge "neurosciences" et le sous-titre donnent un peu de credibilite.
- Le CTA principal ("Creer ma premiere chanson") est bon et visible.
- Le demo player en bas du hero est un excellent element de preuve.

### Ce qu'un novice NE comprend PAS
- **La homepage est TROP longue et repetitive** : Hero → Trust → Steps → Before/After → Testimonials → "Plateforme complete" (5 cartes) → "Ce que tu obtiens" (3 cartes) → FAQ → CTA final = 9 sections. Un novice decroche bien avant la fin.
- **Les 5 cartes "Plateforme complete" parlent de fonctionnalites que le visiteur ne comprend pas encore** : "Studio collaboratif", "Ligue Europeenne", "Export LMS / SCORM" — ces termes ne parlent a personne qui n'a pas encore compris le produit de base.
- **3 sections entieres de contenu (Science, "Ecoute partout", "A qui s'adresse") existent dans les traductions mais ne sont PAS affichees sur la homepage.** Ce contenu est pourtant le plus convaincant pour un novice — il repond a "est-ce que ca marche?" et "est-ce pour moi?"

### Les 5 plus gros freins
1. **Homepage trop longue, sections mal ordonnees** — les elements de conviction les plus forts (science, cas d'usage, cibles) ne sont pas affiches
2. **Section "Plateforme complete" prematuree et jargonneuse** — SCORM, LMS, Studio collaboratif = jargon incomprehensible pour un novice
3. **Deux sections "features" qui se cannibalisent** — "Plateforme complete" (5 cartes) puis "Ce que tu obtiens" (3 cartes) creent de la confusion
4. **Aucune video de demo / capture d'ecran du produit** — le visiteur ne voit jamais a quoi ressemble l'app en vrai
5. **Chiffres de social proof potentiellement faibles** — si `total_songs` et `total_users` valent 0 (plateforme neuve), afficher "0+ chansons" et "0+ etudiants" detruit la credibilite

### Les 5 priorites absolues
1. Remettre les sections manquantes ("Pourquoi ca marche ?", "Ecoute partout", "A qui s'adresse") sur la homepage
2. Deplacer "Plateforme complete" beaucoup plus bas ou la fusionner, et reecrire les titres pour les rendre comprehensibles
3. Supprimer la section "Ce que tu obtiens" (redondante avec les steps et la plateforme)
4. Cacher les chiffres de social proof quand ils sont a 0
5. Ajouter une capture d'ecran ou un GIF du produit dans le hero

---

## 2. TABLEAU D'AUDIT COMPLET

| Priorite | Page / Zone | Probleme observe | Ce que ressent un novice | Impact | Recommandation | Faisable ? |
|----------|------------|------------------|-------------------------|--------|----------------|------------|
| P0 | Homepage | 3 sections cruciales (Science, Ecoute partout, Cibles) existent en JSON mais NE SONT PAS affichees | Le visiteur ne comprend pas pourquoi ca marche, pour qui c'est fait, ni comment l'integrer dans sa vie | Enorme — les arguments les plus convaincants sont absents | Ajouter ces sections dans Index.tsx | Oui |
| P0 | Homepage | Social proof affiche "0+ chansons" et "0+ etudiants" si la base est vide | "C'est un site fantome, personne ne l'utilise" | Credibilite detruite | Cacher les stats quand < seuil (ex: 10) ou afficher un minimum credible | Oui |
| P1 | Homepage | Section "Plateforme complete" utilise du jargon (SCORM, LMS, Studio collaboratif) | "C'est quoi SCORM ? LMS ? C'est pas pour moi" | Confusion, decrochage | Reecrire les titres et descriptions en langage simple | Oui |
| P1 | Homepage | Deux sections features ("Plateforme complete" + "Ce que tu obtiens") = redondance | "Je vois des listes de fonctionnalites partout, c'est repetitif" | Fatigue, decrochage | Fusionner en une seule section coherente | Oui |
| P1 | Homepage | Ordre des sections suboptimal : Steps avant Before/After avant Testimonials avant Platform | La preuve sociale arrive trop tard, la science est absente | Le visiteur s'ennuie avant d'etre convaincu | Reordonner : Hero → Steps → Before/After → Science → Cibles → Testimonials → Platform → FAQ → CTA | Oui |
| P1 | Navbar non connecte | 4 liens seulement (Tarifs, A propos, Connexion, S'inscrire) — pas de lien vers Contact | "Comment je les contacte ?" | Confiance reduite | Ajouter Contact dans le menu non-auth ou dans le footer visible | Decision humaine |
| P1 | Signup | Le champ "Field of study" est optionnel et pas tres visible | L'etudiant pourrait le sauter et l'IA ne s'adaptera pas | Personnalisation perdue | Le rendre visuellement plus attrayant ou obligatoire | Oui |
| P1 | Pricing | Plan gratuit avec "1 chanson offerte chaque mois" + "Import texte" + "Apercu du quiz" | "Apercu du quiz ? C'est quoi un apercu ? Je n'ai pas le vrai quiz ?" — confusion | Friction conversion | Reecrire : "Quiz complet apres chaque chanson" ou clarifier la limitation | Decision humaine |
| P2 | Homepage | Le demo player dit "Biologie — Le coeur humain" | "C'est que pour la biologie/medecine ?" — perception de niche | Visiteurs non-medecine se sentent exclus | Changer le titre en quelque chose de plus universel ou proposer plusieurs demos | Oui |
| P2 | Homepage | Badge "Memorisation musicale fondee sur les neurosciences" est vague | "Fondee sur les neurosciences" sonne marketing, pas prouve | Credibilite moderee | Ajouter un chiffre ou une source ("Methode validee par 3 etudes cliniques") | Decision humaine |
| P2 | Pricing | FAQ Pricing ne parle pas d'essai gratuit / ce qui se passe apres inscription | "Si je m'inscris gratuitement, qu'est-ce que je peux faire exactement ?" | Incertitude avant conversion | Ajouter une FAQ "Que contient le plan gratuit ?" | Oui |
| P2 | Navbar connecte | 6 liens (Creer, Biblio, Studio, Ligue, Export, Profil) + cloche + deconnexion = surcharge | "C'est quoi Studio ? Ligue ? Export ?" — confusion, trop de menus | Paradoxe du choix | Regrouper Studio/Ligue/Export sous un menu "Plus" | Decision humaine |
| P2 | Homepage CTA final | "Rejoins les etudiants qui revisent deja avec StudyBeats" quand il y a 0 utilisateurs | Sonne faux si la plateforme est neuve | Credibilite | Condition : si < seuil, reecrire en "Sois parmi les premiers" | Oui |
| P2 | Contact | Page accessible mais PAS dans le menu principal (non connecte) — seulement dans le footer | Un novice qui veut contacter doit scroller jusqu'en bas | Frustration | Ajouter un lien Contact dans le menu non-auth | Oui |
| P2 | About | Bio fondatrice : "Medecin urgentiste" — renforce la perception medecine-only | "C'est un outil pour les etudiants en medecine" | Positionnement flou pour les non-medecins | Ajouter : "... et son equipe accompagnent des etudiants de toutes filieres" | Decision humaine |
| P3 | Signup | Password strength meter utilise des seuils par longueur (3/6/9/12 chars) — trop simpliste | Un mot de passe "aaaaaa" affiche "Correct" | Fausse securite percue | Pas bloquant, mais verifier la force reelle | Optionnel |
| P3 | Footer | Section "Fonctionnalites" liste des sous-liens (generation de paroles, 30 styles, import, quiz) — tous pointent vers /create ou /signup | "Pourquoi 4 liens differents qui vont au meme endroit ?" | Confusion legere | Reduire a 2 liens ou pointer vers des ancres | Optionnel |
| P3 | Testimonials | 3 temoignages — tous francophones (Marie, Karim, Chloe), tous etudiants francais | "C'est que pour les Francais ?" — pour un site qui propose la "Ligue Europeenne" | Incoherence avec le positionnement "europeen" | Ajouter 1-2 temoignages internationaux | Decision humaine |
| P3 | Mobile | Sticky CTA mobile "Creer ma chanson gratuitement" est toujours present en scrollant | Correct mais peut etre intrusif sur tres petits ecrans | Mineur | Acceptable tel quel | Non |

---

## 3. AMELIORATIONS PRIORITAIRES A IMPLEMENTER IMMEDIATEMENT

### A. Homepage — Ajouter les 3 sections manquantes
Les sections "Pourquoi ca marche ?" (4 items science), "Ecoute partout, memorise tout le temps" (4 contextes), et "A qui s'adresse StudyBeats ?" (4 cibles) sont **deja traduites en FR et EN** dans les JSON. Elles doivent etre rendues dans `Index.tsx`.

**Ordre recommande des sections :**
1. Hero
2. Trust badges
3. Steps (3 etapes)
4. Before/After
5. **Science ("Pourquoi ca marche ?")**  ← NOUVEAU
6. **Ecoute partout** ← NOUVEAU
7. **A qui s'adresse** ← NOUVEAU
8. Testimonials
9. Platform (5 cartes) — avec titres reecrits
10. FAQ
11. CTA final

### B. Homepage — Supprimer la section "Ce que tu obtiens"
Elle est redondante avec Steps et Platform. La supprimer allegera la page.

### C. Homepage — Reecrire les titres jargonneux de "Plateforme complete"
- "Export LMS / SCORM" → "Exporte vers ton universite" (FR) / "Export to your university" (EN)
- "Studio collaboratif" → garder, mais changer la description pour : "Revise en groupe avec tes camarades" / "Study together with your classmates"
- "Ligue Europeenne" → "Defi entre etudiants" / "Student challenge"

### D. Homepage — Cacher les stats a 0
Si `total_songs < 10` ou `total_users < 10`, ne pas afficher la ligne social proof. Idem pour le CTA final "Rejoins les etudiants..." → fallback "Sois parmi les premiers a essayer".

### E. Homepage — Rendre le demo player plus universel
Changer le titre de la demo de "Biologie — Le coeur humain" en quelque chose de plus neutre, ou garder mais s'assurer que les autres sections montrent d'autres filieres.

### F. Traductions — Corriger les titres "Plateforme complete"
Mettre a jour `fr.json` et `en.json` pour les titres reecrits.

---

## 4. PLAN D'IMPLEMENTATION

### Fichiers a modifier :
1. **`src/pages/Index.tsx`** :
   - Ajouter 3 nouvelles sections (Science, Listen, Target) avec les traductions existantes
   - Supprimer la section "Ce que tu obtiens" (features_title / feature1-3)
   - Conditionner l'affichage du social proof : `stats.total_songs >= 10`
   - Conditionner le CTA final : si stats faibles, utiliser un texte alternatif

2. **`src/i18n/locales/fr.json`** :
   - Reecrire `platform5_title` : "Exporte vers ton universite"
   - Reecrire `platform3_title` : "Defi entre etudiants"
   - Ajouter cle `home.cta_text_early` : "Sois parmi les premiers etudiants a essayer StudyBeats."
   - Ajouter cle `home.cta_title_early` : "Pret a essayer ?"

3. **`src/i18n/locales/en.json`** :
   - Memes modifications en anglais

### Ce qui ne peut PAS etre modifie sans decision humaine :
- Rendre le champ "field of study" obligatoire au signup
- Ajouter Contact dans le menu non-auth (choix de priorite navbar)
- Ajouter des temoignages internationaux (necesssite du contenu)
- Clarifier le plan gratuit dans Pricing (choix business)
- Regrouper les liens navbar connecte (choix design)
- Changer la bio de la fondatrice (contenu proprietaire)

