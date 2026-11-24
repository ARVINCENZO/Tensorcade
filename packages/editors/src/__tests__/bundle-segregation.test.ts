/**
 * Bundle Segregation & Lazy Loading Verification Test.
 *
 * Conforms to:
 * - ADR-008: Monaco Editor vs CodeMirror 6 (Monaco is strictly lazy-loaded).
 * - ADR-009: Google Blockly (Blockly is packaged in a separate chunk loaded only in Explorer Mode).
 * - ADR-018: Asset Budgeting & Dynamic Loading (Monaco ~2.2 MB and Blockly ~450 KB segregated from initial shell).
 * - docs/QUALITY_BAR.md §Budgets (Initial bundle <= 250 KB gzip).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Lazy-Loading Bundle Segregation Verification', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const webPkgPath = path.join(rootDir, 'apps/web/package.json');
  const uiPkgPath = path.join(rootDir, 'packages/ui/package.json');
  const webSrcDir = path.join(rootDir, 'apps/web/src');
  const uiSrcDir = path.join(rootDir, 'packages/ui/src');

  it('verifies apps/web package.json does not depend on monaco-editor or blockly', () => {
    expect(fs.existsSync(webPkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    expect(allDeps['monaco-editor']).toBeUndefined();
    expect(allDeps['@monaco-editor/react']).toBeUndefined();
    expect(allDeps['blockly']).toBeUndefined();
  });

  it('verifies packages/ui package.json does not depend on monaco-editor or blockly', () => {
    expect(fs.existsSync(uiPkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(uiPkgPath, 'utf-8'));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    expect(allDeps['monaco-editor']).toBeUndefined();
    expect(allDeps['@monaco-editor/react']).toBeUndefined();
    expect(allDeps['blockly']).toBeUndefined();
  });

  it('verifies apps/web/src has zero static imports of monaco-editor or blockly', () => {
    const scanDir = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          results = results.concat(scanDir(filePath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(filePath);
        }
      }
      return results;
    };

    const files = scanDir(webSrcDir);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/from\s+['"]monaco-editor['"]/);
      expect(content).not.toMatch(/from\s+['"]@monaco-editor\/react['"]/);
      expect(content).not.toMatch(/from\s+['"]blockly['"]/);
    }
  });

  it('verifies packages/ui/src has zero static imports of monaco-editor or blockly', () => {
    const scanDir = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          results = results.concat(scanDir(filePath));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          results.push(filePath);
        }
      }
      return results;
    };

    const files = scanDir(uiSrcDir);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/from\s+['"]monaco-editor['"]/);
      expect(content).not.toMatch(/from\s+['"]@monaco-editor\/react['"]/);
      expect(content).not.toMatch(/from\s+['"]blockly['"]/);
    }
  });

  it('confirms editors package isolates heavy dependencies cleanly', () => {
    const editorsPkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(editorsPkgPath, 'utf-8'));

    expect(pkg.dependencies['monaco-editor']).toBeDefined();
    expect(pkg.dependencies['@monaco-editor/react']).toBeDefined();
    expect(pkg.dependencies['blockly']).toBeDefined();
  });
});
