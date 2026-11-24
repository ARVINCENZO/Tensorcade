import { z } from 'zod';
import { PlayModeSchema, ProgressItemSchema } from './entities.js';

/**
 * Trace captured from a single seed execution for anti-cheat verification.
 */
export const SeedExecutionTraceSchema = z.object({
  seed: z.number().int(),
  actionTrace: z.string().min(1, 'actionTrace must be a non-empty canonical JSON string'),
  clientTerminalHash: z
    .string()
    .regex(/^[0-9a-fA-F]{16}$/, 'clientTerminalHash must be a 16-character hexadecimal string'),
});
export type SeedExecutionTrace = z.infer<typeof SeedExecutionTraceSchema>;

/**
 * Re-simulation verification request for headless server execution.
 * Anti-guessing requirement: exactly 5 deterministic seeds must be submitted.
 */
export const SubmissionVerifyRequestSchema = z.object({
  levelId: z.string().min(1),
  mode: PlayModeSchema,
  seedTraces: z
    .array(SeedExecutionTraceSchema)
    .length(5, 'Verification strictly requires exactly 5 seed traces'),
});
export type SubmissionVerifyRequest = z.infer<typeof SubmissionVerifyRequestSchema>;

/**
 * Re-simulation verification outcome from server headless engine.
 */
export const SubmissionVerifyResponseSchema = z.object({
  verified: z.boolean(),
  verifiedSeeds: z.array(z.number().int()),
  serverTerminalHashes: z.array(z.string().regex(/^[0-9a-fA-F]{16}$/)).optional(),
  starsAwarded: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  globalRank: z.number().int().positive().optional(),
  efficiencyScore: z.number().optional(),
  percentile: z.number().min(0).max(100).optional(),
  rejectionReason: z
    .enum([
      'REJECTED_STATE_DIVERGENCE',
      'REJECTED_INVALID_SEEDS',
      'REJECTED_TRACE_TOO_LONG',
      'REJECTED_GOAL_NOT_SATISFIED',
      'REJECTED_INSUFFICIENT_SEEDS',
    ])
    .optional(),
});
export type SubmissionVerifyResponse = z.infer<typeof SubmissionVerifyResponseSchema>;
export const VerifySubmissionResponseSchema = SubmissionVerifyResponseSchema;
export type VerifySubmissionResponse = SubmissionVerifyResponse;

/**
 * Client-to-server progress synchronization push payload.
 */
export const SyncPushRequestSchema = z.object({
  clientTimestamp: z.number().int(),
  progressItems: z.array(ProgressItemSchema),
});
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;

/**
 * Server response acknowledging merged progress items.
 */
export const SyncPushResponseSchema = z.object({
  success: z.boolean(),
  syncedLevelIds: z.array(z.string()),
  serverTimestamp: z.number().int(),
});
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>;

/**
 * Server-to-client progress synchronization pull response.
 */
export const SyncPullResponseSchema = z.object({
  progressItems: z.array(ProgressItemSchema),
  serverTimestamp: z.number().int(),
});
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>;

/**
 * Leaderboard filter and pagination parameters.
 */
export const LeaderboardQuerySchema = z.object({
  levelId: z.string().min(1),
  mode: PlayModeSchema.default('hacker'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;

/**
 * Single leaderboard ranking row.
 */
export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  username: z.string().min(1),
  score: z.number(),
  efficiencyMetric: z.number().optional(),
  verifiedAt: z.string().datetime(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

/**
 * Leaderboard rankings response.
 */
export const LeaderboardResponseSchema = z.object({
  levelId: z.string().min(1),
  mode: PlayModeSchema,
  totalEntries: z.number().int().nonnegative(),
  entries: z.array(LeaderboardEntrySchema),
  userEntry: LeaderboardEntrySchema.optional(),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
