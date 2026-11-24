import { MessageSquare } from "lucide-react";

/** Tela principal sem conversa aberta: convida a escolher uma na lateral. */
export default function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-md flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-card bg-surface-inset text-fg-muted">
          <MessageSquare size={24} aria-hidden />
        </div>
        <h1 className="text-title font-black text-fg">Escolha uma conversa</h1>
        <p className="text-body text-fg-muted">Abra um canal ou uma conversa direta na lateral, ou crie um canal.</p>
      </div>
    </div>
  );
}
