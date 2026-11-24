import { describe, expect, it } from 'vitest';
import {
  ActionTraceSchema,
  ApiErrorSchema,
  CodeExecutionRequestSchema,
  CodeExecutionResponseSchema,
  DiagnosticErrorSchema,
  EvaluationResultSchema,
  ExecutionOptionsSchema,
  LeaderboardQuerySchema,
  LeaderboardResponseSchema,
  ProgressItemSchema,
  SessionUserSchema,
  SubmissionVerifyRequestSchema,
  SubmissionVerifyResponseSchema,
  SyncPushRequestSchema,
  SyncPushResponseSchema,
} from './index.js';

describe('Worker RPC Schemas', () => {
  it('validates ExecutionOptions with defaults', () => {
    const parsed = ExecutionOptionsSchema.parse({});
    expect(parsed.timeoutMs).toBe(5000);

    const custom = ExecutionOptionsSchema.parse({
      timeoutMs: 3000,
      memoryLimitMb: 512,
      maxOutputLength: 10000,
    });
    expect(custom.timeoutMs).toBe(3000);
    expect(custom.memoryLimitMb).toBe(512);
  });

  it('validates CodeExecutionRequest with defaults', () => {
    const request = CodeExecutionRequestSchema.parse({
      code: 'print("hello")',
      levelId: 'w3-mountaineer-3.1',
      seed: 42,
    });
    expect(request.timeoutMs).toBe(5000);
    expect(request.mockEnv).toEqual({});
  });

  it('validates 4-part pedagogical DiagnosticError schema', () => {
    const diagnostic = DiagnosticErrorSchema.parse({
      errorType: 'GradientAscentError',
      whatHappened: 'Model weights moved uphill toward higher loss.',
      whereItOccurred: {
        line: 4,
        column: 12,
        sourceSnippet: 'w = w + lr * grad',
      },
      whyItMatters: 'Gradient descent must subtract the gradient to reach local or global minima.',
      whatToInvestigate: 'Check the sign of the update rule in step(): subtract instead of adding.',
      rawTraceback: 'Traceback (most recent call last):\n  File "main.py", line 4',
    });
    expect(diagnostic.errorType).toBe('GradientAscentError');
    expect(diagnostic.whereItOccurred.line).toBe(4);
  });

  it('validates CodeExecutionResponse', () => {
    const response = CodeExecutionResponseSchema.parse({
      success: true,
      executionTimeMs: 42.5,
      stdout: 'ok\n',
      stderr: '',
    });
    expect(response.success).toBe(true);
    expect(response.executionTimeMs).toBe(42.5);
  });
});

