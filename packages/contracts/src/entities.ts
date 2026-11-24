import { z } from 'zod';

/**
 * Educational progression modes.
 */
export const PlayModeSchema = z.enum(['explorer', 'builder', 'hacker']);
export type PlayMode = z.infer<typeof PlayModeSchema>;

/**
 * Bloom's Revised Taxonomy levels.
 */
export const BloomLevelSchema = z.enum([
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
]);
export type BloomLevel = z.infer<typeof BloomLevelSchema>;

/**
 * Level difficulty tags.
 */
export const DifficultySchema = z.enum(['introductory', 'intermediate', 'advanced']);
export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * Parsons problem code block definition for Builder mode.
 */
export const ParsonsBlockSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  isDistractor: z.boolean(),
  explanationIfChosen: z.string().optional(),
});
export type ParsonsBlock = z.infer<typeof ParsonsBlockSchema>;

/**
 * Authenticated or guest session user profile.
 */
export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
  isGuest: z.boolean(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

/**
 * Standard API error payload.
 */
export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiErrorEnvelope = ApiError;

/**
 * Zod schema for individual discrete actions within a trace.
 */
export const DiscreteActionSchema = z.object({
  tick: z.number().int().positive('Action tick must be an integer >= 1'),
  type: z.string().min(1),
  params: z
    .record(z.union([z.number(), z.string(), z.boolean(), z.null()]))
    .default({}),
});
export type DiscreteActionData = z.infer<typeof DiscreteActionSchema>;

export interface DiscreteAction<TParams = Record<string, number | string | boolean | null>> {
  readonly tick: number;
  readonly type: string;
  readonly params: TParams;
}

// Deprecated alias for backwards compatibility
export const TickActionSchema = DiscreteActionSchema;
export type TickAction<TParams = Record<string, number | string | boolean | null>> = DiscreteAction<TParams>;

/**
 * Deterministic action trace serialized for replay and verification.
 */
export const ActionTraceSchema = z.object({
  version: z.literal('1.0.0').default('1.0.0'),
  levelId: z.string().min(1),
  mode: PlayModeSchema,
  seed: z.number().int(),
  totalTicks: z.number().int().nonnegative(),
  actions: z.array(DiscreteActionSchema),
  clientTerminalHash: z
    .string()
    .regex(/^[0-9a-fA-F]{16}$/, 'State hash must be a 16-character hexadecimal string'),
});
export type ActionTrace<_TAction = unknown> = z.infer<typeof ActionTraceSchema>;

/**
 * Headless or client engine configuration.
 */
export const EngineConfigSchema = z.object({
  levelId: z.string().min(1),
  maxTicks: z.number().int().positive(),
  environmentParams: z.record(z.union([z.number(), z.string(), z.boolean()])),
});
export type EngineConfig = z.infer<typeof EngineConfigSchema>;

/**
 * Deep state snapshot for scrubbing or server evaluation.
 */
export const StateSnapshotSchema = z.object({
  tick: z.number().int().nonnegative(),
  stateHash: z.string().regex(/^[0-9a-fA-F]{16}$/),
  state: z.unknown(),
});
export interface StateSnapshot<TState = unknown> {
  readonly tick: number;
  readonly stateHash: string;
  readonly state: Readonly<TState>;
}

/**
 * Deterministic simulation evaluation result.
 */
export const EvaluationResultSchema = z.object({
  success: z.boolean(),
  starsAwarded: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  executionTicks: z.number().int().nonnegative(),
  metrics: z.object({
    efficiencyScore: z.number(),
    resourceUsage: z.number(),
    lossAchieved: z.number().optional(),
  }),
  terminalHash: z
    .string()
    .regex(/^[0-9a-fA-F]{16}$/, 'State hash must be a 16-character hexadecimal string'),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

/**
 * Individual level completion item for local and cloud sync.
 */
export const ProgressItemSchema = z.object({
  levelId: z.string().min(1),
  starsEarned: z.number().int().min(0).max(3),
  clearedModes: z.array(PlayModeSchema),
  bestScore: z.number(),
  bestEfficiency: z.record(z.number()).optional(),
  hintTierReached: z.number().int().min(0).max(3).optional(),
  stateHash: z.string().optional(),
  updatedAt: z.number().int(),
});
export type ProgressItem = z.infer<typeof ProgressItemSchema>;

/**
 * Game metadata entry in the world catalog.
 */
export const GameCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  levelIds: z.array(z.string().min(1)),
});
export type GameCatalogItem = z.infer<typeof GameCatalogItemSchema>;

/**
 * World metadata entry in the world catalog.
 */
export const WorldCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  games: z.array(GameCatalogItemSchema),
});
export type WorldCatalogItem = z.infer<typeof WorldCatalogItemSchema>;

/**
 * Complete world catalog.
 */
export const WorldCatalogSchema = z.object({
  worlds: z.array(WorldCatalogItemSchema),
});
export type WorldCatalog = z.infer<typeof WorldCatalogSchema>;
