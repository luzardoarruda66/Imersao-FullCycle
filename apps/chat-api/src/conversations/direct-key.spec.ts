import { directKey } from './direct-key.js';

describe('directKey', () => {
  it('não depende da ordem do par', () => {
    expect(directKey('b', 'a')).toBe(directKey('a', 'b'));
    expect(directKey('a', 'b')).toBe('a:b');
  });

  it('distingue pares diferentes', () => {
    expect(directKey('a', 'b')).not.toBe(directKey('a', 'c'));
  });

  it('não altera os argumentos', () => {
    const ids = ['b', 'a'] as const;
    directKey(ids[0], ids[1]);
    expect(ids).toEqual(['b', 'a']);
  });
});
