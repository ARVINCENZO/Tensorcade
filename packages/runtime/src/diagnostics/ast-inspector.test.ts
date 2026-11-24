import { describe, it, expect } from 'vitest';
import { AstInspector } from './ast-inspector.js';

describe('AstInspector', () => {
  it('detects banned tokens like for and while in vectorized levels', () => {
    const code = [
      'def compute_loss(preds, targets):',
      '    total = 0',
      '    for p in preds:',
      '        total += p',
      '    return total',
    ].join('\n');

    const result = AstInspector.inspect(code, {
      bannedTokens: ['for', 'while'],
    });

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0]?.rule).toBe('BANNED_TOKEN_FOR');
    expect(result.violations[0]?.line).toBe(3);
  });

  it('ignores banned tokens inside comments and string literals', () => {
    const code = [
      '# This is a comment about for loops and while loops',
      'msg = "we should wait for a while"',
      'total = sum(preds)',
    ].join('\n');

    const result = AstInspector.inspect(code, {
      bannedTokens: ['for', 'while'],
    });

    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects banned security imports (os, sys, socket, urllib)', () => {
    const code = [
      'import os',
      'import urllib.request',
      'from sys import exit',
    ].join('\n');

    const result = AstInspector.inspect(code, {
      bannedImports: ['os', 'sys', 'socket', 'urllib'],
    });

    expect(result.valid).toBe(false);
    expect(result.violations.length).toBe(3);
    expect(result.violations.some((v) => v.rule === 'BANNED_IMPORT_OS')).toBe(true);
    expect(result.violations.some((v) => v.rule === 'BANNED_IMPORT_URLLIB')).toBe(true);
    expect(result.violations.some((v) => v.rule === 'BANNED_IMPORT_SYS')).toBe(true);
  });

  it('flags missing required functions', () => {
    const code = 'x = 10\ny = 20\n';

    const result = AstInspector.inspect(code, {
      requiredFunctions: ['cosine_similarity'],
    });

    expect(result.valid).toBe(false);
    expect(result.violations[0]?.rule).toBe('MISSING_REQUIRED_FUNCTION_COSINE_SIMILARITY');
  });
});
