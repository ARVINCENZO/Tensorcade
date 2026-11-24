/**
 * Per-World Lazy Package Registry.
 *
 * Conforms to docs/00-research-and-plan.md, docs/11-lld.md §3, and QUALITY_BAR.md:
 * - World 1 boots with 0 external packages (pure CPython stdlib), enabling fast boot (< 1.5s).
 * - Scientific packages (numpy, pandas, matplotlib, scipy, scikit-learn, seaborn) are loaded on-demand per world.
 */

export const WORLD_PACKAGES: Record<string, ReadonlyArray<string>> = {
  // World 1: Python Foundations (Robot Farm) - pure stdlib
  'world-1': [],
  'w1-robot-farm': [],

  // World 2: Data Science Foundations (Pixel Lab & Data Detective)
  'world-2': ['numpy', 'pandas', 'matplotlib'],
  'w2-pixel-lab': ['numpy', 'matplotlib'],
  'w2-data-detective': ['pandas', 'matplotlib'],

  // World 3: Machine Learning Foundations (Blind Mountaineer & Overfit Orbit)
  'world-3': ['numpy', 'scipy', 'scikit-learn', 'matplotlib'],
  'w3-mountaineer': ['numpy', 'matplotlib'],
  'w3-overfit-orbit': ['numpy', 'scipy', 'scikit-learn', 'matplotlib'],

  // World 4: Reinforcement Learning (Reward Hacker & Bandit Cave)
  'world-4': ['numpy', 'scipy', 'matplotlib'],
  'w4-bandit-cave': ['numpy', 'matplotlib'],
  'w4-reward-hacker': ['numpy', 'scipy', 'matplotlib'],

  // World 5: Deep Learning, LLM & RAG
  'world-5': ['numpy', 'scipy'],
};

export class WorldPackageRegistry {
  /**
   * Returns list of required Python packages for a given world or game identifier.
   */
  public static getPackagesForWorld(worldOrGameId: string): ReadonlyArray<string> {
    const pkgs = WORLD_PACKAGES[worldOrGameId];
    if (pkgs) return pkgs;

    // Check if ID starts with world-X or wX-
    for (const [key, list] of Object.entries(WORLD_PACKAGES)) {
      if (worldOrGameId.startsWith(key)) {
        return list;
      }
    }

    return [];
  }
}
