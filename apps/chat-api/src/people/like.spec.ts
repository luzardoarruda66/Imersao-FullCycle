import { escapeLike } from './like.js';

describe('escapeLike', () => {
  it('deixa o texto comum como está', () => {
    expect(escapeLike('maria.silva')).toBe('maria.silva');
    expect(escapeLike('')).toBe('');
  });

  it('protege %, _ e a barra, para valerem como texto no LIKE', () => {
    expect(escapeLike('50%')).toBe('50\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\');
  });
});
