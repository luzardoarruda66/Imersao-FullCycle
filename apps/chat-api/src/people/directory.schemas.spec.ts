import { searchPeopleSchema } from './directory.schemas.js';

describe('searchPeopleSchema', () => {
  it('aceita o termo, e a busca ausente vira vazia', () => {
    expect(searchPeopleSchema.parse({ busca: 'maria' })).toEqual({ busca: 'maria' });
    expect(searchPeopleSchema.parse({})).toEqual({ busca: '' });
  });

  it('recusa o parâmetro repetido e o que não é texto', () => {
    expect(searchPeopleSchema.safeParse({ busca: ['a', 'b'] }).success).toBe(false);
    expect(searchPeopleSchema.safeParse({ busca: 1 }).success).toBe(false);
  });

  it('ignora parâmetros que não conhece', () => {
    expect(searchPeopleSchema.parse({ busca: 'a', outro: 'x' })).toEqual({ busca: 'a' });
  });
});
