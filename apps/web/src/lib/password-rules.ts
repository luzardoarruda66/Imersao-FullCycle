/** Mensagens da regra da senha (LLD, seção 9), por código devolvido em `details.regras_faltando`. */
export const PASSWORD_RULE_HINT = "Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo.";

const MISSING: Record<string, string> = {
  minimo_8_caracteres: "pelo menos 8 caracteres",
  maiuscula: "uma letra maiúscula",
  minuscula: "uma letra minúscula",
  numero: "um número",
  simbolo: "um símbolo",
};

/** "Falta: um número e um símbolo." (frame `Erro de campo`): diz exatamente quais regras faltaram. */
export function missingRulesMessage(codes: unknown): string {
  const list = (Array.isArray(codes) ? codes : []).map((code) => MISSING[String(code)]).filter(Boolean);
  if (list.length === 0) return "A nova senha não cumpre a regra.";
  const text = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
  return `Falta: ${text}.`;
}
