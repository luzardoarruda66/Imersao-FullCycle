"use client";

import { WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/app/components/ui/button";

/** Porta "Erro de sessão": a API do chat não respondeu, e uma queda não tira ninguém da sessão (LLD, seção 8). */
export function SessionError() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-1 items-center justify-center bg-surface">
      <div role="alert" className="flex w-md flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-card bg-surface-inset text-fg-muted">
          <WifiOff size={24} aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-black text-fg">Não foi possível verificar sua sessão</h1>
          <p className="text-body text-fg-muted">Confira sua conexão e tente de novo.</p>
        </div>
        <Button loading={pending} onClick={() => startTransition(() => router.refresh())}>
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
