// ============================================================
// Homepage Copy — Centralized text for the landing page
// ============================================================

export const HOME_COPY = {
  hero: {
    badge: "Plateforme d'apprentissage multimodale",
    title_line1: "Apprenez autrement.",
    title_highlight: "Retenez vraiment.",
    subtitle:
      "Importez n'importe quel cours. COGNITIO le transforme en missions interactives, chansons, quiz, vidéos et fiches — adaptés à votre profil et votre public.",
    cta_logged_in: "Créer un contenu",
    cta_logged_out: "Commencer gratuitement",
    cta_demo: "Essayer une démo",
    already_account: "J'ai déjà un compte",
  },

  formats: {
    label: "Formats multimodaux",
    title: "Un cours, des dizaines de formats",
    subtitle:
      "Chaque format active un canal cognitif différent. Combinez-les pour maximiser la rétention.",
    items: [
      {
        key: "mission",
        title: "Missions interactives",
        desc: "Parcours guidé avec rappel actif, calibration confiance et débrief.",
        icon: "Target",
      },
      {
        key: "song",
        title: "Chansons pédagogiques",
        desc: "Vos concepts transformés en musique — 30 styles disponibles.",
        icon: "Music",
      },
      {
        key: "quiz",
        title: "Quiz adaptatifs",
        desc: "Questions calibrées par difficulté avec répétition espacée J+1, J+7.",
        icon: "HelpCircle",
      },
      {
        key: "video",
        title: "Vidéos pédagogiques",
        desc: "Synthèses visuelles générées par IA ou templates animés.",
        icon: "Video",
      },
      {
        key: "sheet",
        title: "Fiches de révision",
        desc: "Fiches structurées avec hiérarchie Bloom et sources tracées.",
        icon: "FileText",
      },
      {
        key: "story",
        title: "Histoires animées",
        desc: "Narrations immersives pour ancrer les concepts dans un récit.",
        icon: "BookOpen",
      },
    ],
  },

  audience: {
    label: "Adaptation par public",
    title: "Adapté à chaque apprenant",
    subtitle:
      "Du collégien au professionnel, COGNITIO ajuste le niveau, le ton et la complexité.",
    profiles: [
      {
        key: "student",
        title: "Étudiants",
        desc: "Médecine, droit, sciences — maîtrisez vos cours avec le rappel actif.",
        icon: "GraduationCap",
      },
      {
        key: "teacher",
        title: "Enseignants",
        desc: "Créez des supports multimodaux pour vos classes en quelques clics.",
        icon: "School",
      },
      {
        key: "pro",
        title: "Professionnels",
        desc: "Formations internes, onboarding, certifications — transformez vos docs.",
        icon: "Briefcase",
      },
      {
        key: "parent",
        title: "Parents & Tuteurs",
        desc: "Mode protégé, suivi pédagogique et contrôle parental intégré.",
        icon: "Shield",
      },
    ],
  },

  loop: {
    label: "Boucle d'apprentissage",
    title: "Import → Analyse → Mission → Rétention",
    steps: [
      {
        title: "Importez votre cours",
        desc: "PDF, DOCX ou texte. L'analyse commence instantanément.",
        icon: "FileUp",
      },
      {
        title: "L'IA analyse et structure",
        desc: "Concepts, hiérarchie, pièges, plan mémoire — tout est détecté.",
        icon: "Brain",
      },
      {
        title: "Choisissez vos formats",
        desc: "Mission, chanson, quiz, vidéo, fiche — combinez librement.",
        icon: "LayoutGrid",
      },
      {
        title: "Révisez et retenez",
        desc: "Débrief, rappel actif J+1, J+7. Mémoire durable.",
        icon: "RefreshCw",
      },
    ],
  },

  useCases: {
    label: "Cas d'usage",
    title: "Comment ils utilisent COGNITIO",
    cases: [
      {
        title: "Révision d'examens",
        desc: "Importez votre cours de cardio, jouez la mission, identifiez vos zones de surconfiance.",
        audience: "Étudiants",
      },
      {
        title: "Préparation de cours",
        desc: "Transformez vos supports en quiz et vidéos pour vos élèves en 5 minutes.",
        audience: "Enseignants",
      },
      {
        title: "Formation interne",
        desc: "Convertissez vos procédures en missions interactives pour le onboarding.",
        audience: "Entreprises",
      },
    ],
  },

  trust: {
    badges: [
      { icon: "ShieldCheck", label: "Fidélité source garantie" },
      { icon: "Lock", label: "Données isolées (RLS)" },
      { icon: "Brain", label: "Zéro hallucination" },
      { icon: "Shield", label: "Mode mineur RGPD" },
    ],
  },

  science: {
    label: "Fondations scientifiques",
    title: "Pourquoi ça fonctionne",
    items: [
      {
        icon: "Zap",
        title: "Rappel actif",
        desc: "Chaque mission intègre des tests inline pour ancrer les connaissances en profondeur.",
      },
      {
        icon: "Target",
        title: "Répétition espacée",
        desc: "Re-tests J+1 et J+7 pour combattre l'oubli naturel.",
      },
      {
        icon: "Brain",
        title: "Calibration confiance",
        desc: "Détection des zones de surconfiance pour éviter l'illusion de maîtrise.",
      },
      {
        icon: "Eye",
        title: "Fidélité source absolue",
        desc: "Aucun concept inventé. Chaque notion est tracée jusqu'à votre document.",
      },
    ],
  },

  cta: {
    title: "Prêt à transformer vos cours ?",
    subtitle:
      "Importez votre premier cours et découvrez la puissance du rappel actif. Gratuit pour commencer.",
  },

  faq: [
    {
      q: "Quels formats sont générés ?",
      a: "Missions interactives, chansons (30 styles), quiz adaptatifs, vidéos pédagogiques, fiches de révision et histoires animées. Vous choisissez les formats qui vous conviennent.",
    },
    {
      q: "Comment fonctionne l'analyse ?",
      a: "Votre document est parsé, segmenté et analysé par IA. Les concepts sont extraits, hiérarchisés par criticité et liés à leur source. Aucune notion n'est inventée.",
    },
    {
      q: "Quels fichiers sont supportés ?",
      a: "PDF texte, DOCX et texte brut (copier-coller). Les fichiers scannés (image) ne sont pas encore supportés.",
    },
    {
      q: "L'IA invente-t-elle du contenu ?",
      a: "Non. C'est le principe fondamental de COGNITIO : chaque concept est tracé jusqu'à votre document source. Le système de QA bloque toute hallucination conceptuelle.",
    },
    {
      q: "Que se passe-t-il si mon document est de mauvaise qualité ?",
      a: "Le système détecte la qualité et adapte automatiquement : mission réduite, simplifiée ou synthèse uniquement. Vous êtes toujours informé du pourquoi.",
    },
    {
      q: "Mes documents sont-ils sécurisés ?",
      a: "Vos données sont isolées par utilisateur (RLS Supabase). Les fichiers bruts peuvent être supprimés. Aucun partage croisé.",
    },
    {
      q: "Le mode mineur est-il conforme RGPD ?",
      a: "Oui. Filtrage de contenu, consentement parental, audit trail CNIL, mode protégé avec contrôle des horaires et des activités.",
    },
  ],
} as const;
