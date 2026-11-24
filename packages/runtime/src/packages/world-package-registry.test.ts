import { describe, it, expect } from 'vitest';
import { WorldPackageRegistry, WORLD_PACKAGES } from './world-package-registry.js';

describe('WorldPackageRegistry', () => {
  it('exposes defined world packages mapping', () => {
    expect(WORLD_PACKAGES['world-1']).toBeDefined();
    expect(WORLD_PACKAGES['world-2']).toContain('numpy');
  });

  it('returns empty package array for World 1 (pure stdlib fast boot)', () => {
    expect(WorldPackageRegistry.getPackagesForWorld('world-1')).toEqual([]);
    expect(WorldPackageRegistry.getPackagesForWorld('w1-robot-farm')).toEqual([]);
    expect(WorldPackageRegistry.getPackagesForWorld('w1-robot-farm-1.1')).toEqual([]);
  });

  it('returns data science dependencies for World 2', () => {
    const pkgs = WorldPackageRegistry.getPackagesForWorld('world-2');
    expect(pkgs).toContain('numpy');
    expect(pkgs).toContain('pandas');
    expect(pkgs).toContain('matplotlib');
  });

  it('returns scikit-learn and scipy for World 3 ML', () => {
    const pkgs = WorldPackageRegistry.getPackagesForWorld('world-3');
    expect(pkgs).toContain('scikit-learn');
    expect(pkgs).toContain('scipy');
  });

  it('returns fallback empty array for unrecognized worlds', () => {
    expect(WorldPackageRegistry.getPackagesForWorld('unknown-world')).toEqual([]);
  });
});
