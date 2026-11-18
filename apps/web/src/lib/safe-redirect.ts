/**
 * Destino guardado depois de entrar (LLD, seção 8, "Sessão no cliente"): só vale um caminho do próprio
 * produto, que começa com uma `/` e não com `//` nem `/\`. Qualquer outro vai para a tela principal.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== "string" || value === "") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  // O parser de URL ignora tab e quebra de linha: "/\t/outro.com" viraria "//outro.com".
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return "/";
  return value;
}
