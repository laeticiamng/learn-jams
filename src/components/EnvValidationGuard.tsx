// ============================================================
// EnvValidationGuard — Validates environment variables at boot
// Shows diagnostic screen if critical vars are missing
// ============================================================

import { type ReactNode, useMemo } from "react";
import { validateClientEnv, type EnvValidationResult } from "@/security/env";

interface Props {
  children: ReactNode;
}

export function EnvValidationGuard({ children }: Props) {
  const validation = useMemo<EnvValidationResult>(() => validateClientEnv(), []);

  if (!validation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 p-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-3">&#9888;</div>
            <h1 className="text-xl font-bold text-red-400">Configuration Error</h1>
            <p className="text-sm text-gray-400 mt-2">
              Required environment variables are missing. The app cannot start.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-red-900/50">
            <h2 className="text-sm font-semibold text-red-300 mb-2">Missing variables:</h2>
            <ul className="space-y-1">
              {validation.missing.map((key) => (
                <li key={key} className="text-sm font-mono text-red-400">
                  &#8226; {key}
                </li>
              ))}
            </ul>
          </div>

          {validation.warnings.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4 border border-yellow-900/50">
              <h2 className="text-sm font-semibold text-yellow-300 mb-2">Warnings:</h2>
              <ul className="space-y-1">
                {validation.warnings.map((w) => (
                  <li key={w} className="text-sm font-mono text-yellow-400">
                    &#8226; {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 mb-2">How to fix:</h2>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Create a <code className="text-gray-200">.env</code> file at the project root</li>
              <li>Add the missing variables listed above</li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
