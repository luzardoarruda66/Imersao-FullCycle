"use client";

import type { ChatMessage } from "chat-events";
import { useEffect, useRef } from "react";
import { Avatar } from "@/app/components/ui/avatar";
import { useMounted } from "@/app/utils/use-mounted";
import { formatTime, groupByDay } from "@/lib/messages";

function MessageItem({ message, mounted }: { message: ChatMessage; mounted: boolean }) {
  return (
    <li className="flex gap-3 px-4 py-1">
      <Avatar name={message.autor.nome} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-body font-black text-fg">{message.autor.nome}</span>
          {/* A hora vem do fuso do navegador: só depois da hidratação, para não divergir do HTML do servidor. */}
          <time dateTime={message.criada_em} className="text-caption text-fg-muted">
            {mounted ? formatTime(new Date(message.criada_em)) : ""}
          </time>
        </div>
        <p className="text-body break-words whitespace-pre-wrap text-fg">{message.texto}</p>
      </div>
    </li>
  );
}

/** Lista das mensagens, da mais antiga para a mais nova, com o divisor de cada dia; rola até a mais nova. */
export function MessageList({ messages, intro }: { messages: ChatMessage[]; intro: React.ReactNode }) {
  const mounted = useMounted();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length]);

  const groups = mounted ? groupByDay(messages, new Date()) : [{ key: "todas", label: "", messages }];

  return (
    <div ref={scroller} role="log" aria-label="Mensagens" aria-live="polite" className="flex-1 overflow-y-auto">
      <div className="flex min-h-full flex-col justify-end py-4">
        {messages.length === 0 ? (
          intro
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label || undefined}>
              {group.label && (
                <div className="flex items-center gap-3 px-4 py-3" aria-hidden>
                  <hr className="flex-1 border-border-subtle" />
                  <span className="rounded-pill border border-border px-3 py-0.5 text-caption font-bold text-fg-muted">{group.label}</span>
                  <hr className="flex-1 border-border-subtle" />
                </div>
              )}
              <ul>
                {group.messages.map((message) => (
                  <MessageItem key={message.id} message={message} mounted={mounted} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
