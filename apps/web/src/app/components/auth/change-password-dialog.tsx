"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { changePasswordAction, type ChangePasswordState } from "@/app/actions/session";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/app/components/ui/dialog";
import { Field, Input } from "@/app/components/ui/field";
import { PASSWORD_RULE_HINT } from "@/lib/password-rules";

const IDLE: ChangePasswordState = { status: "idle" };

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, IDLE);
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state.status !== "success") return;
    toast.success("Senha trocada", { description: "Você saiu dos outros navegadores." });
    onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} noValidate>
      <div className="flex flex-col gap-4 px-6 py-3">
        <Field id="senhaAtual" label="Senha atual" error={errors?.senhaAtual}>
          {(aria) => <Input {...aria} name="senhaAtual" type="password" autoComplete="current-password" autoFocus />}
        </Field>
        <Field id="novaSenha" label="Nova senha" hint={PASSWORD_RULE_HINT} error={errors?.novaSenha}>
          {(aria) => <Input {...aria} name="novaSenha" type="password" autoComplete="new-password" />}
        </Field>
        <Field id="confirmacao" label="Confirmar nova senha" error={errors?.confirmacao}>
          {(aria) => <Input {...aria} name="confirmacao" type="password" autoComplete="new-password" />}
        </Field>
        {state.status === "error" && state.general && (
          <p role="alert" className="text-small text-danger-fg">
            {state.general}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 pt-3 pb-5">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pending}>
          Trocar senha
        </Button>
      </div>
    </form>
  );
}

/** Diálogo "Trocar senha" (frames `Diálogos / Trocar senha / ...`). O formulário só existe com o diálogo aberto: reabrir começa limpo. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Trocar senha"
        description="Depois da troca, você continua neste navegador e sai dos outros."
      >
        <ChangePasswordForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
