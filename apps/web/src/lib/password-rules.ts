/** Mensagens da regra da senha (LLD, seção 9), por código devolvido em `details.regras_faltando`. */
export const PASSWORD_RULE_HINT = "Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo.";

const MESSAGES: Record<string, string> = {
  minimo_8_caracteres: "Use no mínimo 8 caracteres.",
  maiuscula: "Inclua uma letra maiúscula.",
  minuscula: "Inclua uma letra minúscula.",
  numero: "Inclua um número.",
  simbolo: "Inclua um símbolo.",
};

export function missingRulesMessage(codes: unknown): string {
  const list = Array.isArray(codes) ? codes : [];
  const messages = list.map((code) => MESSAGES[String(code)]).filter(Boolean);
  return messages.length > 0 ? messages.join(" ") : "A nova senha não cumpre a regra.";
}
