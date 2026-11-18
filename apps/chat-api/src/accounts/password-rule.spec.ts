import { generatePassword, missingPasswordRules } from './password-rule.js';

describe('regra da senha', () => {
  it('aceita uma senha que cumpre tudo', () => {
    expect(missingPasswordRules('Abcdef1!')).toEqual([]);
  });

  it('lista todas as regras que faltaram', () => {
    expect(missingPasswordRules('abc')).toEqual(['minimo_8_caracteres', 'maiuscula', 'numero', 'simbolo']);
    expect(missingPasswordRules('ABCDEFGH')).toEqual(['minuscula', 'numero', 'simbolo']);
  });

  it('a senha gerada cumpre a regra', () => {
    for (let i = 0; i < 50; i++) expect(missingPasswordRules(generatePassword())).toEqual([]);
  });
});
