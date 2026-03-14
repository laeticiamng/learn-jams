// ============================================================
// COGNITIO M5-B Story Errors
// ============================================================

export type M5BErrorCode =
  | "INVALID_M5B_INPUT"
  | "FORMAT_MISMATCH"
  | "MISSING_CRITICAL_CONCEPT"
  | "MISSING_CONSOLIDATION_SCENE"
  | "MISSING_CONTRACT_HOOK"
  | "SCENE_OVERLOAD"
  | "PAUSE_CADENCE_VIOLATED"
  | "NARRATIVE_NOT_NECESSARY"
  | "TOO_FEW_SCENES"
  | "TOO_MANY_SCENES"
  | "INVALID_M5B_JSON"
  | "DB_WRITE_FAILED"
  | "NO_CONCEPTS"
  | "MISSING_CHOICE_WIDGET"
  | "DUPLICATE_SCENE_IDS";

export interface M5BError {
  code: M5BErrorCode;
  user_message: string;
  technical_message: string;
  severity: "warning" | "error" | "blocking";
  retryable: boolean;
}

const ERROR_CATALOG: Record<M5BErrorCode, Omit<M5BError, "technical_message">> = {
  INVALID_M5B_INPUT: {
    code: "INVALID_M5B_INPUT",
    user_message: "Les données d'entrée pour la génération de l'histoire sont invalides.",
    severity: "blocking",
    retryable: false,
  },
  FORMAT_MISMATCH: {
    code: "FORMAT_MISMATCH",
    user_message: "Le format sélectionné n'est pas compatible avec le générateur d'histoires.",
    severity: "blocking",
    retryable: false,
  },
  MISSING_CRITICAL_CONCEPT: {
    code: "MISSING_CRITICAL_CONCEPT",
    user_message: "Une ou plusieurs notions critiques sont absentes de l'histoire générée.",
    severity: "blocking",
    retryable: true,
  },
  MISSING_CONSOLIDATION_SCENE: {
    code: "MISSING_CONSOLIDATION_SCENE",
    user_message: "La scène de consolidation est manquante.",
    severity: "blocking",
    retryable: true,
  },
  MISSING_CONTRACT_HOOK: {
    code: "MISSING_CONTRACT_HOOK",
    user_message: "La scène d'accroche initiale est manquante.",
    severity: "blocking",
    retryable: true,
  },
  SCENE_OVERLOAD: {
    code: "SCENE_OVERLOAD",
    user_message: "Une scène contient trop de concepts nouveaux.",
    severity: "error",
    retryable: true,
  },
  PAUSE_CADENCE_VIOLATED: {
    code: "PAUSE_CADENCE_VIOLATED",
    user_message: "Trop de scènes narratives consécutives sans pause interactive.",
    severity: "error",
    retryable: true,
  },
  NARRATIVE_NOT_NECESSARY: {
    code: "NARRATIVE_NOT_NECESSARY",
    user_message: "Le format narratif n'apporte pas de valeur mnémonique suffisante pour ce contenu. Une fiche dynamique sera utilisée.",
    severity: "warning",
    retryable: false,
  },
  TOO_FEW_SCENES: {
    code: "TOO_FEW_SCENES",
    user_message: "L'histoire générée contient trop peu de scènes.",
    severity: "blocking",
    retryable: true,
  },
  TOO_MANY_SCENES: {
    code: "TOO_MANY_SCENES",
    user_message: "L'histoire générée contient trop de scènes.",
    severity: "error",
    retryable: true,
  },
  INVALID_M5B_JSON: {
    code: "INVALID_M5B_JSON",
    user_message: "Le format de sortie de l'histoire est invalide.",
    severity: "blocking",
    retryable: true,
  },
  DB_WRITE_FAILED: {
    code: "DB_WRITE_FAILED",
    user_message: "Erreur lors de la sauvegarde. Vos données sont conservées localement.",
    severity: "error",
    retryable: true,
  },
  NO_CONCEPTS: {
    code: "NO_CONCEPTS",
    user_message: "Aucun concept disponible pour la génération de l'histoire.",
    severity: "blocking",
    retryable: false,
  },
  MISSING_CHOICE_WIDGET: {
    code: "MISSING_CHOICE_WIDGET",
    user_message: "Une pause active n'a pas de widget de choix interactif.",
    severity: "error",
    retryable: true,
  },
  DUPLICATE_SCENE_IDS: {
    code: "DUPLICATE_SCENE_IDS",
    user_message: "Des identifiants de scènes sont en double.",
    severity: "error",
    retryable: true,
  },
};

export function createM5BError(code: M5BErrorCode, technicalMessage: string): M5BError {
  const base = ERROR_CATALOG[code];
  return { ...base, technical_message: technicalMessage };
}

export function isM5BError(err: unknown): err is M5BError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as M5BError).code === "string" &&
    (err as M5BError).code in ERROR_CATALOG
  );
}
