import cors from '@fastify/cors';
import { healthResponseSchema, type HealthResponse } from '@recordbase/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Env } from './env.js';

/**
 * Fastify インスタンスの組み立て。テストからも呼べるよう listen とは分離する。
 */
export function buildApp(env: Env): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  app.register(cors, { origin: env.WEB_ORIGIN });

  app.get('/healthz', async (): Promise<HealthResponse> => {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'recordbase-api',
      time: new Date().toISOString(),
    });
  });

  return app;
}
