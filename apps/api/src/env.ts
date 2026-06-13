import { z } from '@recordbase/shared';

/**
 * 環境変数は Zod で検証してから使う（設計の鉄則：型は一元化）。
 * フェーズ0 では API 起動に必要な最小項目のみ。DATABASE_URL はフェーズ1以降で必須化する。
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`環境変数の検証に失敗しました:\n${issues}`);
  }
  return parsed.data;
}
