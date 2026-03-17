// ============================================================
// ImmersiveUniverseProfiles — Deep, distinctive atmosphere
// definitions per domain. Each profile carries sensory
// vocabulary, dramatic hooks, recurring motifs, signature
// textures, and a full narrative voice that makes every
// domain feel like a different world — not a reskin.
// ============================================================

// ---------- Types ----------

export interface ImmersiveAtmosphere {
  /** One-line pitch that captures the feel */
  tagline: string;
  /** 3-5 sensory details the narrator weaves in */
  sensory_palette: string[];
  /** Recurring motifs the narrative returns to */
  motifs: string[];
  /** Signature sounds described in narrative */
  ambient_descriptions: string[];
  /** Visual textures referenced in room descriptions */
  visual_textures: string[];
  /** Emotional arc keywords for the full mission */
  emotional_arc: string[];
  /** Domain-specific objects that feel natural */
  signature_objects: string[];
  /** How time/urgency is expressed */
  urgency_metaphor: string;
  /** Success/mastery metaphor */
  mastery_metaphor: string;
  /** Failure/setback metaphor */
  setback_metaphor: string;
  /** Transition between rooms */
  room_transition_style: string;
  /** Color mood descriptors (not hex — narrative) */
  color_mood: string[];
  /** NPC voice archetype */
  npc_voice: string;
  /** Signature greeting */
  opening_hook: string;
  /** Signature closing */
  closing_hook: string;
}

export interface DomainNarrativeVoice {
  /** Register: formal, academic, clinical, conversational */
  register: string;
  /** Preferred sentence length: short, medium, long */
  sentence_rhythm: "staccato" | "balanced" | "flowing";
  /** Use of questions in narrative */
  rhetorical_questions: boolean;
  /** Second person ("vous") vs. impersonal */
  address_mode: "vous_direct" | "on_impersonal" | "nous_inclusif";
  /** Dramatic tension level 1-5 */
  base_tension: number;
  /** How revealing hints are presented */
  hint_personality: string;
  /** How errors are framed */
  error_framing: string;
  /** How mastery is celebrated */
  celebration_style: string;
}

export interface PremiumUniverseProfile {
  domain_key: string;
  atmosphere: ImmersiveAtmosphere;
  voice: DomainNarrativeVoice;
  room_atmospheres: RoomAtmosphereSet;
}

export interface RoomAtmosphere {
  name: string;
  entry_description: string;
  ambient_detail: string;
  exit_teaser: string;
}

export interface RoomAtmosphereSet {
  briefing: RoomAtmosphere;
  exploration: RoomAtmosphere;
  analysis: RoomAtmosphere;
  diagnostic: RoomAtmosphere;
  decision: RoomAtmosphere;
  synthesis: RoomAtmosphere;
  final: RoomAtmosphere;
}

// ---------- Profiles ----------

