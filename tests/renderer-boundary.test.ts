import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

describe('packages/renderer architectural boundary lint rules', { timeout: 15000 }, () => {
  const eslint = new ESLint();

  it('flags forbidden engine mutation class imports in packages/renderer', async () => {
    const code = `import { BaseSimulationEngine, RobotFarmSimulation } from '@tensorcade/engine';`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/renderer/src/bad-engine-import.ts',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasForbiddenMutation = results[0]?.messages.some((m) =>
      m.message.includes('forbidden in renderer')
    );
    expect(hasForbiddenMutation).toBe(true);
  });

  it('flags forbidden trace mutator imports in packages/renderer', async () => {
    const code = `import { ActionTraceRecorder, ActionTraceReplayer } from '@tensorcade/engine';`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/renderer/src/bad-trace-import.ts',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasForbiddenMutation = results[0]?.messages.some((m) =>
      m.message.includes('forbidden in renderer')
    );
    expect(hasForbiddenMutation).toBe(true);
  });

  it('allows type-only imports of EngineSnapshot and state types in packages/renderer', async () => {
    const code = `
      import type { EngineSnapshot, Direction, Position } from '@tensorcade/engine';
      export interface LocalState {
        snapshot: EngineSnapshot<unknown>;
        dir: Direction;
        pos: Position;
      }
    `;
    const results = await eslint.lintText(code, {
      filePath: 'packages/renderer/src/good-type-import.ts',
    });
    expect(results[0]?.messages.length).toBe(0);
  });
});
