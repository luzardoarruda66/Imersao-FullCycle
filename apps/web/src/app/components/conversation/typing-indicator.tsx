/**
 * A linha "@usuário está digitando" acima do campo de mensagem (component `TypingIndicator`). A região educada fica
 * sempre no DOM e só o texto muda, para o leitor de tela anunciar sem interromper; `aria-atomic` evita ler pedaços.
 */
export function TypingIndicator({ text }: { text: string | null }) {
  return (
    <div role="status" aria-live="polite" aria-atomic className="h-5 shrink-0 px-4 text-small text-fg-muted">
      {text}
    </div>
  );
}
