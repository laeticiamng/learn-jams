// ============================================================
// COGNITIO Error Taxonomy — Typed errors for M1/M2 pipeline
// ============================================================

export type CognitioErrorCode =
  | "UNSUPPORTED_CONTENT_TYPE"
  | "FILE_PARSE_FAILED"
  | "EMPTY_DOCUMENT"
  | "DOCUMENT_TOO_SHORT"
  | "DOCUMENT_TOO_LONG"
  | "LOW_CONFIDENCE_BLOCKING"
  | "INVALID_ANALYSIS_JSON"
  | "NON_TRACEABLE_CONCEPT"
  | "STORAGE_WRITE_FAILED"
  | "DB_WRITE_FAILED"
  | "AUTH_REQUIRED"
  | "EDGE_FUNCTION_FAILED"
  | "MIXED_LANGUAGE_DETECTED"
  | "NO_STRUCTURE_DETECTED"
  | "SEGMENTATION_FAILED";

export type CognitioErrorSeverity = "info" | "warning" | "error" | "blocking";

export interface CognitioError {
  code: CognitioErrorCode;
  user_message: string;
  technical_message: string;
  severity: CognitioErrorSeverity;
  retryable: boolean;
}

const ERROR_CATALOG: Record<CognitioErrorCode, Omit<CognitioError, "technical_message">> = {
  UNSUPPORTED_CONTENT_TYPE: {
    code: "UNSUPPORTED_CONTENT_TYPE",
    user_message: "Ce type de fichier n'est pas encore pris en charge. Utilisez un PDF texte, DOCX ou collez directement le texte.",
    severity: "blocking",
    retryable: false,
  },
  FILE_PARSE_FAILED: {
    code: "FILE_PARSE_FAILED",
    user_message: "Impossible de lire le fichier. Vérifiez qu'il n'est pas protégé ou corrompu.",
    severity: "blocking",
    retryable: true,
  },
  EMPTY_DOCUMENT: {
    code: "EMPTY_DOCUMENT",
    user_message: "Le document semble vide. Aucun texte exploitable n'a été détecté.",
    severity: "blocking",
    retryable: false,
  },
  DOCUMENT_TOO_SHORT: {
    code: "DOCUMENT_TOO_SHORT",
    user_message: "Le texte est trop court pour une analyse pédagogique fiable (minimum 100 mots recommandé).",
    severity: "warning",
    retryable: false,
  },
  DOCUMENT_TOO_LONG: {
    code: "DOCUMENT_TOO_LONG",
    user_message: "Le document est très long. Une segmentation automatique sera appliquée.",
    severity: "info",
    retryable: false,
  },
  LOW_CONFIDENCE_BLOCKING: {
    code: "LOW_CONFIDENCE_BLOCKING",
    user_message: "La qualité du document est insuffisante pour garantir une analyse fiable. Essayez avec un document mieux structuré.",
    severity: "blocking",
    retryable: false,
  },
  INVALID_ANALYSIS_JSON: {
    code: "INVALID_ANALYSIS_JSON",
    user_message: "L'analyse n'a pas pu être interprétée correctement. Réessayez.",
    severity: "error",
    retryable: true,
  },
  NON_TRACEABLE_CONCEPT: {
    code: "NON_TRACEABLE_CONCEPT",
    user_message: "Certains concepts détectés ne sont pas traçables dans le texte source. Ils ont été marqués comme incertains.",
    severity: "warning",
    retryable: false,
  },
  STORAGE_WRITE_FAILED: {
    code: "STORAGE_WRITE_FAILED",
    user_message: "Erreur lors de la sauvegarde du fichier. Réessayez dans quelques instants.",
    severity: "error",
    retryable: true,
  },
  DB_WRITE_FAILED: {
    code: "DB_WRITE_FAILED",
    user_message: "Erreur lors de la sauvegarde des données. Réessayez dans quelques instants.",
    severity: "error",
    retryable: true,
  },
  AUTH_REQUIRED: {
    code: "AUTH_REQUIRED",
    user_message: "Vous devez être connecté pour importer un document.",
    severity: "blocking",
    retryable: false,
  },
  EDGE_FUNCTION_FAILED: {
    code: "EDGE_FUNCTION_FAILED",
    user_message: "Le service d'analyse est temporairement indisponible. Un mode local est utilisé.",
    severity: "warning",
    retryable: true,
  },
  MIXED_LANGUAGE_DETECTED: {
    code: "MIXED_LANGUAGE_DETECTED",
    user_message: "Plusieurs langues ont été détectées dans le document. L'analyse pourrait être moins précise.",
    severity: "warning",
    retryable: false,
  },
  NO_STRUCTURE_DETECTED: {
    code: "NO_STRUCTURE_DETECTED",
    user_message: "Aucune structure claire n'a été détectée (pas de titres, listes, etc.). L'analyse sera basée sur le contenu brut.",
    severity: "warning",
    retryable: false,
  },
  SEGMENTATION_FAILED: {
    code: "SEGMENTATION_FAILED",
    user_message: "La segmentation du document a rencontré un problème. Un découpage simplifié a été utilisé.",
    severity: "warning",
    retryable: false,
  },
};

export function createCognitioError(
  code: CognitioErrorCode,
  technicalMessage: string
): CognitioError {
  const template = ERROR_CATALOG[code];
  return {
    ...template,
    technical_message: technicalMessage,
  };
}

export function isCognitioError(error: unknown): error is CognitioError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "severity" in error &&
    "retryable" in error
  );
}

export function isBlocking(error: CognitioError): boolean {
  return error.severity === "blocking";
}

export function isRetryable(error: CognitioError): boolean {
  return error.retryable;
}
