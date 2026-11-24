import { WorldCatalog, WorldCatalogSchema } from '@tensorcade/contracts';

/**
 * Canonical curriculum catalog metadata for world map visualization.
 * Strictly aligned with docs/CURRICULUM_MAP.md (6 flagship games, 30 levels).
 * Level IDs conform to LevelManifestSchema regex: /^[a-z0-9]+-[a-z0-9-]+-\d+\.\d+$/
 */
export const DEFAULT_WORLD_CATALOG: WorldCatalog = WorldCatalogSchema.parse({
  worlds: [
    {
      id: 'world-1',
      name: 'World 1: Python Foundations',
      slug: 'python-foundations',
      games: [
        {
          id: 'robot-farm',
          name: 'Robot Farm',
          levelIds: [
            'w1-robot-farm-1.1',
            'w1-robot-farm-1.2',
            'w1-robot-farm-1.3',
            'w1-robot-farm-1.4',
            'w1-robot-farm-1.5',
            'w1-robot-farm-1.6',
            'w1-robot-farm-1.7',
            'w1-robot-farm-1.8',
            'w1-robot-farm-1.9',
            'w1-robot-farm-1.10',
            'w1-robot-farm-1.11',
            'w1-robot-farm-1.12',
          ],
        },
      ],
    },
    {
      id: 'world-2',
      name: 'World 2: Data Science Lifecycle',
      slug: 'data-science',
      games: [
        {
          id: 'pixel-lab',
          name: 'Pixel Lab',
          levelIds: [
            'w2-pixel-lab-2.1',
            'w2-pixel-lab-2.2',
            'w2-pixel-lab-2.3',
            'w2-pixel-lab-2.4',
            'w2-pixel-lab-2.5',
          ],
        },
        {
          id: 'data-detective',
          name: 'Data Detective',
          levelIds: [
            'w2-data-detective-2.6',
            'w2-data-detective-2.7',
            'w2-data-detective-2.8',
            'w2-data-detective-2.9',
            'w2-data-detective-2.10',
          ],
        },
      ],
    },
    {
      id: 'world-3',
      name: 'World 3: Machine Learning Foundations',
      slug: 'ml-foundations',
      games: [
        {
          id: 'blind-mountaineer',
          name: 'Blind Mountaineer',
          levelIds: [
            'w3-blind-mountaineer-3.1',
            'w3-blind-mountaineer-3.2',
            'w3-blind-mountaineer-3.3',
            'w3-blind-mountaineer-3.4',
            'w3-blind-mountaineer-3.5',
          ],
        },
      ],
    },
    {
      id: 'world-4',
      name: 'World 4: Reinforcement Learning',
      slug: 'reinforcement-learning',
      games: [
        {
          id: 'reward-hacker',
          name: 'Reward Hacker',
          levelIds: [
            'w4-reward-hacker-4.1',
            'w4-reward-hacker-4.2',
            'w4-reward-hacker-4.3',
            'w4-reward-hacker-4.4',
            'w4-reward-hacker-4.5',
          ],
        },
      ],
    },
    {
      id: 'world-5',
      name: 'World 5: Deep Learning, RAG & Agentic AI',
      slug: 'deep-learning-rag',
      games: [
        {
          id: 'library-escape',
          name: 'Library Escape',
          levelIds: [
            'w5-library-escape-5.1',
            'w5-library-escape-5.2',
            'w5-library-escape-5.3',
            'w5-library-escape-5.4',
            'w5-library-escape-5.5',
          ],
        },
      ],
    },
  ],
});
