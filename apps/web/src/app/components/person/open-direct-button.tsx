"use client";

import { MessageSquare } from "lucide-react";
import { useActionState } from "react";
import { openDirectAction, type OpenDirectState } from "@/app/actions/conversations";
import { Button } from "@/app/components/ui/button";

const IDLE: OpenDirectState = { status: "idle" };

/** "Enviar mensagem" no Perfil: a mesma Server Action da busca abre a conversa direta (a existente, se já houver) e leva até ela. */
export function OpenDirectButton({ personId }: { personId: string }) {
  const [state, formAction, pending] = useActionState(openDirectAction, IDLE);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="membroId" value={personId} />
      <Button type="submit" variant="secondary" icon={MessageSquare} loading={pending}>
        Enviar mensagem
      </Button>
      {state.status === "error" && !pending && (
        <p role="alert" className="text-small text-danger-fg">
          {state.message}
        </p>
      )}
    </form>
  );
}
