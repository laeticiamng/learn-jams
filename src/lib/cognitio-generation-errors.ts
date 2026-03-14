// ============================================================
// COGNITIO M5 Generation Errors
// ============================================================

export type M5ErrorCode =
  | "INVALID_M5_INPUT"
  | "FORMAT_MISMATCH"
  | "MISSING_CRITICAL_CONCEPT"
  | "MISSING_CONSOLIDATION"
  | "MISSING_FINAL_TEST"
  | "OUTPUT_TOO_VERBOSE"
  | "INVALID_BLOOM_DISTRIBUTION"
  | "MISSING_SOURCE_DISCLAIMER"
  | "INVALID_M5_JSON"
  | "DB_WRITE_FAILED"
  | "BLOCK_OVERLOAD"
  | "NO_CONCEPTS";

export interface M5Error {
  code: M5ErrorCode;
  user_message: string;
  technical_message: string;
  severity: "warning" | "error" | "blocking";
  retryable: boolean;
}

const ERROR_CATALOG: Record<M5ErrorCode, Omit<M5Error, "technical_message">> = {
  INVALID_M5_INPUT: {
    code: "INVALID_M5_INPUT",
    user_message: "Les données d'entrée pour la génération sont invalides.",
    severity: "blocking",
    retryable: false,
  },
  FORMAT_MISMATCH: {
    code: "FORMAT_MISMATCH",
    user_message: "Le format sélectionné n'est pas compatible avec ce générateur.",
    severity: "blocking",
    retryable: false,
  },
  MISSING_CRITICAL_CONCEPT: {
    code: "MISSING_CRITICAL_CONCEPT",
    user_message: "Une ou plusieurs notions critiques sont absentes de la fiche générée.",
    severity: "blocking",
    retryable: true,
  },
  MISSING_CONSOLIDATION: {
    code: "MISSING_CONSOLIDATION",
    user_message: "La consolidation finale est manquante.",
    severity: "blocking",
    retryable: true,
  },
  MISSING_FINAL_TEST: {
    code: "MISSING_FINAL_TEST",
    user_message: "Le test final est manquant ou insuffisant.",
    severity: "error",
    retryable: true,
  },
  OUTPUT_TOO_VERBOSE: {
    code: "OUTPUT_TOO_VERBOSE",
    user_message: "Le contenu généré est trop long et sera compressé.",
    severity: "warning",
    retryable: true,
  },
  INVALID_BLOOM_DISTRIBUTION: {
    code: "INVALID_BLOOM_DISTRIBUTION",
    user_message: "Le test final ne couvre pas assez de niveaux cognitifs.",
    severity: "error",
    retryable: true,
  },
  MISSING_SOURCE_DISCLAIMER: {
    code: "MISSING_SOURCE_DISCLAIMER",
    user_message: "Un avertissement source est manquant pour du contenu incertain.",
    severity: "error",
    retryable: true,
  },
  INVALID_M5_JSON: {
    code: "INVALID_M5_JSON",
    user_message: "Le format de sortie est invalide.",
    severity: "blocking",
    retryable: true,
  },
  DB_WRITE_FAILED: {
    code: "DB_WRITE_FAILED",
    user_message: "Erreur lors de la sauvegarde. Vos données sont conservées localement.",
    severity: "error",
    retryable: true,
  },
  BLOCK_OVERLOAD: {
    code: "BLOCK_OVERLOAD",
    user_message: "Un bloc contient trop de nouveaux éléments.",
    severity: "error",
    retryable: true,
  },
  NO_CONCEPTS: {
    code: "NO_CONCEPTS",
    user_message: "Aucun concept disponible pour la génération.",
    severity: "blocking",
    retryable: false,
  },
};

export function createM5Error(code: M5ErrorCode, technicalMessage: string): M5Error {
  const base = ERROR_CATALOG[code];
  return { ...base, technical_message: technicalMessage };
}

export function isM5Error(err: unknown): err is M5Error {
  return typeof err === "object" && err !== null && "code" in err && typeof (err as M5Error).code === "string" && (err as M5Error).code in ERROR_CATALOG;
}
