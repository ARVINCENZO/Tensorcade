/**
 * Static AST & Constraint Inspector.
 *
 * Conforms to docs/11-lld.md §3 and docs/12-level-schema.md:
 * - Statically analyzes Python code prior to execution.
 * - Detects banned tokens (e.g. loops in vectorized levels).
 * - Detects banned imports (e.g. os, sys, socket, urllib).
 * - Validates required functions and constructs.
 */

import type {
  AstConstraints,
  AstInspectionResult,
  AstViolation,
  DiagnosticError,
} from '@tensorcade/contracts';

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

    // 4. Check Required Constructs (e.g. 'for', 'while', 'if', 'elif', 'else', 'def', 'return', 'and', 'len')
    if (constraints.requiredConstructs && constraints.requiredConstructs.length > 0) {
      for (const construct of constraints.requiredConstructs) {
        const constructRegex = new RegExp(`\\b${construct}\\b`);
        const found = cleanedLines.some((line) => constructRegex.test(line));
        if (!found) {
          violations.push({
            rule: `MISSING_REQUIRED_CONSTRUCT_${construct.toUpperCase()}`,
            line: 1,
            message: `This level requires using Python construct "${construct}" rather than a hardcoded workaround.`,
          });
        }
      }
    }

    // 5. Check Maximum Direct Action Calls (prevents copy-pasting literal step() chains instead of loops)
    if (constraints.maxActionCalls) {
      for (const [fnName, maxAllowed] of Object.entries(constraints.maxActionCalls)) {
        const callRegex = new RegExp(`\\b${fnName}\\s*\\(`, 'g');
        const defRegex = new RegExp(`^\\s*def\\s+${fnName}\\s*\\(`);
        let callCount = 0;
        let firstExceedingLine = 1;
        for (let i = 0; i < cleanedLines.length; i++) {
          const line = cleanedLines[i] ?? '';
          if (defRegex.test(line)) continue;
          const matches = line.match(callRegex);
          if (matches) {
            for (let m = 0; m < matches.length; m++) {
              callCount++;
              if (callCount === maxAllowed + 1) {
                firstExceedingLine = i + 1;
              }
            }
          }
        }
        if (callCount > maxAllowed) {
          violations.push({
            rule: `MAX_ACTION_CALLS_${fnName.toUpperCase()}`,
            line: firstExceedingLine,
            message: `Found ${callCount} calls to "${fnName}()" (limit: ${maxAllowed}). Use a loop or helper function instead of repeating calls.`,
          });
        }
      }
    }

    // 6. Check Minimum Function Parameters (ensures def functions accept dynamic parameters)
    if (constraints.minFunctionParams && constraints.minFunctionParams > 0) {
      const defHeaderRegex = /^\s*def\s+[A-Za-z_]\w*\s*\(([^)]*)\)\s*:/;
      let satisfiesMinParams = false;
      let firstDefLine = 1;
      for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i] ?? '';
        const match = defHeaderRegex.exec(line);
        if (match) {
          if (firstDefLine === 1) firstDefLine = i + 1;
          const rawParams = (match[1] ?? '').trim();
          const params = rawParams
            ? rawParams
                .split(',')
                .map((p) => p.trim())
                .filter((p) => p.length > 0)
            : [];
          if (params.length >= constraints.minFunctionParams) {
            satisfiesMinParams = true;
            break;
          }
        }
      }
      if (!satisfiesMinParams) {
        violations.push({
          rule: 'MIN_FUNCTION_PARAMS',
          line: firstDefLine,
          message: `Define at least one reusable function with at least ${constraints.minFunctionParams} parameter(s) (e.g., def harvest_plot(length):).`,
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Formats AST constraint violations into a 4-part pedagogical DiagnosticError for ErrorFeedbackPanel.
   */
  public static toDiagnosticError(
    violations: ReadonlyArray<AstViolation>,
    sourceCode: string,
  ): DiagnosticError {
    const primary = violations[0];
    const line = primary?.line ?? 1;
    const rawLines = sourceCode.split('\n');
    const sourceSnippet = rawLines[Math.max(0, line - 1)] ?? '';
    const summaryList = violations.map((v) => `Line ${v.line}: ${v.message}`).join(' ');

    return {
      errorType: 'ConstraintViolation',
      whatHappened: primary?.message ?? 'Submission did not meet the level code constraints.',
      whereItOccurred: {
        line,
        column: 1,
        sourceSnippet,
      },
      whyItMatters:
        'This level is designed to practice a specific Python construct so your algorithm generalizes across unseen inputs rather than hardcoding a single case.',
      whatToInvestigate: `Review the level requirement and update your code: ${summaryList}`,
    };
  }
}
