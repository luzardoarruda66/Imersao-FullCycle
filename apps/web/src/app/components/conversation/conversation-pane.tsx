"use client";

import type { ChatMessage } from "chat-events";
import { useCallback, useEffect, useRef, useState } from "react";
import { markReadAction } from "@/app/actions/conversations";
import { MessageComposer } from "@/app/components/conversation/message-composer";
import { MessageList } from "@/app/components/conversation/message-list";
import { TypingIndicator } from "@/app/components/conversation/typing-indicator";
import { mergeMessages } from "@/lib/messages";
import { setReadingConversation } from "@/lib/open-conversation";
import { getRealtimeClient } from "@/lib/realtime/realtime";
import { fetchMessagePage, nextReadTarget } from "@/lib/reading";
import {
  TYPING_SEND_INTERVAL_MS,
  addTyper,
  pruneTypers,
  removeTyper,
  typingText,
  type TypingState,
} from "@/lib/typing";

/** Espera curta antes de registrar a leitura, para juntar mensagens que chegam seguidas. */
const READ_DELAY_MS = 300;

/**
 * A lista de mensagens e o campo de envio, com o estado da conversa aberta (LLD, seção 8, "Leituras e tempo real").
 * As mensagens chegam de quatro lugares e se juntam sem repetir (pelo id): a leitura do servidor, a página anterior
 * do histórico, a própria mensagem enviada e o evento `mensagem_criada`. Também cuida do "digitando" e de registrar
 * a leitura quando a aba está visível e a rolagem está no fim.
 */
export function ConversationPane({
  conversationId,
  placeholder,
  initialMessages,
  initialHasMore,
  intro,
  currentMemberId,
}: {
  conversationId: string;
  placeholder: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  intro: React.ReactNode;
  currentMemberId?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [seen, setSeen] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [typers, setTypers] = useState<TypingState>({});
  const [atBottom, setAtBottom] = useState(true);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  // O servidor releu a conversa (atualização da página, reconexão): junta o que veio com o que já estava na tela.
  if (initialMessages !== seen) {
    setSeen(initialMessages);
    setMessages((current) => mergeMessages(current, initialMessages));
  }

  useEffect(() => {
    const client = getRealtimeClient();
    const offMessages = client.subscribe("mensagem_criada", (event) => {
      // Mensagens de outras conversas só mudam a lista da lateral; aqui vale a conversa aberta.
      if (event.dados.conversa_id !== conversationId) return;
      setMessages((current) => mergeMessages(current, [event.dados.mensagem]));
      // Quem enviou a mensagem não está mais digitando.
      setTypers((current) => removeTyper(current, conversationId, event.dados.mensagem.autor.id));
    });
    const offTyping = client.subscribe("digitando", (event) => {
      if (event.dados.conversa_id !== conversationId) return;
      setTypers((current) => addTyper(current, conversationId, event.dados.pessoa, Date.now()));
    });
    return () => {
      offMessages();
      offTyping();
    };
  }, [conversationId]);

  // Enquanto alguém digita, confere a cada segundo quem passou do prazo.
  const someoneTyping = Object.keys(typers[conversationId] ?? {}).length > 0;
  useEffect(() => {
    if (!someoneTyping) return;
    const timer = setInterval(() => setTypers((current) => pruneTypers(current, Date.now())), 1000);
    return () => clearInterval(timer);
  }, [someoneTyping]);

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  // Leitura: só a aba visível, com a rolagem no fim, e a última mensagem carregada ainda não enviada.
  const lastSent = useRef<string | null>(null);
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]!.id : null;
  useEffect(() => {
    const reading = visible && atBottom;
    setReadingConversation(reading ? conversationId : null);
    const target = nextReadTarget({ visible, atBottom, lastMessageId, lastSentId: lastSent.current });
    if (!target) return;
    const timer = setTimeout(() => {
      const previous = lastSent.current;
      lastSent.current = target;
      void markReadAction(conversationId, target).then((result) => {
        // Falhou: tenta de novo na próxima mudança, em vez de dar a mensagem por lida.
        if (!result.ok && lastSent.current === target) lastSent.current = previous;
      });
    }, READ_DELAY_MS);
    return () => clearTimeout(timer);
  }, [conversationId, visible, atBottom, lastMessageId]);
  useEffect(() => () => setReadingConversation(null), []);

  const loadOlder = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    setLoadError(false);
    try {
      const page = await fetchMessagePage(conversationId, oldest.id);
      setMessages((current) => mergeMessages(current, page.mensagens));
      setHasMore(page.tem_mais);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder, messages]);

  const lastTypingSent = useRef(0);
  const sendTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < TYPING_SEND_INTERVAL_MS) return;
    lastTypingSent.current = now;
    getRealtimeClient().sendTyping(conversationId);
  };

  return (
    <>
      <MessageList
        currentMemberId={currentMemberId}
        messages={messages}
        intro={intro}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        loadError={loadError}
        onLoadOlder={() => void loadOlder()}
        onAtBottomChange={setAtBottom}
      />
      <TypingIndicator text={typingText(typers, conversationId)} />
      <MessageComposer
        conversationId={conversationId}
        placeholder={placeholder}
        onSent={(message) => {
          setMessages((current) => mergeMessages(current, [message]));
          // A mensagem enviada encerra o "digitando": o da próxima não espera o intervalo.
          lastTypingSent.current = 0;
        }}
        onTyping={sendTyping}
      />
    </>
  );
}
