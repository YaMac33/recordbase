import { buildApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const app = buildApp(env);

app
  .listen({ host: env.HOST, port: env.PORT })
  .then((address) => {
    app.log.info(`recordbase API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
