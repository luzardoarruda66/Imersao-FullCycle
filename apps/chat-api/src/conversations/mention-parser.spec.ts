import { mentionCandidates, resolveMentions } from './mention-parser.js';

describe('mention-parser', () => {
  describe('mentionCandidates', () => {
    it('acha o @usuário no começo, depois de espaço e depois de pontuação', () => {
      expect(mentionCandidates('@ana oi')).toEqual(['ana']);
      expect(mentionCandidates('oi @ana e @bia')).toEqual(['ana', 'bia']);
      expect(mentionCandidates('oi (@ana)')).toEqual(['ana']);
      expect(mentionCandidates('oi\n@ana')).toEqual(['ana']);
    });

    it('ignora @ colado a uma palavra, como em e-mails', () => {
      expect(mentionCandidates('escreva para ana@empresa.com')).toEqual([]);
      expect(mentionCandidates('a@@bia')).toEqual([]);
    });

    it('guarda o @usuário em minúsculas e sem repetir', () => {
      expect(mentionCandidates('@Ana e @ana de novo')).toEqual(['ana']);
    });

    it('tira a pontuação do fim como alternativa', () => {
      expect(mentionCandidates('oi @bia.')).toEqual(['bia.', 'bia']);
      expect(mentionCandidates('oi @bia...')).toEqual(['bia...', 'bia..', 'bia.', 'bia']);
    });

    it('descarta o que não cabe no formato do @usuário', () => {
      expect(mentionCandidates('@ab')).toEqual([]);
      expect(mentionCandidates(`@${'a'.repeat(31)}`)).toEqual([]);
      expect(mentionCandidates(`@${'a'.repeat(30)}`)).toEqual(['a'.repeat(30)]);
      expect(mentionCandidates('@')).toEqual([]);
    });

    it('não confunde acento com parte do @usuário', () => {
      expect(mentionCandidates('@joão')).toEqual([]);
      expect(mentionCandidates('@joao!')).toEqual(['joao']);
    });
  });

  describe('resolveMentions', () => {
    it('devolve só quem existe, na ordem em que aparece, sem repetir', () => {
      const known = new Set(['ana', 'bia']);
      expect(resolveMentions('@bia @caio @ana @bia', known)).toEqual(['bia', 'ana']);
    });

    it('prefere o @usuário inteiro e cai para o sem pontuação do fim', () => {
      expect(resolveMentions('oi @bia.', new Set(['bia']))).toEqual(['bia']);
      expect(resolveMentions('oi @bia.', new Set(['bia.', 'bia']))).toEqual(['bia.']);
    });

    it('sem ninguém conhecido, não há menção', () => {
      expect(resolveMentions('@ninguem', new Set())).toEqual([]);
    });
  });
});
