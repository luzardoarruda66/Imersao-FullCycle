import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgres://x',
  WEB_ORIGIN: 'http://localhost:3000',
  TRUSTED_PROXY: 'loopback',
  REDIS_URL: 'redis://redis:6379',
};

describe('validateEnv', () => {
  it('aceita as variáveis obrigatórias e preenche os padrões', () => {
    expect(validateEnv(valid)).toMatchObject({ PORT: 3001, COOKIE_DOMAIN: '' });
  });

  it('derruba a subida com o nome da variável que falta', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...valid, TRUSTED_PROXY: undefined })).toThrow(/TRUSTED_PROXY/);
    expect(() => validateEnv({ ...valid, REDIS_URL: undefined })).toThrow(/REDIS_URL/);
  });
});
