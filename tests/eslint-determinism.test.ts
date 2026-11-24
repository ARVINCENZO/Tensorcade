import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

describe('packages/engine determinism lint rules', { timeout: 15000 }, () => {
  const eslint = new ESLint();

  it(
    'flags non-deterministic Date in packages/engine',
    async () => {
    const code = `export const now = new Date();`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/engine/src/bad-date.ts',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasForbiddenDate = results[0]?.messages.some(
      (m) =>
        m.message.includes('Date is non-deterministic') || m.message.includes('Date is forbidden'),
    );
    expect(hasForbiddenDate).toBe(true);
  }, 15000);

  it('flags non-deterministic Math.random in packages/engine', async () => {
    const code = `export const rand = Math.random();`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/engine/src/bad-random.ts',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasForbiddenRandom = results[0]?.messages.some(
      (m) =>
        m.message.includes('Math.random() is non-deterministic') ||
        m.message.includes('Mulberry32'),
    );
    expect(hasForbiddenRandom).toBe(true);
  });

  it('flags transcendental Math functions (Math.sin, Math.exp) in packages/engine', async () => {
    const code = `
      export const s = Math.sin(1.0);
      export const e = Math.exp(2.0);
      export const p = Math.pow(2.0, 3.0);
    `;
    const results = await eslint.lintText(code, {
      filePath: 'packages/engine/src/bad-math.ts',
    });
    expect(results[0]?.messages.length).toBeGreaterThanOrEqual(3);
    const hasTranscendental = results[0]?.messages.some(
      (m) => m.message.includes('transcendental') || m.message.includes('polynomial'),
    );
    expect(hasTranscendental).toBe(true);
  });

  it('flags timer APIs (setTimeout) in packages/engine', async () => {
    const code = `setTimeout(() => {}, 100);`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/engine/src/bad-timer.ts',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasTimerError = results[0]?.messages.some(
      (m) =>
        m.message.includes('forbidden in simulation engine paths') ||
        m.message.includes('Async scheduling is forbidden'),
    );
    expect(hasTimerError).toBe(true);
  });

  it('flags non-deterministic Web Crypto API in packages/engine', async () => {
    const code = `export const rand = crypto.getRandomValues(new Uint32Array(1));`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/engine/src/bad-crypto.ts',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasCryptoError = results[0]?.messages.some(
      (m) =>
        m.message.includes('forbidden in simulation engine paths') ||
        m.message.includes('Web Crypto API is non-deterministic'),
    );
    expect(hasCryptoError).toBe(true);
  });

  it('passes for deterministic operations (Math.sqrt, Math.floor, bitwise, Mulberry32)', async () => {
    const code = `
      export const root = Math.sqrt(16);
      export const fl = Math.floor(4.5);
      export const add = 1 + 2;
    `;
    const results = await eslint.lintText(code, {
      filePath: 'packages/engine/src/good-math.ts',
    });
    expect(results[0]?.messages.length).toBe(0);
  });
});

describe('packages/ui design tokens lint rules', { timeout: 15000 }, () => {
  const eslint = new ESLint();

  it('flags raw hex colors outside design tokens', async () => {
    const code = `export const BadComponent = () => <div className="text-[#38BDF8]" />;`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/ui/src/components/BadHex.tsx',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasHexError = results[0]?.messages.some((m) =>
      m.message.includes('Raw hex color "#38BDF8" is forbidden'),
    );
    expect(hasHexError).toBe(true);
  });

  it('flags raw pixel units outside design tokens', async () => {
    const code = `export const BadComponent = () => <div className="p-[16px]" />;`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/ui/src/components/BadPx.tsx',
    });
    expect(results[0]?.messages.length).toBeGreaterThan(0);
    const hasPxError = results[0]?.messages.some((m) =>
      m.message.includes('Raw pixel unit "16px" is forbidden'),
    );
    expect(hasPxError).toBe(true);
  });

  it('passes for CSS variables and semantic tokens', async () => {
    const code = `export const GoodComponent = () => <div className="text-[var(--tc-accent-cyan)] p-4" />;`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/ui/src/components/GoodToken.tsx',
    });
    expect(results[0]?.messages.length).toBe(0);
  });

  it('ignores HTML/JSX href anchor links without triggering false positive', async () => {
    const code = `export const NavLink = () => <a href="#facade">Skip</a>;`;
    const results = await eslint.lintText(code, {
      filePath: 'packages/ui/src/components/NavLink.tsx',
    });
    expect(results[0]?.messages.length).toBe(0);
  });
});
