import { describe, it, expect } from 'vitest';
import { DiagnosticErrorMapper } from './error-mapper.js';

describe('DiagnosticErrorMapper', () => {
  it('maps IndexError to 4-part pedagogical feedback with exact line number and source snippet', () => {
    const userCode = [
      'def get_item():',
      '    items = [1, 2, 3]',
      '    return items[10]',
      'get_item()',
    ].join('\n');

    const fakeTraceback = [
      'Traceback (most recent call last):',
      '  File "<learner_code>", line 4, in <module>',
      '    get_item()',
      '  File "<learner_code>", line 3, in get_item',
      '    return items[10]',
      'IndexError: list index out of range',
    ].join('\n');

    const error = DiagnosticErrorMapper.mapError(fakeTraceback, userCode);

    expect(error.errorType).toBe('IndexError');
    expect(error.whereItOccurred.line).toBe(3);
    expect(error.whereItOccurred.sourceSnippet).toBe('return items[10]');
    expect(error.whatHappened).toContain('List index out of range');
    expect(error.whyItMatters).toContain('0-indexed');
    expect(error.whatToInvestigate).toContain('Verify the length of your list');
  });

  it('maps ZeroDivisionError to plain-language explanation', () => {
    const userCode = 'x = 10 / 0\n';
    const fakeTraceback = [
      'Traceback (most recent call last):',
      '  File "<learner_code>", line 1, in <module>',
      '    x = 10 / 0',
      'ZeroDivisionError: division by zero',
    ].join('\n');

    const error = DiagnosticErrorMapper.mapError(fakeTraceback, userCode);

    expect(error.errorType).toBe('ZeroDivisionError');
    expect(error.whereItOccurred.line).toBe(1);
    expect(error.whatHappened).toContain('divide a number by zero');
    expect(error.whyItMatters).toContain('mathematically undefined');
  });

  it('maps SyntaxError and IndentationError correctly', () => {
    const userCode = 'def foo()\n    pass\n';
    const fakeTraceback = [
      '  File "<learner_code>", line 1',
      '    def foo()',
      '             ^',
      'SyntaxError: expected \':\'',
    ].join('\n');

    const error = DiagnosticErrorMapper.mapError(fakeTraceback, userCode);

    expect(error.errorType).toBe('SyntaxError');
    expect(error.whereItOccurred.line).toBe(1);
    expect(error.whereItOccurred.column).toBe(14);
    expect(error.whatHappened).toContain('syntax error');
  });

  it('maps KeyboardInterrupt / timeout to infinite loop warning', () => {
    const userCode = 'while True:\n    pass\n';
    const fakeTraceback = [
      'Traceback (most recent call last):',
      '  File "<learner_code>", line 2, in <module>',
      '    pass',
      'KeyboardInterrupt',
    ].join('\n');

    const error = DiagnosticErrorMapper.mapError(fakeTraceback, userCode);

    expect(error.errorType).toBe('KeyboardInterrupt');
    expect(error.whatHappened).toContain('timeout limit');
    expect(error.whyItMatters).toContain('Non-terminating loops freeze computation');
    expect(error.whatToInvestigate).toContain('while-loop exit conditions');
  });

  it('maps RuntimeError (action limit exceeded) to pedagogical constraint advice', () => {
    const userCode = 'while True:\n    step()\n';
    const fakeTraceback = [
      'Traceback (most recent call last):',
      '  File "<learner_code>", line 2, in <module>',
      '    step()',
      'RuntimeError: Maximum action limit exceeded (2000 actions). Execution halted.',
    ].join('\n');

    const error = DiagnosticErrorMapper.mapError(fakeTraceback, userCode);

    expect(error.errorType).toBe('RuntimeError');
    expect(error.whatHappened).toContain('Maximum action limit exceeded');
    expect(error.whyItMatters).toContain('protect simulation stability');
    expect(error.whatToInvestigate).toContain('infinite loop');
  });
});
