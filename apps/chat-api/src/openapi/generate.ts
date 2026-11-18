import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { configureApp } from '../app.setup.js';
import { buildOpenApiDocument } from './document.js';

// Grava o snapshot do contrato em `apps/chat-api/openapi.json` (LLD, "Onde mora cada fato").
const app = await NestFactory.create(AppModule, { logger: ['error'] });
configureApp(app);
await app.init();
const document = buildOpenApiDocument(app);
writeFileSync(join(process.cwd(), 'openapi.json'), JSON.stringify(document, null, 2) + '\n');
await app.close();
