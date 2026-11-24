import { z } from 'zod';
import {
  BloomLevelSchema,
  DifficultySchema,
  PlayModeSchema,
  type BloomLevel,
  type Difficulty,
  type PlayMode,
  AstConstraintsSchema,
  type AstConstraints,
  ParsonsBlockSchema,
  type ParsonsBlock,
} from '@tensorcade/contracts';

export {
  BloomLevelSchema,
  DifficultySchema,
  PlayModeSchema,
  type BloomLevel,
  type Difficulty,
  type PlayMode,
  AstConstraintsSchema,
  type AstConstraints,
  ParsonsBlockSchema,
  type ParsonsBlock,
};

/**
 * Three-tier hint ladder.
 */
export const HintLadderSchema = z.object({
  tier1Nudge: z.string().min(10, 'Tier 1 nudge must provide meaningful directional guidance'),
  tier2Concept: z.string().min(10, 'Tier 2 concept must name the algorithmic principle'),
  tier3Scaffold: z.string().min(10, 'Tier 3 scaffold must provide code skeleton structure'),
});
export type HintLadder = z.infer<typeof HintLadderSchema>;

/**
 * Three-star scoring rubric.
 */
export const ScoringRubricSchema = z.object({
  star1: z.object({
    description: z.string().min(5),
    condition: z.string().min(5),
  }),
  star2: z.object({
    description: z.string().min(5),
    metric: z.enum(['ticks', 'memory', 'tokens', 'iterations']),
    threshold: z.number().positive(),
  }),
  star3: z.object({
    description: z.string().min(5),
    hackerOnly: z.literal(true),
    noHintsAllowed: z.literal(true),
  }),
});
export type ScoringRubric = z.infer<typeof ScoringRubricSchema>;

/**
 * Core Level Manifest schema.
 * Defines the static data configuration for any playable level.
 */
export const LevelManifestSchema = z.object({
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  id: z.string().regex(/^[a-z0-9]+-[a-z0-9-]+-\d+\.\d+$/),
  worldId: z.string().min(1),
  gameId: z.string().min(1),
  order: z.number().int().positive(),
  title: z.string().min(3).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  learningObjective: z.string().min(10),
  conceptTag: z.string().regex(/^C_[A-Z0-9_]+$/),
  bloomLevel: BloomLevelSchema,
  misconceptionTargeted: z.string().min(10),
  simplificationLabel: z
    .string()
    .regex(/^Simplified: .+/)
    .optional(),
  difficulty: DifficultySchema,
  supportedModes: z.array(PlayModeSchema).min(1),
  estimatedMinutes: z.number().int().min(1).max(60),
  seeds: z
    .array(z.number().int())
    .length(5, 'Every level must specify exactly 5 evaluation seeds for anti-guessing'),
  entrypoint: z.string().min(1).default('step'),
  environmentConfig: z.record(z.unknown()),
  starterCode: z.object({
    explorer: z.string().default(''),
    builder: z.string().default(''),
    hacker: z.string().default(''),
  }),
  parsonsBlocks: z.array(ParsonsBlockSchema).optional(),
  blocklyToolbox: z.record(z.unknown()).optional(),
  referenceSolution: z.string().min(1, 'Reference solution cannot be empty'),
  astConstraints: AstConstraintsSchema.optional(),
  scoringRubric: ScoringRubricSchema,
  hintLadder: HintLadderSchema,
});
export type LevelManifest = z.infer<typeof LevelManifestSchema>;

/**
 * Level bundle delivered to the client player.
 */
export const LevelBundleSchema = z.object({
  manifest: LevelManifestSchema,
  lessonContentMarkdown: z.string(),
});
export type LevelBundle = z.infer<typeof LevelBundleSchema>;