export const PREMIUM_UNIVERSE_PROFILES: Record<string, PremiumUniverseProfile> = {
  medical_clinical: {
    domain_key: "medical_clinical",
    atmosphere: {
      tagline: "Les vies se jouent dans les détails cliniques",
      sensory_palette: [
        "L'odeur antiseptique des couloirs blancs",
        "Le bip régulier des moniteurs cardiaques",
        "La lumière crue des néons chirurgicaux",
        "Le froissement des blouses au passage",
        "Le cliquetis métallique des instruments sur le plateau",
      ],
      motifs: ["le dossier patient", "l'horloge qui tourne", "les constantes vitales", "le diagnostic différentiel"],
      ambient_descriptions: [
        "Un moniteur bipe doucement quelque part derrière le rideau",
        "L'interphone grésille — un appel en salle de garde",
        "Les portes battantes claquent au bout du couloir",
      ],
      visual_textures: ["acier brossé", "carrelage blanc", "écrans bleutés", "rideaux verts chirurgicaux"],
      emotional_arc: ["vigilance", "observation", "doute méthodique", "certitude croissante", "décision", "soulagement"],
      signature_objects: ["stéthoscope", "scanner", "dossier médical", "tube d'analyse", "protocole de soins", "ordonnance"],
      urgency_metaphor: "Le temps presse — chaque minute compte pour le patient",
      mastery_metaphor: "Votre diagnostic se précise. Le tableau clinique prend forme.",
      setback_metaphor: "Une piste s'effondre. Reprenez l'anamnèse depuis le début.",
      room_transition_style: "Vous poussez les portes battantes et entrez dans le service suivant.",
      color_mood: ["blanc clinique", "bleu moniteur", "vert chirurgical", "rouge urgence"],
      npc_voice: "Praticien expérimenté, calme sous pression, pédagogue par la méthode socratique",
      opening_hook: "Un patient vient d'arriver aux urgences. Son dossier est incomplet. Vous êtes le seul à pouvoir relier les indices cliniques.",
      closing_hook: "Le diagnostic est posé, le protocole validé. Ce patient vous devra peut-être la vie.",
    },
    voice: {
      register: "clinical",
      sentence_rhythm: "staccato",
      rhetorical_questions: true,
      address_mode: "vous_direct",
      base_tension: 4,
      hint_personality: "Un confrère glisse discrètement : « Avez-vous vérifié les antécédents ? »",
      error_framing: "Ce diagnostic manque de rigueur. Relisez les résultats biologiques.",
      celebration_style: "Excellent raisonnement clinique. Votre sens du diagnostic s'affine.",
    },
    room_atmospheres: {
      briefing: {
        name: "Salle de garde",
        entry_description: "La salle de garde est silencieuse. Un dossier patient attend sur la table, surligné de jaune aux passages critiques.",
        ambient_detail: "Le café tiédit dans un gobelet oublié. L'horloge marque 3h47.",
        exit_teaser: "Le biper sonne. Direction le service.",
      },
      exploration: {
        name: "Service de consultation",
        entry_description: "Les boxes de consultation s'alignent derrière des rideaux. Chaque détail compte.",
        ambient_detail: "Un patient tousse derrière le rideau 3. Les infirmières échangent à voix basse.",
        exit_teaser: "Les résultats du labo viennent d'arriver.",
      },
      analysis: {
        name: "Laboratoire d'analyses",
        entry_description: "Les écrans affichent des courbes, des valeurs, des seuils. La science parle — à vous de l'écouter.",
        ambient_detail: "Les centrifugeuses ronronnent. Une imprimante crache des résultats.",
        exit_teaser: "Un résultat anormal attire votre attention…",
      },
      diagnostic: {
        name: "Salle d'imagerie",
        entry_description: "Les clichés s'illuminent sur le négatoscope. Chaque ombre, chaque densité raconte une histoire.",
        ambient_detail: "Le scanner émet un bourdonnement sourd. Le patient retient son souffle.",
        exit_teaser: "L'image révèle ce que les mots ne disaient pas.",
      },
      decision: {
        name: "Staff médical",
        entry_description: "L'équipe est réunie autour de la table. Tous les regards convergent vers vous. C'est l'heure de la décision.",
        ambient_detail: "Un silence tendu. Le chef de service attend votre synthèse.",
        exit_teaser: "Votre décision engagera la suite de la prise en charge.",
      },
      synthesis: {
        name: "Bureau du chef de service",
        entry_description: "Toutes les pièces du puzzle clinique sont là. Il est temps de construire le tableau complet.",
        ambient_detail: "Les dossiers s'empilent. Chaque feuille est un indice déjà croisé.",
        exit_teaser: "Le protocole final attend votre validation.",
      },
      final: {
        name: "Salle de réanimation",
        entry_description: "Les alarmes clignotent. C'est maintenant que tout se joue. Chaque connaissance acquise va être mobilisée.",
        ambient_detail: "L'adrénaline monte. Les bips s'accélèrent.",
        exit_teaser: "Le patient stabilisé, vous pouvez enfin respirer.",
      },
    },
  },

  law: {
    domain_key: "law",
    atmosphere: {
      tagline: "Le droit est une arme — encore faut-il savoir la manier",
      sensory_palette: [
        "L'odeur de vieux cuir des reliures juridiques",
        "Le martèlement solennel du maillet du juge",
        "La lumière tamisée des lampes de bureau en laiton",
        "Le froissement des pages du Code sur papier bible",
        "Le silence pesant de la salle d'audience avant le verdict",
      ],
      motifs: ["la balance de la justice", "le précédent jurisprudentiel", "l'article de loi", "le réquisitoire"],
      ambient_descriptions: [
        "Les pas résonnent sur le marbre du palais de justice",
        "Un greffier tourne les pages d'un dossier épais",
        "La pendule du prétoire marque chaque seconde du délibéré",
      ],
      visual_textures: ["boiseries sombres", "marbre blanc", "cuir patiné", "dorures officielles"],
      emotional_arc: ["curiosité juridique", "enquête", "doute raisonnable", "argumentation", "conviction", "verdict"],
      signature_objects: ["Code civil", "dossier de plaidoirie", "pièce à conviction", "jurisprudence", "réquisitoire", "conclusions"],
      urgency_metaphor: "Le délai de prescription court. Chaque preuve compte.",
      mastery_metaphor: "Votre argumentation se construit, article par article, précédent par précédent.",
      setback_metaphor: "Objection retenue. Votre raisonnement présente une faille juridique.",
      room_transition_style: "Vous franchissez la porte à double battant et pénétrez dans la salle suivante du tribunal.",
      color_mood: ["bordeaux solennel", "or institutionnel", "noir d'encre", "blanc de la page"],
      npc_voice: "Avocat chevronné, rhétorique affûtée, exigeant mais juste",
      opening_hook: "Une affaire complexe atterrit sur votre bureau. Les faits sont troubles, la jurisprudence contradictoire. À vous de démêler le vrai du faux.",
      closing_hook: "Le verdict est tombé. Votre maîtrise du droit a fait la différence.",
    },
    voice: {
      register: "formal",
      sentence_rhythm: "flowing",
      rhetorical_questions: true,
      address_mode: "vous_direct",
      base_tension: 3,
      hint_personality: "Maître, puis-je attirer votre attention sur l'article 1240 ?",
      error_framing: "Votre raisonnement juridique comporte une erreur de qualification. Revoyez les fondements.",
      celebration_style: "Brillante démonstration. Votre argumentation est sans faille.",
    },
    room_atmospheres: {
      briefing: {
        name: "Cabinet d'avocats",
        entry_description: "Le dossier est posé sur un bureau en acajou. Post-its, surligneurs, un Code annoté. L'affaire vous attend.",
        ambient_detail: "La secrétaire frappe à la porte avec un café et un résumé des dernières audiences.",
        exit_teaser: "Les premières pièces du dossier révèlent des incohérences…",
      },
      exploration: {
        name: "Salle des archives",
        entry_description: "Des rayonnages de jurisprudence s'élèvent jusqu'au plafond. Chaque arrêt est un précédent potentiel.",
        ambient_detail: "La poussière danse dans un rayon de lumière. Un volume ancien craque en s'ouvrant.",
        exit_teaser: "Un arrêt de la Cour de cassation attire votre attention.",
      },
      analysis: {
        name: "Salle d'instruction",
        entry_description: "Les pièces à conviction sont alignées, numérotées. Chaque élément doit être qualifié juridiquement.",
        ambient_detail: "Le greffier note méthodiquement. Le juge d'instruction observe.",
        exit_teaser: "La qualification des faits change tout le raisonnement.",
      },
      diagnostic: {
        name: "Bureau du procureur",
        entry_description: "Le procureur a préparé son réquisitoire. À vous de trouver les failles dans l'accusation.",
        ambient_detail: "Des dossiers empilés, des post-its sur chaque page clé.",
        exit_teaser: "Un vice de procédure pourrait tout faire basculer.",
      },
      decision: {
        name: "Salle d'audience",
        entry_description: "Le silence se fait. Le président ouvre l'audience. Chaque mot que vous prononcerez pèsera dans la balance.",
        ambient_detail: "Les bancs grincent. L'huissier appelle l'affaire au rôle.",
        exit_teaser: "La cour se retire pour délibérer.",
      },
      synthesis: {
        name: "Chambre du conseil",
        entry_description: "Toutes les pièces sont sur la table. Le moment est venu de construire votre synthèse définitive.",
        ambient_detail: "Les magistrats échangent à voix basse. La balance est en suspens.",
        exit_teaser: "Votre démonstration est prête.",
      },
      final: {
        name: "Grand prétoire",
        entry_description: "La salle solennelle attend votre plaidoirie finale. Tout ce que vous avez appris converge ici.",
        ambient_detail: "Le public retient son souffle. Les caméras sont braquées.",
        exit_teaser: "Le maillet frappe. Justice est rendue.",
      },
    },
  },

  computer_science: {
    domain_key: "computer_science",
    atmosphere: {
      tagline: "Le code est le langage du monde qui vient",
      sensory_palette: [
        "Le bourdonnement des serveurs dans la pénombre",
        "Les reflets verts du terminal sur le visage",
        "Le cliquetis mécanique d'un clavier dans le silence",
        "L'odeur d'ozone et de circuits chauds",
        "Le clignotement des LED derrière les baies de brassage",
      ],
      motifs: ["le bug critique", "l'architecture système", "le pattern caché", "la faille de sécurité"],
      ambient_descriptions: [
        "Un ventilateur de serveur accélère soudainement",
        "Un log d'erreur défile en rouge sur l'écran de monitoring",
        "Le curseur clignote, attendant la prochaine instruction",
      ],
      visual_textures: ["néons bleutés", "câbles en cascade", "écrans multiples", "circuits imprimés"],
      emotional_arc: ["curiosité technique", "exploration", "analyse de pattern", "debug", "optimisation", "déploiement"],
      signature_objects: ["terminal", "debugger", "architecture diagram", "log file", "API key", "unit test"],
      urgency_metaphor: "Le serveur de production est down. Les utilisateurs comptent sur vous.",
      mastery_metaphor: "Le système répond enfin. Votre architecture est élégante et robuste.",
      setback_metaphor: "Segfault. Votre raisonnement a une fuite mémoire quelque part.",
      room_transition_style: "Vous traversez le couloir technique éclairé par les LEDs bleues des baies serveur.",
      color_mood: ["bleu terminal", "vert matrice", "noir profond", "cyan interface"],
      npc_voice: "Senior engineer, pragmatique, code-first, réfléchit en architectures",
      opening_hook: "Alerte critique. Le système central affiche des comportements anormaux. Les logs sont votre seule piste.",
      closing_hook: "Système stable. Votre patch est propre, testé, déployé. Ship it.",
    },
    voice: {
      register: "conversational",
      sentence_rhythm: "staccato",
      rhetorical_questions: false,
      address_mode: "vous_direct",
      base_tension: 3,
      hint_personality: "Check le stack trace. La réponse est dans les logs.",
      error_framing: "Runtime error. Ton raisonnement a un edge case non géré.",
      celebration_style: "Clean code. Pas de side effects, pas de hacks. Bien joué.",
    },
    room_atmospheres: {
      briefing: {
        name: "War Room",
        entry_description: "Les écrans de monitoring clignotent. Un incident est en cours. Le Slack explose de messages urgents.",
        ambient_detail: "Le tableau Kanban affiche trop de tickets en rouge. Le café est fort.",
        exit_teaser: "Le premier indice se cache dans les logs d'erreur.",
      },
      exploration: {
        name: "Salle serveur",
        entry_description: "Des rangées de machines ronronnent dans la pénombre bleutée. Chaque rack contient une pièce du puzzle.",
        ambient_detail: "Les ventilateurs soufflent. Un voyant orange clignote sur le rack 7.",
        exit_teaser: "Un pattern émerge des données réseau.",
      },
      analysis: {
        name: "Poste d'analyse",
        entry_description: "Trois écrans, des logs qui défilent, un debugger ouvert. Il est temps de tracer le problème.",
        ambient_detail: "Le profiler tourne. Les graphiques de performance racontent une histoire.",
        exit_teaser: "Le bottleneck est identifié. Mais la cause racine est plus profonde…",
      },
      diagnostic: {
        name: "Laboratoire de test",
        entry_description: "L'environnement de staging est prêt. Reproduisons le bug en conditions contrôlées.",
        ambient_detail: "Les tests unitaires tournent. Un rouge apparaît dans la suite.",
        exit_teaser: "Le test échoue de manière reproductible. C'est une bonne nouvelle.",
      },
      decision: {
        name: "Architecture review",
        entry_description: "Le whiteboard est couvert de diagrammes. L'équipe attend votre décision d'architecture.",
        ambient_detail: "Des flèches, des boîtes, des annotations. Chaque choix a des trade-offs.",
        exit_teaser: "L'architecture est validée. Place à l'implémentation.",
      },
      synthesis: {
        name: "Code review",
        entry_description: "Le PR est ouvert. Tout le code est là. Il faut vérifier la cohérence de l'ensemble.",
        ambient_detail: "Les commentaires de review s'accumulent. La couverture de tests est à 94%.",
        exit_teaser: "LGTM. Mais le dernier test d'intégration reste à passer.",
      },
      final: {
        name: "Salle de déploiement",
        entry_description: "Le pipeline CI/CD est prêt. Un seul clic pour passer en production. Êtes-vous sûr de vous ?",
        ambient_detail: "Le compteur de build est au vert. Le rollback plan est documenté.",
        exit_teaser: "Déploiement réussi. Zéro downtime. Bravo.",
      },
    },
  },

  history: {
    domain_key: "history",
    atmosphere: {
      tagline: "Le passé n'est jamais mort — il attend qu'on le déchiffre",
      sensory_palette: [
        "L'odeur de parchemin et de cire à cacheter",
        "La lumière dorée d'une bougie sur un manuscrit ancien",
        "Le craquement du bois vieux sous les pas",
        "La fraîcheur humide des caves voûtées",
        "Le bruissement des pages jaunies qu'on tourne avec précaution",
      ],
      motifs: ["la source primaire", "le fil chronologique", "la carte ancienne", "le témoignage"],
      ambient_descriptions: [
        "La poussière danse dans un rayon de lumière filtrant par un vitrail",
        "Une horloge ancienne marque les heures d'un balancier lent",
        "Le vent siffle entre les pierres de l'édifice séculaire",
      ],
      visual_textures: ["pierre taillée", "bois vermoulu", "parchemin craquelé", "encre sépia"],
      emotional_arc: ["émerveillement", "enquête", "reconstitution", "compréhension", "mise en perspective", "sagesse"],
      signature_objects: ["carte ancienne", "lettre scellée", "artefact", "chronique", "sceau officiel", "relique"],
      urgency_metaphor: "L'histoire s'efface. Chaque source oubliée est un pan de vérité perdu.",
      mastery_metaphor: "Les pièces du puzzle historique s'assemblent. L'époque prend vie sous vos yeux.",
      setback_metaphor: "Anachronisme détecté. Votre reconstitution mélange les époques.",
      room_transition_style: "Vous traversez une arche de pierre et pénétrez dans la salle suivante du monument.",
      color_mood: ["sépia chaleureux", "or ancien", "brun parchemin", "rouge brique"],
      npc_voice: "Historien passionné, conteur, fait vivre les époques par l'anecdote",
      opening_hook: "Un document inédit a été découvert dans les archives oubliées. Il pourrait changer notre compréhension de cette période. À vous de l'authentifier.",
      closing_hook: "L'histoire a livré son secret. Ce que vous avez reconstitué éclaire d'un jour nouveau toute une époque.",
    },
    voice: {
      register: "academic",
      sentence_rhythm: "flowing",
      rhetorical_questions: true,
      address_mode: "nous_inclusif",
      base_tension: 2,
      hint_personality: "Avez-vous consulté la source primaire ? Parfois, la réponse se cache dans une note de bas de page.",
      error_framing: "Attention à l'anachronisme. Replacez cet événement dans son contexte.",
      celebration_style: "Remarquable travail de reconstitution. Vous pensez comme un historien.",
    },
    room_atmospheres: {
      briefing: {
        name: "Cabinet de curiosités",
        entry_description: "Des cartes anciennes tapissent les murs. Un globe terrestre lentement tourne. Un document scellé vous attend.",
        ambient_detail: "L'encre a séché il y a des siècles, mais les mots sont toujours lisibles.",
        exit_teaser: "Le sceau est brisé. La première piste mène aux archives.",
      },
      exploration: {
        name: "Archives secrètes",
        entry_description: "Des rayonnages interminables de documents classifiés. Chaque tiroir peut contenir la clé de l'énigme.",
        ambient_detail: "Des fiches manuscrites, des tampons officiels, des photographies jaunies.",
        exit_teaser: "Un document contredit la version officielle…",
      },
      analysis: {
        name: "Atelier de restauration",
        entry_description: "Des loupes, des pinceaux, des lampes UV. Ici, on fait parler les objets du passé.",
        ambient_detail: "Un fragment de poterie révèle une inscription inédite.",
        exit_teaser: "La datation confirme vos soupçons.",
      },
      diagnostic: {
        name: "Salle cartographique",
        entry_description: "Des cartes s'étalent sur une grande table. Frontières, routes, batailles — la géographie raconte l'histoire autrement.",
        ambient_detail: "Les tracés à l'encre révèlent des mouvements de troupes oubliés.",
        exit_teaser: "La carte contredit le récit officiel.",
      },
      decision: {
        name: "Conseil des historiens",
        entry_description: "Les experts sont réunis. Chaque interprétation s'affronte. À vous de trancher avec des preuves.",
        ambient_detail: "Les arguments fusent. Les sources sont brandies comme des armes.",
        exit_teaser: "Votre thèse doit maintenant résister à la critique.",
      },
      synthesis: {
        name: "Scriptorium",
        entry_description: "Plume en main, il est temps de rédiger la synthèse définitive. Chaque fait doit trouver sa place dans le récit.",
        ambient_detail: "L'encre coule. Les idées s'ordonnent. L'histoire prend forme.",
        exit_teaser: "Votre manuscrit est presque achevé.",
      },
      final: {
        name: "Grande galerie",
        entry_description: "Les portraits vous observent depuis les murs. L'épreuve finale confronte toutes vos connaissances à l'ensemble de la période.",
        ambient_detail: "Les siècles se télescopent. Passé et présent se répondent.",
        exit_teaser: "L'histoire a un nouveau récit. Le vôtre.",
      },
    },
  },

  fundamental_science: {
    domain_key: "fundamental_science",
    atmosphere: {
      tagline: "L'univers obéit à des lois — à vous de les découvrir",
      sensory_palette: [
        "Le grésillement d'un arc électrique entre deux électrodes",
        "L'odeur acre des réactifs chimiques sous la hotte",
        "Le tic-tac précis d'un métronome de laboratoire",
        "La lumière froide des lasers traversant un prisme",
        "Le sifflement d'un vide partiel dans une cloche à vide",
      ],
      motifs: ["l'équation fondamentale", "l'expérience cruciale", "la constante universelle", "le modèle prédictif"],
      ambient_descriptions: [
        "Un oscilloscope dessine des sinusoïdes parfaites",
        "Un liquide change de couleur lentement dans un bécher",
        "Le tableau noir est couvert d'équations à moitié effacées",
      ],
      visual_textures: ["verre de laboratoire", "métal poli", "tableau noir craie", "hologrammes de données"],
      emotional_arc: ["curiosité", "hypothèse", "expérimentation", "surprise", "compréhension", "émerveillement"],
      signature_objects: ["microscope", "spectromètre", "cahier d'expérience", "modèle moléculaire", "oscilloscope", "prisme"],
      urgency_metaphor: "La réaction est en cours. Le temps d'observation est limité.",
      mastery_metaphor: "L'équation se simplifie. Les lois de la nature se révèlent dans leur élégance.",
      setback_metaphor: "Résultat aberrant. Vérifiez vos hypothèses et reprenez la manipulation.",
      room_transition_style: "Vous passez dans le laboratoire adjacent, où une nouvelle expérience vous attend.",
      color_mood: ["blanc laboratoire", "bleu laser", "vert réactif", "orange flamme"],
      npc_voice: "Chercheur brillant, enthousiaste, qui rend la science vivante par l'expérience",
      opening_hook: "Un phénomène inexpliqué a été observé dans le laboratoire. Les données ne correspondent à aucun modèle connu. L'investigation commence.",
      closing_hook: "Le phénomène est expliqué. Votre modèle est élégant, prédictif, et vérifiable. C'est de la belle science.",
    },
    voice: {
      register: "academic",
      sentence_rhythm: "balanced",
      rhetorical_questions: true,
      address_mode: "nous_inclusif",
      base_tension: 2,
      hint_personality: "Avez-vous considéré les conditions aux limites ? Parfois, la solution est dans ce qu'on a négligé.",
      error_framing: "Résultat expérimental incompatible avec votre hypothèse. C'est normal — la science avance par l'erreur.",
      celebration_style: "Eurêka ! Votre raisonnement est rigoureux et le résultat est reproductible.",
    },
    room_atmospheres: {
      briefing: {
        name: "Bureau du directeur de recherche",
        entry_description: "Des publications s'empilent, un tableau blanc couvert d'équations. Un mystère scientifique vous est confié.",
        ambient_detail: "Un prix Nobel miniature trône sur l'étagère. L'ambition est palpable.",
        exit_teaser: "L'hypothèse est posée. Direction le laboratoire.",
      },
      exploration: {
        name: "Laboratoire principal",
        entry_description: "Paillasses, hottes, instruments de précision. Chaque appareil peut révéler un aspect du phénomène.",
        ambient_detail: "Un agitateur magnétique tourne lentement. Les fioles brillent sous la lumière UV.",
        exit_teaser: "Les premières données sont prometteuses.",
      },
      analysis: {
        name: "Salle de mesures",
        entry_description: "Spectromètres, chromatographes, analyseurs. Les données brutes attendent votre interprétation.",
        ambient_detail: "Les courbes s'affichent en temps réel. Un pic anormal apparaît.",
        exit_teaser: "Les chiffres racontent une histoire inattendue.",
      },
      diagnostic: {
        name: "Salle de simulation",
        entry_description: "Les ordinateurs modélisent le phénomène. Comparez prédictions théoriques et résultats expérimentaux.",
        ambient_detail: "Les simulations tournent. Les graphiques convergent… ou divergent.",
        exit_teaser: "Le modèle doit être ajusté.",
      },
      decision: {
        name: "Comité scientifique",
        entry_description: "Vos pairs sont réunis. Présentez vos résultats et défendez votre interprétation.",
        ambient_detail: "Les questions fusent. La méthode est scrutée.",
        exit_teaser: "Votre article est presque prêt pour la publication.",
      },
      synthesis: {
        name: "Bibliothèque de recherche",
        entry_description: "Articles fondateurs, revues de littérature. Situez votre découverte dans le paysage scientifique.",
        ambient_detail: "Les références s'accumulent. La cohérence globale prend forme.",
        exit_teaser: "Votre contribution est originale et solide.",
      },
      final: {
        name: "Amphithéâtre de soutenance",
        entry_description: "Le jury est installé. L'épreuve finale confronte votre maîtrise à l'ensemble du domaine.",
        ambient_detail: "Le vidéoprojecteur s'allume. Vos résultats s'affichent en grand.",
        exit_teaser: "Mention très honorable. La science a avancé.",
      },
    },
  },

  general: {
    domain_key: "general",
    atmosphere: {
      tagline: "Chaque savoir est une clé — à vous de trouver la serrure",
      sensory_palette: [
        "La chaleur d'une lampe de bureau dans un espace studieux",
        "Le son apaisant des pages qui tournent",
        "L'odeur du papier neuf d'un manuel fraîchement ouvert",
        "Le ronronnement discret d'un ventilateur de bibliothèque",
        "La lumière douce filtrant à travers des stores vénitiens",
      ],
      motifs: ["la connexion cachée", "le concept clé", "la vue d'ensemble", "le déclic"],
      ambient_descriptions: [
        "Un tableau numérique affiche un schéma évolutif",
        "Des post-its colorés constellent le mur d'idées",
        "Une horloge indique que le temps de réflexion file",
      ],
      visual_textures: ["bois clair", "verre dépoli", "tableau blanc", "écran interactif"],
      emotional_arc: ["curiosité", "exploration", "compréhension", "connexion", "maîtrise", "fierté"],
      signature_objects: ["carnet de notes", "schéma conceptuel", "fiche de synthèse", "mind map", "code QR indice", "badge de maîtrise"],
      urgency_metaphor: "Le temps de réflexion est compté. Concentrez-vous sur l'essentiel.",
      mastery_metaphor: "Les concepts se connectent. La compréhension s'éclaire.",
      setback_metaphor: "Un maillon manque dans votre raisonnement. Reprenez les fondamentaux.",
      room_transition_style: "Vous passez dans l'espace suivant, où de nouveaux défis vous attendent.",
      color_mood: ["bleu confiance", "vert progression", "orange créativité", "violet synthèse"],
      npc_voice: "Mentor bienveillant, encourageant, qui croit en votre potentiel",
      opening_hook: "Un défi d'apprentissage vous attend. Chaque concept maîtrisé vous rapproche de la sortie.",
      closing_hook: "Mission accomplie. Votre compréhension du sujet a fait un bond en avant.",
    },
    voice: {
      register: "conversational",
      sentence_rhythm: "balanced",
      rhetorical_questions: false,
      address_mode: "vous_direct",
      base_tension: 2,
      hint_personality: "Relisez attentivement l'énoncé. La réponse est souvent plus simple qu'on ne le pense.",
      error_framing: "Pas tout à fait. Prenez le temps de revoir ce concept avant de continuer.",
      celebration_style: "Bravo ! Vous progressez à vue d'œil.",
    },
    room_atmospheres: {
      briefing: {
        name: "Espace de briefing",
        entry_description: "Un espace lumineux et moderne. Les objectifs sont affichés clairement. Votre mission commence ici.",
        ambient_detail: "Un écran interactif vous souhaite la bienvenue.",
        exit_teaser: "Prêt ? La première salle d'exploration vous attend.",
      },
      exploration: {
        name: "Zone de découverte",
        entry_description: "Des panneaux interactifs, des objets à manipuler. Chaque découverte enrichit votre compréhension.",
        ambient_detail: "Des couleurs vives guident l'attention vers les points clés.",
        exit_teaser: "Vos premières découvertes ouvrent de nouvelles questions.",
      },
      analysis: {
        name: "Atelier d'analyse",
        entry_description: "Les données sont étalées devant vous. Il est temps de les organiser et de les comprendre.",
        ambient_detail: "Des schémas se construisent au fur et à mesure de votre progression.",
        exit_teaser: "Les patterns deviennent visibles.",
      },
      diagnostic: {
        name: "Salle de réflexion",
        entry_description: "Calme et concentration. C'est ici que les idées se cristallisent.",
        ambient_detail: "Un silence studieux. Juste vous et les concepts.",
        exit_teaser: "Votre compréhension s'approfondit.",
      },
      decision: {
        name: "Carrefour de décision",
        entry_description: "Plusieurs chemins s'offrent à vous. Chaque choix teste votre compréhension réelle.",
        ambient_detail: "Les options sont présentées. Réfléchissez bien.",
        exit_teaser: "Votre choix engage la suite du parcours.",
      },
      synthesis: {
        name: "Tour de synthèse",
        entry_description: "De là-haut, la vue d'ensemble est claire. Tous les concepts s'interconnectent.",
        ambient_detail: "Le panorama conceptuel se déploie. Les liens apparaissent.",
        exit_teaser: "La compréhension globale est à portée de main.",
      },
      final: {
        name: "Épreuve finale",
        entry_description: "Tout ce que vous avez appris converge ici. L'épreuve ultime teste votre maîtrise complète.",
        ambient_detail: "Le chrono est lancé. Concentration maximale.",
        exit_teaser: "Vous avez réussi. Le savoir est acquis.",
      },
    },
  },
};

