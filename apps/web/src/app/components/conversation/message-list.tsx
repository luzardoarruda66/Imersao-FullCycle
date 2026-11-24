"use client";

import type { ChatMessage } from "chat-events";
import { ArrowDown } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";
import { useMounted } from "@/app/utils/use-mounted";
import { formatTime, groupByDay } from "@/lib/messages";

/** A folga, em pixels, em que a rolagem ainda conta como "no fim". */
const BOTTOM_SLACK = 24;
/** A distância do começo, em pixels, a partir da qual a rolagem pede a página anterior. */
const TOP_TRIGGER = 48;

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

/** O topo da lista: carregar anteriores (por botão e por rolagem), carregando, falha com nova tentativa ou o começo da conversa. */
function HistoryTop({
  hasMore,
  loading,
  failed,
  onLoadOlder,
}: {
  hasMore: boolean;
  loading: boolean;
  failed: boolean;
  onLoadOlder: () => void;
}) {
  if (!hasMore) {
    return <p className="px-4 py-2 text-center text-small text-fg-muted">Início da conversa</p>;
  }
  if (loading) {
    return (
      <div role="status" aria-label="Carregando mensagens anteriores" className="flex justify-center py-2 text-fg-muted">
        <Spinner />
      </div>
    );
  }
  if (failed) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 px-4 py-2 text-small text-danger-fg">
        <p>Não foi possível carregar as mensagens anteriores.</p>
        <Button size="sm" variant="secondary" onClick={onLoadOlder}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-2">
      <Button size="sm" variant="ghost" onClick={onLoadOlder}>
        Carregar mensagens anteriores
      </Button>
    </div>
  );
}

/**
 * Lista das mensagens, da mais antiga para a mais nova, com o divisor de cada dia. Cuida da rolagem (LLD, "Cliente",
 * "Leituras e tempo real"): segue no fim quando já estava no fim, não se move quando a pessoa lê o histórico (e então
 * mostra "Novas mensagens"), mantém a posição quando a página anterior chega e pede essa página ao chegar ao começo.
 */
export function MessageList({
  messages,
  intro,
  hasMore = false,
  loadingOlder = false,
  loadError = false,
  onLoadOlder = () => {},
  onAtBottomChange = () => {},
}: {
  messages: ChatMessage[];
  intro: React.ReactNode;
  hasMore?: boolean;
  loadingOlder?: boolean;
  loadError?: boolean;
  onLoadOlder?: () => void;
  onAtBottomChange?: (atBottom: boolean) => void;
}) {
  const mounted = useMounted();
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const [hasNew, setHasNew] = useState(false);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const first = messages[0]?.id;
    const last = messages[messages.length - 1]?.id;
    const seen = previous.current;
    if (seen.first !== undefined && first !== seen.first && last === seen.last) {
      // A página anterior chegou: o que já estava na tela fica onde estava.
      element.scrollTop += element.scrollHeight - seen.height;
    } else if (last !== seen.last) {
      if (seen.last === undefined || atBottom.current) element.scrollTop = element.scrollHeight;
      else setHasNew(true);
    }
    previous.current = { first, last, height: element.scrollHeight };
  }, [messages]);

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const bottom = element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_SLACK;
    if (bottom !== atBottom.current) {
      atBottom.current = bottom;
      onAtBottomChange(bottom);
    }
    if (bottom) setHasNew(false);
    if (element.scrollTop < TOP_TRIGGER && hasMore && !loadingOlder && !loadError) onLoadOlder();
  }

  function jumpToBottom() {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
    if (!atBottom.current) onAtBottomChange(true);
    atBottom.current = true;
    setHasNew(false);
  }

  const groups = mounted ? groupByDay(messages, new Date()) : [{ key: "todas", label: "", messages }];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* `tabIndex`: a região rola, e quem usa só o teclado precisa chegar nela para ler o histórico (axe: scrollable-region-focusable). */}
      <div
        ref={scroller}
        role="log"
        aria-label="Mensagens"
        aria-live="polite"
        tabIndex={0}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="flex min-h-full flex-col justify-end py-4">
          {messages.length === 0 ? (
            intro
          ) : (
            <>
              <HistoryTop hasMore={hasMore} loading={loadingOlder} failed={loadError} onLoadOlder={onLoadOlder} />
              {groups.map((group) => (
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
              ))}
            </>
          )}
        </div>
      </div>
      {hasNew && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-pill bg-primary px-3 py-1 text-small font-bold text-on-primary shadow-2 transition-colors duration-100 hover:bg-primary-hover active:bg-primary-active"
        >
          <ArrowDown size={14} aria-hidden />
          Novas mensagens
        </button>
      )}
    </div>
  );
}
