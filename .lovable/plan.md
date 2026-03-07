

## Audit UX/Marketing v2 — Landing Page StudyBeats

Contexte : audit post-corrections P0-P3 du round precedent. Les corrections precedentes (hamburger mobile, suppression "free", raccourcissement sous-titre, social proof, reorder sections, FAQ a 5, connecteurs visuels, animation Target, formatage prix) ont ete implementees.

---

### Verdict global

L'app est nettement amelioree. Le hero est clair, le mobile fonctionne bien avec le hamburger, le pricing est coherent. Reste des points de friction mineurs.

---

### Ce qui est bon (ne pas toucher)

- Hero : badge propre, sous-titre court, CTA unique fort, social proof visible
- Navbar desktop : propre, equilibre
- Navbar mobile : hamburger fonctionne, layout OK
- Pricing : prix formate correctement (14.90 en EN), features claires
- Footer : complet, bien structure, bien traduit
- FAQ : 5 questions, bon volume
- CTA final : social proof integre ("Join 500+ students")

---

### Points a corriger (par priorite)

#### P0 — Critique

1. **Section "In a nutshell" toujours presente dans les locales** : les cles `summary_title` et `summary_text` existent encore dans tous les JSON (fr.json ligne 19-20, en.json ligne 13-14, etc.). Meme si elles ne sont plus affichees dans Index.tsx (bien), elles polluent les fichiers et pourraient creer de la confusion. **Nettoyer les cles inutilisees des 7 locales.**

2. **Cle `create.delete` dupliquee avec `create.delete_file`** : en.json ligne 129 a `"delete": "Remove"` ET ligne 133 a `"delete_file": "Remove"`. Le composant CourseUploader utilise `create.delete_file` mais `create.delete` est orpheline. **Supprimer `create.delete` des 7 locales.**

#### P1 — UX/Visual

3. **Espacement excessif entre Science et Listen** : visuellement, il y a ~80px de blanc entre les cartes Science et le titre "Listen anywhere". C'est du au `mb-16` du subtitle dans la section Science combiné au `py-16` de la section suivante. **Reduire `mb-16` a `mb-10` dans le subtitle de la section Science.**

4. **Emoji headphones 🎧 dans le H1** : l'emoji se retrouve "inline" avec le texte gradient et casse la ligne de maniere maladroite sur certains ecrans. L'emoji prend une taille disproportionnee sur mobile (car le h1 est en `text-5xl`). **Deplacer l'emoji sous le titre ou le supprimer du H1.**

5. **Section "In a nutshell" reference dans le code** : l'Index.tsx ne l'affiche plus — confirme. Mais les cles existent. Cf P0.

#### P2 — Polissage

6. **Navbar mobile : logout label incorrect** : dans Navbar.tsx ligne 78, le bouton logout utilise `t("nav.login")` ("Sign in" / "Connexion") comme label au lieu d'un texte de deconnexion. C'est confus pour l'utilisateur connecte. **Ajouter une cle `nav.logout` dans les 7 locales** (FR: "Déconnexion", EN: "Sign out", etc.) et l'utiliser.

7. **Pas de lien "About" dans la Navbar** : la page About existe mais n'est accessible que via le footer. Pas critique mais un lien en desktop navbar ou dans le menu mobile serait utile pour la credibilite.

8. **Page Pricing : pas de free tier visible** : un visiteur ne sait pas ce qu'il obtient gratuitement vs en payant. Ajouter une section "Free" minimaliste au-dessus ou a cote de la carte Pro (meme juste 3 lignes : "1 song free, text import only, no quiz").

---

### Plan d'implementation

| # | Action | Fichiers |
|---|--------|----------|
| 1 | Supprimer cles `summary_title`, `summary_text` des 7 locales | 7 x locale JSON |
| 2 | Supprimer cle `create.delete` orpheline des 7 locales | 7 x locale JSON |
| 3 | Ajouter cle `nav.logout` dans les 7 locales et utiliser dans Navbar.tsx | 7 x locale JSON + Navbar.tsx |
| 4 | Reduire espacement entre Science et Listen (`mb-16` → `mb-10`) | Index.tsx |
| 5 | Deplacer ou supprimer l'emoji 🎧 du H1 | Index.tsx |
| 6 | Ajouter un free tier basique sur la page Pricing | Pricing.tsx + 7 locales |

