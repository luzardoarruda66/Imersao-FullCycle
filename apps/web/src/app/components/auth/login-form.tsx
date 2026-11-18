"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/app/actions/session";
import { Button } from "@/app/components/ui/button";
import { Field, Input } from "@/app/components/ui/field";
import { formatWait } from "@/lib/wait-time";

const IDLE: SignInState = { status: "idle" };

function bannerOf(state: SignInState): string | undefined {
  if (state.status !== "error") return undefined;
  if (state.kind === "tentativas") {
    return `Muitas tentativas de entrar. Aguarde ${formatWait(state.segundosRestantes ?? 60)} e tente de novo.`;
  }
  if (state.kind === "falha") return "Não foi possível entrar agora. Confira sua conexão e tente de novo.";
  return undefined;
}

/** Formulário de "Entrar" (frames `Login / ...` do Figma). Enter envia; os erros são anunciados. */
export function LoginForm({ para }: { para: string }) {
  const [state, formAction, pending] = useActionState(signInAction, IDLE);
  const banner = bannerOf(state);
  // Credenciais incorretas marcam o campo da senha (frame `Credenciais incorretas`); validação marca cada campo.
  const fieldErrors =
    state.status === "error"
      ? state.kind === "credenciais"
        ? { senha: "E-mail ou senha incorretos. Confira os dados e tente de novo." }
        : state.fieldErrors
      : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="para" value={para} />
      <Field id="email" label="E-mail" error={fieldErrors?.email}>
        {(aria) => (
          <Input
            {...aria}
            name="email"
            type="email"
            autoComplete="username"
            placeholder="nome@empresa.com"
            defaultValue={state.status === "error" ? state.email : ""}
            autoFocus
          />
        )}
      </Field>
      <Field id="senha" label="Senha" error={fieldErrors?.senha}>
        {(aria) => <Input {...aria} name="senha" type="password" autoComplete="current-password" />}
      </Field>
      {banner && (
        <p role="alert" className="text-small text-danger-fg">
          {banner}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Entrar
      </Button>
    </form>
  );
}
