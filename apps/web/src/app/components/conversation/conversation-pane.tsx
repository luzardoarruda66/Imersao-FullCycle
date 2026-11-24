"use client";

import type { ChatMessage } from "chat-events";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteMessageAction, editMessageAction, markReadAction } from "@/app/actions/conversations";
import { MessageComposer } from "@/app/components/conversation/message-composer";
import { MessageList } from "@/app/components/conversation/message-list";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { TypingIndicator } from "@/app/components/conversation/typing-indicator";
import { applyDelete, applyEdit, excerptOf, mergeMessages } from "@/lib/messages";
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
  // A mensagem que a próxima vai citar.
  const [quote, setQuote] = useState<ChatMessage | null>(null);
  // A mensagem em edição (uma por vez), se está salvando e o erro da última tentativa.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();
  // A mensagem que a pessoa pediu para apagar e está no diálogo de confirmação, com o estado do pedido.
  const [deleting, setDeleting] = useState<{ message: ChatMessage; pending: boolean; error?: string } | null>(null);
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
    const offEdited = client.subscribe("mensagem_editada", (event) => {
      if (event.dados.conversa_id !== conversationId) return;
      setMessages((current) => applyEdit(current, event.dados.mensagem));
    });
    const offDeleted = client.subscribe("mensagem_apagada", (event) => {
      if (event.dados.conversa_id !== conversationId) return;
      const id = event.dados.mensagem_id;
      setMessages((current) => applyDelete(current, id));
      // O que dependia da mensagem some junto: a citação no campo, o editor aberto e o pedido de confirmação.
      setQuote((current) => (current?.id === id ? null : current));
      setEditingId((current) => (current === id ? null : current));
      setDeleting((current) => (current?.message.id === id ? null : current));
    });
    const offTyping = client.subscribe("digitando", (event) => {
      if (event.dados.conversa_id !== conversationId) return;
      setTypers((current) => addTyper(current, conversationId, event.dados.pessoa, Date.now()));
    });
    return () => {
      offMessages();
      offEdited();
      offDeleted();
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

  // A mensagem que a pessoa pediu para ver ao clicar numa citação: rola até ela assim que está na tela (ela pode ter
  // acabado de chegar numa página do histórico, e então o efeito abaixo a acha depois da renderização).
  const pendingScroll = useRef<string | null>(null);
  const flushScroll = useCallback(() => {
    const id = pendingScroll.current;
    const element = id ? document.getElementById(`mensagem-${id}`) : null;
    if (!element) return;
    pendingScroll.current = null;
    element.scrollIntoView?.({ block: "center" });
    // O foco vai para a mensagem: quem usa teclado ou leitor de tela continua dali, e a barra de ações a destaca.
    element.focus({ preventScroll: true });
  }, []);
  useEffect(() => flushScroll(), [messages, flushScroll]);

  // O que `goToMessage` lê no meio de uma espera: o estado de agora, e não o da renderização em que ele nasceu.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const messagesRef = useRef(messages);
  const hasMoreRef = useRef(hasMore);
  useEffect(() => {
    messagesRef.current = messages;
    hasMoreRef.current = hasMore;
  });

  /** Vai até a mensagem citada; se ela não está carregada, carrega o histórico página a página até achá-la (ou acabar). */
  const goToMessage = useCallback(
    async (id: string) => {
      if (!messagesRef.current.some((m) => m.id === id)) {
        let oldest = messagesRef.current[0]?.id;
        let more = hasMoreRef.current;
        let found = false;
        setLoadingOlder(true);
        try {
          while (more && oldest && alive.current) {
            const page = await fetchMessagePage(conversationId, oldest);
            setMessages((current) => mergeMessages(current, page.mensagens));
            more = page.tem_mais;
            setHasMore(more);
            if (page.mensagens.some((m) => m.id === id)) {
              found = true;
              break;
            }
            // Uma página vazia, ou que não anda para trás, encerra a busca em vez de repetir o mesmo pedido.
            const next = page.mensagens[0]?.id;
            if (!next || next === oldest) break;
            oldest = next;
          }
        } catch {
          // cai no aviso abaixo
        } finally {
          setLoadingOlder(false);
        }
        if (!found) {
          toast.error("Não foi possível encontrar a mensagem citada");
          return;
        }
      }
      pendingScroll.current = id;
      flushScroll();
    },
    [conversationId, flushScroll],
  );

  const startEdit = (message: ChatMessage) => {
    setEditingId(message.id);
    setEditError(undefined);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditError(undefined);
  };
  const saveEdit = async (messageId: string, text: string) => {
    setEditPending(true);
    setEditError(undefined);
    try {
      const result = await editMessageAction(conversationId, messageId, text);
      if (result.status === "edited") {
        setMessages((current) => applyEdit(current, result.message));
        setEditingId(null);
      } else {
        setEditError(result.message);
      }
    } finally {
      setEditPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { message } = deleting;
    setDeleting({ message, pending: true });
    const result = await deleteMessageAction(conversationId, message.id);
    if (result.status === "deleted") {
      setMessages((current) => applyDelete(current, message.id));
      setDeleting(null);
    } else {
      setDeleting({ message, pending: false, error: result.message });
    }
  };

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
        onQuote={setQuote}
        onEdit={startEdit}
        onDelete={(message) => setDeleting({ message, pending: false })}
        editing={editingId ? { messageId: editingId, pending: editPending, error: editError, onSave: (text) => void saveEdit(editingId, text), onCancel: cancelEdit } : undefined}
        onGoToMessage={(id) => void goToMessage(id)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Apagar mensagem?"
        description="Ela some da conversa para todo mundo. Não dá para desfazer."
        quote={deleting ? excerptOf(deleting.message.texto) : undefined}
        confirmLabel="Apagar"
        tone="destructive"
        pending={deleting?.pending}
        error={deleting?.error}
        onConfirm={() => void confirmDelete()}
      />
      <TypingIndicator text={typingText(typers, conversationId)} />
      <MessageComposer
        conversationId={conversationId}
        placeholder={placeholder}
        quote={quote}
        onCancelQuote={() => setQuote(null)}
        onSent={(message) => {
          setMessages((current) => mergeMessages(current, [message]));
          setQuote(null);
          // A mensagem enviada encerra o "digitando": o da próxima não espera o intervalo.
          lastTypingSent.current = 0;
        }}
        onTyping={sendTyping}
      />
    </>
  );
}
