"use client";

import type { ChatMessage } from "chat-events";
import { SendHorizontal } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { sendMessageAction, type SendMessageState } from "@/app/actions/conversations";
import { cn } from "@/app/utils/cn";
import { MESSAGE_TEXT_MAX } from "@/lib/schemas";

const IDLE: SendMessageState = { status: "idle" };
const OVER_LIMIT = "A mensagem passa de 4.000 caracteres. Divida o texto em mais de uma mensagem.";

/**
 * Campo de envio (component `MessageComposer`): Enter envia, Shift+Enter quebra a linha, limite de 4.000 caracteres.
 * Se o envio falha, o texto fica no campo para tentar de novo sem digitar tudo.
 */
export function MessageComposer({
  conversationId,
  placeholder,
  onSent,
}: {
  conversationId: string;
  placeholder: string;
  onSent: (message: ChatMessage) => void;
}) {
  const [text, setText] = useState("");
  const form = useRef<HTMLFormElement>(null);
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

  const overLimit = text.trim().length > MESSAGE_TEXT_MAX;
  const empty = text.trim().length === 0;
  const canSend = !empty && !overLimit && !pending;
  const error = overLimit ? OVER_LIMIT : state.status === "error" ? state.message : undefined;

  return (
    <form ref={form} action={formAction} className="shrink-0 px-4 pb-4">
      <div
        className={cn(
          "flex flex-col gap-1 rounded-card border border-border-strong bg-surface px-3 py-2",
          "focus-within:border-focus focus-within:ring-4 focus-within:ring-focus/30",
          error && "border-danger focus-within:border-danger focus-within:ring-danger/25",
        )}
      >
        <textarea
          name="texto"
          aria-label={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "composer-erro" : undefined}
          placeholder={placeholder}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
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
