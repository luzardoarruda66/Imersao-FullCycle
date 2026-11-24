import Link from "next/link";

/**
 * Tela de conversa inexistente (frame `Canais / Conversa / Conversa não encontrada`). É a mesma para o id que não existe
 * e para o canal privado ou a conversa direta de que a pessoa não participa: a tela não revela se a conversa existe.
 */
export function ConversationNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-md flex-col items-center gap-2 px-6 py-12 text-center">
        <h1 className="text-title font-black text-fg">Conversa não encontrada</h1>
        <p className="text-body text-fg-muted">Ela não existe ou você não participa dela.</p>
        <Link href="/" className="text-body text-link hover:text-link-hover hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
