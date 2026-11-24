/**
 * Copia o texto para a área de transferência. Devolve `false` quando o navegador recusa (sem permissão) ou não tem a
 * API (contexto inseguro), para a tela avisar a falha em vez de fingir que copiou.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
