"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";
import { MESSAGE_OVER_LIMIT, MESSAGE_TEXT_MAX } from "@/lib/schemas";

/**
 * `MessageEditor`: a edição no lugar da mensagem. Enter salva, Shift+Enter quebra a linha e Esc cancela. Salvar fica
 * desabilitado com o texto vazio, igual ao atual ou acima de 4.000 caracteres. O erro da API aparece abaixo do campo,
 * que continua aberto com o que a pessoa escreveu.
 */
export function MessageEditor({
  initial,
  error,
  pending = false,
  onSave,
  onCancel,
}: {
  initial: string;
  error?: string;
  pending?: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const field = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();

  // Abre com o foco no fim do texto, para corrigir sem clicar.
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  const text = value.trim();
  const overLimit = text.length > MESSAGE_TEXT_MAX;
  const canSave = !pending && text.length > 0 && text !== initial.trim() && !overLimit;
  const message = overLimit ? MESSAGE_OVER_LIMIT : error;

  return (
    <div className="flex flex-col gap-2 pt-1">
      <textarea
        ref={field}
        aria-label="Editar mensagem"
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        rows={1}
        value={value}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          // Enter salva; Shift+Enter quebra a linha; Enter durante a composição de uma tecla morta ou IME não salva.
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (canSave) onSave(text);
        }}
        className={cn(
          "max-h-40 min-h-9 w-full resize-none [field-sizing:content] rounded-card border border-border-strong bg-surface px-3 py-2 text-body text-fg disabled:opacity-60",
          "focus-visible:border-focus focus-visible:ring-4 focus-visible:ring-focus/30 focus-visible:outline-none",
          message && "border-danger focus-visible:border-danger focus-visible:ring-danger/25",
        )}
      />
      {message && (
        <p id={errorId} role="alert" className="text-small text-danger-fg">
          {message}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!canSave} loading={pending} onClick={() => onSave(text)}>
          Salvar
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
        <span className="text-caption text-fg-muted">
          <kbd className="rounded-control bg-surface-inset px-1">Enter</kbd> salva · <kbd className="rounded-control bg-surface-inset px-1">Esc</kbd> cancela
        </span>
      </div>
    </div>
  );
}
