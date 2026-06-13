import { z } from 'zod';

/**
 * packages/shared は「型の唯一の源」（DESIGN §7）。
 * メタ定義 → API → フォームで共有する Zod スキーマをここに集約していく。
 * フェーズ0 では基盤疎通の確認用に最小スキーマのみを置く。
 */

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  time: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export { z };
