import { z } from 'zod';

export const EnvSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']).default('development'),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(false),
  BASE_URL: z.string().default('/'),
  VITE_API_URL: z.string().url().default('http://localhost:3000'),
  VITE_APP_TITLE: z.string().min(1).default('Tensorcade'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(rawEnv: Record<string, unknown> = import.meta.env ?? {}): Env {
  const result = EnvSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `[${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment variable validation failed:\n${errorDetails}`);
  }
  return result.data;
}

export const env: Env = validateEnv();
