import { isValidUsername, normalizeUsername } from './username-rule.js';

describe('normalização do @usuário', () => {
  it('apara as pontas, põe em minúsculas e aceita o @ inicial', () => {
    expect(normalizeUsername('  @Maria.Silva ')).toBe('maria.silva');
    expect(normalizeUsername('maria')).toBe('maria');
  });

  it('tira só um @ inicial', () => {
    expect(normalizeUsername('@@maria')).toBe('@maria');
  });

  it('não mexe no que está no meio', () => {
    expect(normalizeUsername('ma@ria')).toBe('ma@ria');
  });
});

describe('formato do @usuário', () => {
  it('aceita letras minúsculas, números, ponto, hífen e sublinhado', () => {
    for (const value of ['ana', 'joao.silva', 'joao_silva', 'joao-silva', 'a1b', 'x'.repeat(30)]) {
      expect(isValidUsername(value), value).toBe(true);
    }
  });

  it('recusa o que tem menos de 3 ou mais de 30 caracteres', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('')).toBe(false);
    expect(isValidUsername('x'.repeat(31))).toBe(false);
  });

  it('recusa maiúsculas, espaços, acentos e outros símbolos', () => {
    for (const value of ['Ana', 'ana silva', 'joão', 'ana!', 'ana@x', '@ana', 'ana/x']) {
      expect(isValidUsername(value), value).toBe(false);
    }
  });
});