describe('API DTO Schemas', () => {
  const validSeedTrace = {
    seed: 104729,
    actionTrace: JSON.stringify([{ tick: 1, payload: { step: 0.1 } }]),
    clientTerminalHash: '0123456789abcdef',
  };

  it('strictly requires exactly 5 seed traces for SubmissionVerifyRequest', () => {
    const valid = {
      levelId: 'w3-mountaineer-3.1',
      mode: 'hacker' as const,
      seedTraces: [
        { ...validSeedTrace, seed: 1 },
        { ...validSeedTrace, seed: 2 },
        { ...validSeedTrace, seed: 3 },
        { ...validSeedTrace, seed: 4 },
        { ...validSeedTrace, seed: 5 },
      ],
    };
    const parsed = SubmissionVerifyRequestSchema.parse(valid);
    expect(parsed.seedTraces).toHaveLength(5);

    // Reject 4 seeds
    expect(() =>
      SubmissionVerifyRequestSchema.parse({
        ...valid,
        seedTraces: valid.seedTraces.slice(0, 4),
      }),
    ).toThrow('Verification strictly requires exactly 5 seed traces');

    // Reject 6 seeds
    expect(() =>
      SubmissionVerifyRequestSchema.parse({
        ...valid,
        seedTraces: [...valid.seedTraces, { ...validSeedTrace, seed: 6 }],
      }),
    ).toThrow('Verification strictly requires exactly 5 seed traces');
  });

  it('rejects invalid 16-hex clientTerminalHash in seed trace', () => {
    const invalid = {
      levelId: 'w3-mountaineer-3.1',
      mode: 'hacker' as const,
      seedTraces: [
        { ...validSeedTrace, seed: 1, clientTerminalHash: 'NOT_HEX' },
        { ...validSeedTrace, seed: 2 },
        { ...validSeedTrace, seed: 3 },
        { ...validSeedTrace, seed: 4 },
        { ...validSeedTrace, seed: 5 },
      ],
    };
    expect(() => SubmissionVerifyRequestSchema.parse(invalid)).toThrow(
      'clientTerminalHash must be a 16-character hexadecimal string',
    );
  });

  it('validates SubmissionVerifyResponse', () => {
    const response = SubmissionVerifyResponseSchema.parse({
      verified: true,
      verifiedSeeds: [1, 2, 3, 4, 5],
      serverTerminalHashes: ['0123456789abcdef'],
      starsAwarded: 3,
      globalRank: 1,
      percentile: 99.5,
      rejectionReason: 'REJECTED_STATE_DIVERGENCE',
    });
    expect(response.starsAwarded).toBe(3);
    expect(response.verified).toBe(true);
    expect(response.rejectionReason).toBe('REJECTED_STATE_DIVERGENCE');

    // Rejects legacy non-prefixed rejection reason
    expect(() =>
      SubmissionVerifyResponseSchema.parse({
        ...response,
        rejectionReason: 'HASH_MISMATCH',
      }),
    ).toThrow();
  });

  it('validates SyncPushRequest and SyncPushResponse', () => {
    const pushReq = SyncPushRequestSchema.parse({
      clientTimestamp: Date.now(),
      progressItems: [
        {
          levelId: 'w1-farm-1.1',
          starsEarned: 3,
          clearedModes: ['explorer', 'hacker'],
          bestScore: 100,
          updatedAt: Date.now(),
        },
      ],
    });
    expect(pushReq.progressItems).toHaveLength(1);

    const pushRes = SyncPushResponseSchema.parse({
      success: true,
      syncedLevelIds: ['w1-farm-1.1'],
      serverTimestamp: Date.now(),
    });
    expect(pushRes.success).toBe(true);
  });

  it('validates Leaderboard queries and responses', () => {
    const query = LeaderboardQuerySchema.parse({
      levelId: 'w3-mountaineer-3.1',
    });
    expect(query.mode).toBe('hacker');
    expect(query.limit).toBe(50);

    const res = LeaderboardResponseSchema.parse({
      levelId: 'w3-mountaineer-3.1',
      mode: 'hacker',
      totalEntries: 1,
      entries: [
        {
          rank: 1,
          username: 'ada_lovelace',
          score: 999,
          verifiedAt: new Date().toISOString(),
        },
      ],
    });
    expect(res.entries[0]?.username).toBe('ada_lovelace');
  });
});

describe('Common Entity Schemas', () => {
  it('validates SessionUser', () => {
    const user = SessionUserSchema.parse({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      username: 'turing',
      isGuest: false,
    });
    expect(user.isGuest).toBe(false);
  });

  it('validates ApiError', () => {
    const error = ApiErrorSchema.parse({
      code: 'REJECTED_STATE_DIVERGENCE',
      message: 'Terminal hash does not match.',
      timestamp: new Date().toISOString(),
    });
    expect(error.code).toBe('REJECTED_STATE_DIVERGENCE');
  });

  it('validates ActionTrace with 16-hex hash', () => {
    const trace = ActionTraceSchema.parse({
      levelId: 'w1-farm-1.1',
      mode: 'builder',
      seed: 12345,
      totalTicks: 60,
      actions: [{ tick: 1, type: 'STEP', params: {} }],
      clientTerminalHash: 'abcdef0123456789',
    });
    expect(trace.clientTerminalHash).toBe('abcdef0123456789');
    expect(trace.version).toBe('1.0.0');
  });

  it('validates ProgressItem constraints', () => {
    const item = ProgressItemSchema.parse({
      levelId: 'w1-farm-1.1',
      starsEarned: 2,
      clearedModes: ['explorer'],
      bestScore: 85,
      hintTierReached: 1,
      updatedAt: 1700000000000,
    });
    expect(item.starsEarned).toBe(2);

    // Reject stars > 3
    expect(() =>
      ProgressItemSchema.parse({
        ...item,
        starsEarned: 4,
      }),
    ).toThrow();
  });

  it('validates EvaluationResult', () => {
    const evalResult = EvaluationResultSchema.parse({
      success: true,
      starsAwarded: 3,
      executionTicks: 120,
      metrics: {
        efficiencyScore: 98.5,
        resourceUsage: 12,
      },
      terminalHash: '1234567890abcdef',
    });
    expect(evalResult.starsAwarded).toBe(3);
  });
});
