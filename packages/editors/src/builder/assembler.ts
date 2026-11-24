import type { ParsonsBlock } from '@tensorcade/contracts';
import type { SolutionBlockState } from './types.js';

export const BLANK_PATTERN = /_{3,}/g;

/**
 * Normalizes an indentation specification into 0, 4, or 8 spaces.
 * Supports both indent levels (0, 1, 2) and space counts (0, 4, 8).
 */
export function normalizeIndent(indent: number): number {
  if (indent <= 0) return 0;
  if (indent === 1 || indent === 4) return 4;
  if (indent === 2 || indent >= 8) return 8;
  if (indent < 4) return 4;
  return 8;
}

/**
 * Steps indentation up (0 -> 4 -> 8).
 */
export function stepIndentUp(currentIndent: number): number {
  const normalized = normalizeIndent(currentIndent);
  if (normalized === 0) return 4;
  return 8;
}

/**
 * Steps indentation down (8 -> 4 -> 0).
 */
export function stepIndentDown(currentIndent: number): number {
  const normalized = normalizeIndent(currentIndent);
  if (normalized === 8) return 4;
  return 0;
}

/**
 * Splits block code into static text segments and blank slots.
 */
export function parseCodeSegments(
  code: string,
): Array<{ type: 'text' | 'blank'; text: string; index?: number }> {
  const segments: Array<{ type: 'text' | 'blank'; text: string; index?: number }> = [];
  const parts = code.split(BLANK_PATTERN);
  let blankCount = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part !== undefined && part.length > 0) {
      segments.push({ type: 'text', text: part });
    }
    if (i < parts.length - 1) {
      segments.push({ type: 'blank', text: '___', index: blankCount });
      blankCount++;
    }
  }

  return segments;
}

/**
 * Replaces `___` blanks with user-supplied values.
 */
export function substituteBlanks(code: string, blankValues?: Record<string, string>): string {
  if (!blankValues || Object.keys(blankValues).length === 0) {
    return code;
  }

  let blankIndex = 0;
  return code.replace(BLANK_PATTERN, () => {
    const value = blankValues[String(blankIndex)] ?? blankValues[`blank_${blankIndex}`];
    blankIndex++;
    return value !== undefined && value.length > 0 ? value : '___';
  });
}

/**
 * Assembles ordered solution blocks into a single executable Python program.
 */
export function assemblePythonCode(
  solution: ReadonlyArray<SolutionBlockState>,
  blocksById: ReadonlyMap<string, ParsonsBlock>,
): string {
  if (solution.length === 0) {
    return '';
  }

  const lines: string[] = [];

  for (const slot of solution) {
    const block = blocksById.get(slot.id);
    if (!block) continue;

    const substituted = substituteBlanks(block.code, slot.blankValues);
    const indentSpaces = ' '.repeat(normalizeIndent(slot.indent));

    // Support multiline blocks by indenting every line
    const blockLines = substituted.split('\n');
    for (const line of blockLines) {
      if (line.trim().length === 0) {
        lines.push('');
      } else {
        lines.push(`${indentSpaces}${line}`);
      }
    }
  }

  return lines.join('\n');
}

export interface DistractorInfo {
  id: string;
  code: string;
  explanation: string;
}

/**
 * Detects whether any placed blocks are distractors and collects their explanations.
 */
export function findPlacedDistractors(
  solution: ReadonlyArray<SolutionBlockState>,
  blocksById: ReadonlyMap<string, ParsonsBlock>,
): DistractorInfo[] {
  const distractors: DistractorInfo[] = [];

  for (const slot of solution) {
    const block = blocksById.get(slot.id);
    if (block && block.isDistractor) {
      distractors.push({
        id: block.id,
        code: block.code,
        explanation:
          block.explanationIfChosen ??
          'This block is an incorrect distractor for this problem. Consider the required logic and state transformations.',
      });
    }
  }

  return distractors;
}
