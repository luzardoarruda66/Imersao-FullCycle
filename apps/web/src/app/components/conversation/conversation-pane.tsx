"use client";

import type { ChatMessage } from "chat-events";
import { useEffect, useState } from "react";
import { MessageComposer } from "@/app/components/conversation/message-composer";
import { MessageList } from "@/app/components/conversation/message-list";
import { getRealtimeClient } from "@/lib/realtime/realtime";
import { mergeMessages } from "@/lib/messages";

/**
 * A lista de mensagens e o campo de envio, com o estado das mensagens da conversa aberta. Elas chegam de três
 * lugares e se juntam sem repetir (pelo id): a leitura do servidor, a própria mensagem enviada e o evento
 * `mensagem_criada` do tempo real (LLD, seção 8, "Leituras e tempo real").
 */
export function ConversationPane({
  conversationId,
  placeholder,
  initialMessages,
  intro,
}: {
  conversationId: string;
  placeholder: string;
  initialMessages: ChatMessage[];
  intro: React.ReactNode;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [seen, setSeen] = useState(initialMessages);
  // O servidor releu a conversa (atualização da página, reconexão): junta o que veio com o que já estava na tela.
  if (initialMessages !== seen) {
    setSeen(initialMessages);
    setMessages((current) => mergeMessages(current, initialMessages));
  }

  useEffect(() => {
    return getRealtimeClient().subscribe("mensagem_criada", (event) => {
      // Mensagens de outras conversas são da F1-04 (não lidas); aqui só vale a conversa aberta.
      if (event.dados.conversa_id !== conversationId) return;
      setMessages((current) => mergeMessages(current, [event.dados.mensagem]));
    });
  }, [conversationId]);

  return (
    <>
      <MessageList messages={messages} intro={intro} />
      <MessageComposer
        conversationId={conversationId}
        placeholder={placeholder}
        onSent={(message) => setMessages((current) => mergeMessages(current, [message]))}
      />
    </>
  );
}
