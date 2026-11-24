/**
 * A chave do par de uma conversa direta: `menorId:maiorId`. O índice único sobre ela garante uma
 * conversa só por par, qualquer que seja a ordem em que os dois se escolhem (LLD, "Concorrência e idempotência").
 */
export const directKey = (a: string, b: string): string => [a, b].sort().join(':');
