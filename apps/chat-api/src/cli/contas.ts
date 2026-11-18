import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { runContas } from './contas.command.js';

// App standalone do Nest: sobe o contexto, roda o subcomando e sai, sem abrir porta.
const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
try {
  const { code, out, err } = await runContas(process.argv.slice(2), app);
  if (out) console.log(out);
  if (err) console.error(err);
  process.exitCode = code;
} finally {
  await app.close();
}
