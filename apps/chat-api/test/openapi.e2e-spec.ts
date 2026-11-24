import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOpenApiDocument } from '../src/openapi/document.js';
import { createTestApp, type TestApp } from './support/test-app.js';

describe('Snapshot OpenAPI', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('o openapi.json gravado bate com o contrato do código (rode `pnpm openapi` ao mudar a API)', () => {
    const generated = JSON.parse(JSON.stringify(buildOpenApiDocument(t.app)));
    const stored = JSON.parse(readFileSync(join(import.meta.dirname, '../openapi.json'), 'utf8'));
    expect(stored).toEqual(generated);
    expect(Object.keys(generated.paths)).toEqual([
      '/v1/sessoes',
      '/v1/sessoes/atual',
      '/v1/eu',
      '/v1/eu/senha',
      '/v1/conversas',
      '/v1/conversas/canais',
      '/v1/conversas/diretas',
      '/v1/conversas/{id}',
      '/v1/conversas/{id}/participantes',
      '/v1/conversas/{id}/mensagens',
      '/v1/conversas/{id}/leitura',
      '/v1/membros',
      '/v1/pessoas',
      '/v1/pessoas/{id}',
    ]);
  });
});