// ---------- Helpers ----------

export function getUniverseProfile(domain: string): PremiumUniverseProfile {
  // Try exact match
  if (domain in PREMIUM_UNIVERSE_PROFILES) {
    return PREMIUM_UNIVERSE_PROFILES[domain];
  }
  // Try prefix match (e.g., "medical_basic_science" → "medical_clinical")
  if (domain.startsWith("medical")) return PREMIUM_UNIVERSE_PROFILES.medical_clinical;
  if (domain.startsWith("law")) return PREMIUM_UNIVERSE_PROFILES.law;
  if (domain.includes("science") || domain === "engineering" || domain === "public_health") {
    return PREMIUM_UNIVERSE_PROFILES.fundamental_science;
  }
  if (domain === "humanities") return PREMIUM_UNIVERSE_PROFILES.history;
  return PREMIUM_UNIVERSE_PROFILES.general;
}

export function getRoomAtmosphere(
  profile: PremiumUniverseProfile,
  roomType: string,
): RoomAtmosphere {
  const atmos = profile.room_atmospheres;
  return atmos[roomType as keyof RoomAtmosphereSet] ?? atmos.exploration;
}

export function pickSensoryDetail(profile: PremiumUniverseProfile): string {
  const palette = profile.atmosphere.sensory_palette;
  return palette[Math.floor(Math.random() * palette.length)];
}

export function pickAmbientDescription(profile: PremiumUniverseProfile): string {
  const descs = profile.atmosphere.ambient_descriptions;
  return descs[Math.floor(Math.random() * descs.length)];
}

export function pickMotif(profile: PremiumUniverseProfile): string {
  const motifs = profile.atmosphere.motifs;
  return motifs[Math.floor(Math.random() * motifs.length)];
}
