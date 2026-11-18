"use server";

import { redirect } from "next/navigation";
import { missingRulesMessage } from "@/lib/password-rules";
import { changePasswordSchema, fieldErrorsOf, signInSchema, type FieldErrors } from "@/lib/schemas";
import { safeNext } from "@/lib/safe-redirect";
import { callChatApi, clearSessionCookie, forwardSetCookies } from "@/server/chat-api";

export type SignInState =
  | { status: "idle" }
  | {
      status: "error";
      kind: "validacao" | "credenciais" | "tentativas" | "falha";
      email: string;
      fieldErrors?: FieldErrors<"email" | "senha">;
      segundosRestantes?: number;
    };

export type ChangePasswordState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; fieldErrors?: FieldErrors<"senhaAtual" | "novaSenha" | "confirmacao">; general?: string };

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = text(formData, "email");
  const parsed = signInSchema.safeParse({ email, senha: text(formData, "senha") });
  // O erro de validação sai daqui, sem chamar a API.
  if (!parsed.success) {
    return { status: "error", kind: "validacao", email, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const result = await callChatApi("/v1/sessoes", { method: "POST", body: parsed.data });
  if (result.kind === "ok") {
    await forwardSetCookies(result.setCookies);
    redirect(safeNext(formData.get("para")));
  }
  if (result.kind === "error" && result.code === "credenciais_invalidas") {
    return { status: "error", kind: "credenciais", email };
  }
  if (result.kind === "error" && result.code === "tentativas_demais") {
    const seconds = Number(result.details?.segundos_restantes);
    return { status: "error", kind: "tentativas", email, segundosRestantes: Number.isFinite(seconds) ? seconds : 60 };
  }
  return { status: "error", kind: "falha", email };
}

export async function signOutAction(): Promise<void> {
  // Encerra a sessão no servidor; o cookie some do navegador mesmo se a API não responder.
  const result = await callChatApi("/v1/sessoes/atual", { method: "DELETE" });
  await forwardSetCookies(result.setCookies);
  await clearSessionCookie();
  redirect("/entrar");
}

export async function changePasswordAction(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    senhaAtual: text(formData, "senhaAtual"),
    novaSenha: text(formData, "novaSenha"),
    confirmacao: text(formData, "confirmacao"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await callChatApi("/v1/eu/senha", {
    method: "PUT",
    body: { senha_atual: parsed.data.senhaAtual, nova_senha: parsed.data.novaSenha },
  });
  if (result.kind === "ok") return { status: "success" };
  if (result.kind === "invalid-session") {
    await clearSessionCookie();
    redirect("/entrar");
  }
  if (result.kind === "error" && result.code === "senha_atual_incorreta") {
    return { status: "error", fieldErrors: { senhaAtual: "Senha atual incorreta." } };
  }
  if (result.kind === "error" && result.code === "senha_fraca") {
    return { status: "error", fieldErrors: { novaSenha: missingRulesMessage(result.details?.regras_faltando) } };
  }
  return { status: "error", general: "Não foi possível trocar a senha. Confira sua conexão e tente de novo." };
}
