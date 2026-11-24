"use client";

import { Hash, Lock, Plus, SquarePen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CreateChannelDialog } from "@/app/components/conversation/create-channel-dialog";
import { NewDirectDialog } from "@/app/components/conversation/new-direct-dialog";
import { Avatar } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";
import { conversationPath, type ConversationList, type ConversationSummary, type MemberOption } from "@/lib/conversations";
import { getRealtimeClient } from "@/lib/realtime/realtime";

const ROW = "flex h-7 w-full items-center gap-2 rounded-item px-2 text-body transition-colors duration-100";

function ConversationLink({ conversation }: { conversation: ConversationSummary }) {
  const active = usePathname() === conversationPath(conversation.id);
  const Icon = conversation.tipo === "canal_privado" ? Lock : Hash;
  return (
    <Link
      href={conversationPath(conversation.id)}
      aria-current={active ? "page" : undefined}
      className={cn(ROW, active ? "bg-sidebar-active text-sidebar-on-active" : "text-sidebar-fg hover:bg-sidebar-hover")}
    >
      {conversation.tipo === "direta" ? <Avatar name={conversation.nome} size="xs" /> : <Icon size={16} aria-hidden />}
      <span className="truncate">{conversation.nome}</span>
    </Link>
  );
}

function ActionRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(ROW, "text-sidebar-fg hover:bg-sidebar-hover")}>
      <span aria-hidden className="flex size-4 items-center justify-center rounded-control bg-sidebar-field">
        <Plus size={12} />
      </span>
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `secao-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-0.5">
      <h2 id={id} className="px-2 py-1 text-small font-bold text-sidebar-fg">
        {title}
      </h2>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

/** Quando uma conversa passa a ser vista pela pessoa (canal novo, conversa direta, convite), a lista é relida. */
function RefreshOnNewConversation() {
  const router = useRouter();
  useEffect(() => getRealtimeClient().subscribe("conversa_visivel", () => router.refresh()), [router]);
  return null;
}

/** Lateral da casca (component `Sidebar`): canais públicos e privados, conversas diretas e as ações de criar e abrir. */
export function Sidebar({ list, members }: { list: ConversationList | null; members: MemberOption[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [directOpen, setDirectOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  // Abrir uma conversa (a ação redireciona para ela) fecha o diálogo que a abriu.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setCreateOpen(false);
    setDirectOpen(false);
  }

  const channels = list ? [...list.canais_publicos, ...list.canais_privados].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })) : [];

  return (
    <aside aria-label="Conversas" className="flex w-sidebar shrink-0 flex-col bg-sidebar text-sidebar-fg">
      <RefreshOnNewConversation />
      <div className="flex h-header shrink-0 items-center justify-between border-b border-sidebar-border px-4">
        <span className="text-title font-black text-sidebar-fg-strong">Full Cycle</span>
        <button
          type="button"
          aria-label="Nova conversa"
          onClick={() => setDirectOpen(true)}
          className="flex size-7 items-center justify-center rounded-control text-sidebar-fg transition-colors duration-100 hover:bg-sidebar-hover"
        >
          <SquarePen size={18} aria-hidden />
        </button>
      </div>
      <nav aria-label="Lista de conversas" className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
        {list === null ? (
          <div role="alert" className="flex flex-col items-start gap-2 px-2 text-small">
            <p>Não foi possível carregar suas conversas.</p>
            <Button size="sm" variant="secondary" loading={retrying} onClick={() => startRetry(() => router.refresh())}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <>
            <Section title="Canais">
              {channels.map((channel) => (
                <li key={channel.id}>
                  <ConversationLink conversation={channel} />
                </li>
              ))}
              <li>
                <ActionRow label="Adicionar canal" onClick={() => setCreateOpen(true)} />
              </li>
            </Section>
            <Section title="Conversas diretas">
              {list.diretas.map((direct) => (
                <li key={direct.id}>
                  <ConversationLink conversation={direct} />
                </li>
              ))}
              <li>
                <ActionRow label="Nova conversa" onClick={() => setDirectOpen(true)} />
              </li>
            </Section>
          </>
        )}
      </nav>
      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
      <NewDirectDialog open={directOpen} onOpenChange={setDirectOpen} members={members} />
    </aside>
  );
}
