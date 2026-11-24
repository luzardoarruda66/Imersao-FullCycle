"use client";

import type { ChatMessage } from "chat-events";
import { SendHorizontal } from "lucide-react";
import { useActionState, useId, useLayoutEffect, useRef, useState } from "react";
import useSWR from "swr";
import { sendMessageAction, type SendMessageState } from "@/app/actions/conversations";
import { MentionList, mentionOptionId } from "@/app/components/conversation/mention-list";
import { cn } from "@/app/utils/cn";
import { activeMention, insertMention } from "@/lib/mentions";
import type { PersonSummary } from "@/lib/people";
import { MESSAGE_TEXT_MAX } from "@/lib/schemas";

const IDLE: SendMessageState = { status: "idle" };
const OVER_LIMIT = "A mensagem passa de 4.000 caracteres. Divida o texto em mais de uma mensagem.";

/** Os participantes que a pessoa pode mencionar, pela rota do BFF; a leitura anterior é cancelada a cada digitação. */
async function fetchMentionable(url: string, signal: AbortSignal): Promise<PersonSummary[]> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("A busca falhou.");
  return ((await response.json()) as { pessoas: PersonSummary[] }).pessoas;
}

/**
 * Campo de envio (component `MessageComposer`): Enter envia, Shift+Enter quebra a linha, limite de 4.000 caracteres.
 * Se o envio falha, o texto fica no campo para tentar de novo sem digitar tudo. Digitar `@` abre a lista dos
 * participantes da conversa (setas, Enter ou Tab escolhem, Esc fecha); com a lista aberta e com resultado, Enter
 * escolhe em vez de enviar.
 */
export function MessageComposer({
  conversationId,
  placeholder,
  onSent,
  onTyping,
}: {
  conversationId: string;
  placeholder: string;
  onSent: (message: ChatMessage) => void;
  /** Chamado quando a pessoa digita texto; quem usa limita a frequência. */
  onTyping?: () => void;
}) {
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Esc fecha a lista para o `@` que estava aberto; digitar de novo a reabre.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const listId = useId();
  const [state, formAction, pending] = useActionState(
    async (previous: SendMessageState, formData: FormData) => {
      const result = await sendMessageAction(conversationId, previous, formData);
      if (result.status === "sent") {
        setText("");
        onSent(result.message);
      }
      return result;
    },
    IDLE,
  );

  const open = activeMention(text, caret);
  const listOpen = open !== null && dismissedAt !== open.start;
  const {
    data: people,
    error: mentionError,
    isLoading: mentionLoading,
  } = useSWR(
    listOpen ? `/api/conversas/${encodeURIComponent(conversationId)}/mencionaveis?busca=${encodeURIComponent(open.term)}` : null,
    (url: string) => {
      inflight.current?.abort();
      inflight.current = new AbortController();
      return fetchMentionable(url, inflight.current.signal);
    },
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true },
  );
  const inflight = useRef<AbortController | null>(null);
  const choices = listOpen ? (people ?? []) : [];
  const active = Math.min(activeIndex, Math.max(choices.length - 1, 0));
  const activeId = choices[active] ? mentionOptionId(listId, choices[active]) : undefined;

  // Depois de escolher, o cursor vai para o fim do @usuário inserido.
  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    field.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [text]);

  function choose(person: PersonSummary) {
    if (!open) return;
    const next = insertMention(text, open, person.usuario);
    pendingCaret.current = next.caret;
    setText(next.text);
    setCaret(next.caret);
    setActiveIndex(0);
    field.current?.focus();
  }

  const overLimit = text.trim().length > MESSAGE_TEXT_MAX;
  const empty = text.trim().length === 0;
  const canSend = !empty && !overLimit && !pending;
  const error = overLimit ? OVER_LIMIT : state.status === "error" ? state.message : undefined;

  return (
    <form ref={form} action={formAction} className="relative shrink-0 px-4 pb-4">
      {listOpen && (
        <MentionList
          id={listId}
          people={choices}
          activeIndex={active}
          status={mentionError ? "error" : mentionLoading ? "loading" : "ready"}
          onChoose={choose}
        />
      )}
      <div
        className={cn(
          "flex flex-col gap-1 rounded-card border border-border-strong bg-surface px-3 py-2",
          "focus-within:border-focus focus-within:ring-4 focus-within:ring-focus/30",
          error && "border-danger focus-within:border-danger focus-within:ring-danger/25",
        )}
      >
        <textarea
          ref={field}
          name="texto"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "composer-erro" : undefined}
          placeholder={placeholder}
          rows={1}
          value={text}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
          onChange={(event) => {
            setText(event.target.value);
            setCaret(event.target.selectionStart);
            setActiveIndex(0);
            setDismissedAt(null);
            // Só com texto: o campo vazio ou de espaços não avisa ninguém.
            if (event.target.value.trim().length > 0) onTyping?.();
          }}
          onKeyDown={(event) => {
            if (listOpen && !event.nativeEvent.isComposing) {
              if (event.key === "Escape") {
                event.preventDefault();
                setDismissedAt(open.start);
                return;
              }
              if (choices.length > 0) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  setActiveIndex((active + step + choices.length) % choices.length);
                  return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  if (event.key === "Enter" && event.shiftKey) return;
                  event.preventDefault();
                  choose(choices[active]!);
                  return;
                }
              }
            }
            // Enter envia; Shift+Enter quebra a linha; Enter durante a composição de uma tecla morta ou IME não envia.
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (canSend) form.current?.requestSubmit();
          }}
          className="max-h-40 min-h-6 w-full resize-none [field-sizing:content] bg-transparent text-body text-fg placeholder:text-fg-muted focus-visible:outline-none"
        />
        <div className="flex items-center justify-end gap-3">
          <span className="hidden text-caption text-fg-muted sm:block">
            <kbd className="rounded-control bg-surface-inset px-1">Shift</kbd> + <kbd className="rounded-control bg-surface-inset px-1">Enter</kbd> para nova linha
          </span>
          <button
            type="submit"
            aria-label="Enviar mensagem"
            disabled={!canSend}
            className="flex size-7 items-center justify-center rounded-control bg-primary text-on-primary transition-colors duration-100 hover:bg-primary-hover active:bg-primary-active disabled:bg-transparent disabled:text-fg-subtle"
          >
            <SendHorizontal size={16} aria-hidden />
          </button>
        </div>
      </div>
      {error && (
        <p id="composer-erro" role="alert" className="pt-1 text-small text-danger-fg">
          {error}
        </p>
      )}
    </form>
  );
}
