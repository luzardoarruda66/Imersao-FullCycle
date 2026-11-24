import { deriveUsernames } from './1790000000002-Username.js';

describe('@usuário derivado dos e-mails das contas existentes', () => {
  it('usa a parte do e-mail antes do @, em minúsculas', () => {
    expect(deriveUsernames(['Maria.Silva@empresa.com'])).toEqual(['maria.silva']);
  });

  it('troca por _ o que não pertence ao formato', () => {
    expect(deriveUsernames(['joão+vendas@empresa.com'])).toEqual(['jo_o_vendas']);
  });

  it('completa com _ até 3 caracteres', () => {
    expect(deriveUsernames(['a@empresa.com', 'jo@empresa.com'])).toEqual(['a__', 'jo_']);
  });

  it('trunca em 30 caracteres', () => {
    const long = 'x'.repeat(40);
    expect(deriveUsernames([`${long}@empresa.com`])).toEqual(['x'.repeat(30)]);
  });

  it('acrescenta -2, -3 em colisão, na ordem recebida', () => {
    expect(deriveUsernames(['ana@a.com', 'ana@b.com', 'ANA@c.com'])).toEqual(['ana', 'ana-2', 'ana-3']);
  });

  it('mantém o sufixo dentro dos 30 caracteres', () => {
    const long = 'y'.repeat(35);
    const result = deriveUsernames([`${long}@a.com`, `${long}@b.com`]);
    expect(result).toEqual(['y'.repeat(30), `${'y'.repeat(28)}-2`]);
    expect(result.every((value) => value.length <= 30)).toBe(true);
  });

  it('não repete um @usuário que já saiu de um sufixo', () => {
    // `ana-2` já existe como parte local de outra conta: a segunda "ana" pula para -3.
    expect(deriveUsernames(['ana@a.com', 'ana-2@a.com', 'ana@b.com'])).toEqual(['ana', 'ana-2', 'ana-3']);
  });
});
