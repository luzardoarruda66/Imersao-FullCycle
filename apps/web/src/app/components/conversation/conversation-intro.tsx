import { Hash, Lock, MessageSquare } from "lucide-react";
import type { ConversationType } from "@/lib/conversations";

/** Estado vazio (component `ConversationIntro`): a conversa ainda não tem mensagens, e o convite é a primeira. */
export function ConversationIntro({ type, name }: { type: ConversationType; name: string }) {
  const Icon = type === "direta" ? MessageSquare : type === "canal_privado" ? Lock : Hash;
  const title =
    type === "direta"
      ? `Esta é a sua conversa com ${name}`
      : type === "canal_privado"
        ? `Este é o começo do canal privado #${name}`
        : `Este é o começo do canal #${name}`;
  return (
    <div className="flex flex-col gap-2 px-4 py-6">
      <div className="flex size-12 items-center justify-center rounded-card bg-surface-inset text-fg-muted">
        <Icon size={24} aria-hidden />
      </div>
      <h2 className="text-heading font-black text-fg">{title}</h2>
      <p className="text-body text-fg-muted">Escreva a primeira mensagem para começar a conversa.</p>
    </div>
  );
}
