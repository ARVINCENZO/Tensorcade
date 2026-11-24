/**
 * Static AST & Constraint Inspector.
 *
 * Conforms to docs/11-lld.md §3 and docs/12-level-schema.md:
 * - Statically analyzes Python code prior to execution.
 * - Detects banned tokens (e.g. loops in vectorized levels).
 * - Detects banned imports (e.g. os, sys, socket, urllib).
 * - Validates required functions and constructs.
 */

import type { AstConstraints, AstInspectionResult, AstViolation } from '@tensorcade/contracts';

/**
 * Strips comments and string literals to prevent false positives when searching for tokens.
 */
function stripCommentsAndStrings(code: string): string {
  // Replace multi-line strings ("""...""" and '''...''')
  let cleaned = code.replace(/"""[\s\S]*?"""/g, (match) =>
    '\n'.repeat(match.split('\n').length - 1),
  );
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, (match) =>
    '\n'.repeat(match.split('\n').length - 1),
  );

  // Replace single-line strings ("..." and '...')
  cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, "''");

  // Strip single-line comments (# ...)
  cleaned = cleaned.replace(/#.*$/gm, '');

  return cleaned;
}

export class AstInspector {
  /**
   * Inspects Python code against specified AST and pedagogical constraints.
   */
  public static inspect(code: string, constraints?: AstConstraints): AstInspectionResult {
    if (!constraints) {
      return { valid: true, violations: [] };
    }

    const violations: AstViolation[] = [];
    const cleanedCode = stripCommentsAndStrings(code);
    const cleanedLines = cleanedCode.split('\n');

    // 1. Check Banned Tokens (e.g. 'for', 'while' in vectorization levels)
    if (constraints.bannedTokens && constraints.bannedTokens.length > 0) {
      for (const token of constraints.bannedTokens) {
        const regex = new RegExp(`\\b${token}\\b`);
        for (let i = 0; i < cleanedLines.length; i++) {
          const line = cleanedLines[i] ?? '';
          if (regex.test(line)) {
            violations.push({
              rule: `BANNED_TOKEN_${token.toUpperCase()}`,
              line: i + 1,
              message: `Token "${token}" is forbidden in this level (vectorized operations required).`,
            });
          }
        }
      }
    }

    // 2. Check Banned Imports (e.g. 'os', 'sys', 'socket', 'urllib')
    if (constraints.bannedImports && constraints.bannedImports.length > 0) {
      for (const mod of constraints.bannedImports) {
        // Matches: import os, import os as x, from os import y, __import__('os')
        const importRegex = new RegExp(
          `(?:^|\\s)(?:import\\s+.*\\b${mod}\\b|from\\s+${mod}\\b|__import__\\s*\\(\\s*['"]${mod}['"])`,
        );
        for (let i = 0; i < cleanedLines.length; i++) {
          const line = cleanedLines[i] ?? '';
          if (importRegex.test(line)) {
            violations.push({
              rule: `BANNED_IMPORT_${mod.toUpperCase()}`,
              line: i + 1,
              message: `Module "${mod}" is not permitted in this sandbox.`,
            });
          }
        }
      }
    }

    // 3. Check Required Functions (e.g. 'def step', 'cosine_similarity')
    if (constraints.requiredFunctions && constraints.requiredFunctions.length > 0) {
      for (const fn of constraints.requiredFunctions) {
        const fnRegex = new RegExp(`\\b${fn}\\b`);
        const found = cleanedLines.some((line) => fnRegex.test(line));
        if (!found) {
          violations.push({
            rule: `MISSING_REQUIRED_FUNCTION_${fn.toUpperCase()}`,
            line: 1,
            message: `Required function or construct "${fn}" was not found in your submission.`,
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}
