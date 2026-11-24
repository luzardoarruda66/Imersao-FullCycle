"use server";

import type { ChatMessage } from "chat-events";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { conversationErrorMessage } from "@/lib/conversation-errors";
import { conversationPath, type ConversationSummary, type Participant } from "@/lib/conversations";
import {
  createChannelSchema,
  editMessageSchema,
  fieldErrorsOf,
  inviteSchema,
  openDirectSchema,
  sendMessageSchema,
  type FieldErrors,
} from "@/lib/schemas";
import { z } from "zod";
import { callChatApi, clearSessionCookie } from "@/server/chat-api";
import { markConversationRead } from "@/server/conversations";

export type CreateChannelState =
  | { status: "idle" }
  | { status: "error"; fieldErrors?: FieldErrors<"nome" | "tipo">; general?: string };

export type OpenDirectState = { status: "idle" } | { status: "error"; message: string };

export type InviteState =
  | { status: "idle" }
  | { status: "success"; participantes: Participant[] }
  | { status: "error"; message: string };

export type EditMessageResult =
  | { status: "edited"; message: ChatMessage }
  | { status: "error"; message: string };

export type DeleteMessageResult =
  | { status: "deleted"; message: ChatMessage }
  | { status: "error"; message: string };

export type SendMessageState =
  | { status: "idle" }
  | { status: "sent"; message: ChatMessage }
  | { status: "error"; message: string };

const QUOTE_GONE = "A mensagem citada não está mais disponível. Cancele a citação ou escolha outra mensagem. O texto foi mantido.";

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

/** A sessão não vale mais: apaga o cookie velho e manda para "Entrar" (LLD, seção 8, "Sessão no cliente"). */
async function endSession(): Promise<never> {
  await clearSessionCookie();
  redirect("/entrar");
}

/** Depois de uma mutação, a lateral é relida mesmo que o tempo real esteja fora. */
function refreshLayout() {
  revalidatePath("/", "layout");
}

export async function createChannelAction(_previous: CreateChannelState, formData: FormData): Promise<CreateChannelState> {
  const parsed = createChannelSchema.safeParse({ nome: text(formData, "nome"), tipo: text(formData, "tipo") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const result = await callChatApi<ConversationSummary>("/v1/conversas/canais", { method: "POST", body: parsed.data });
  if (result.kind === "ok") {
    refreshLayout();
    redirect(conversationPath(result.data.id));
  }
  if (result.kind === "invalid-session") return endSession();
  if (result.kind === "error" && result.code === "nome_canal_em_uso") {
    return { status: "error", fieldErrors: { nome: conversationErrorMessage(result.code) } };
  }
  return { status: "error", general: "Não foi possível criar o canal. Confira sua conexão e tente de novo." };
}

export async function openDirectAction(_previous: OpenDirectState, formData: FormData): Promise<OpenDirectState> {
  const parsed = openDirectSchema.safeParse({ membroId: text(formData, "membroId") });
  if (!parsed.success) return { status: "error", message: "Escolha uma pessoa da lista." };

  const result = await callChatApi<ConversationSummary>("/v1/conversas/diretas", {
    method: "POST",
    body: { membro_id: parsed.data.membroId },
  });
  if (result.kind === "ok") {
    refreshLayout();
    redirect(conversationPath(result.data.id));
  }
  if (result.kind === "invalid-session") return endSession();
  const fallback = "Não foi possível abrir a conversa. Tente de novo.";
  return { status: "error", message: result.kind === "error" ? conversationErrorMessage(result.code, fallback) : fallback };
}

export async function inviteAction(conversationId: string, _previous: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({ membrosIds: formData.getAll("membroId").filter((v) => typeof v === "string") });
  if (!parsed.success) return { status: "error", message: fieldErrorsOf<"membrosIds">(parsed.error).membrosIds ?? "Escolha pelo menos uma pessoa." };

  const result = await callChatApi<{ participantes: Participant[] }>(
    `/v1/conversas/${encodeURIComponent(conversationId)}/participantes`,
    { method: "POST", body: { membros_ids: parsed.data.membrosIds } },
  );
  if (result.kind === "ok") {
    refreshLayout();
    return { status: "success", participantes: result.data.participantes };
  }
  if (result.kind === "invalid-session") return endSession();
  const fallback = "Não foi possível convidar as pessoas. Tente de novo.";
  return { status: "error", message: result.kind === "error" ? conversationErrorMessage(result.code, fallback) : fallback };
}

const readSchema = z.object({ conversationId: z.string().min(1), messageId: z.string().min(1) });

/**
 * Registra a leitura da conversa até a mensagem (Server Action, ADR 0024). Falha em silêncio para a tela: a leitura
 * é refeita na próxima mensagem ou ao abrir a conversa; a sessão inválida manda para "Entrar".
 */
export async function markReadAction(conversationId: string, messageId: string): Promise<{ ok: boolean }> {
  const parsed = readSchema.safeParse({ conversationId, messageId });
  if (!parsed.success) return { ok: false };
  const result = await markConversationRead(parsed.data.conversationId, parsed.data.messageId);
  if (result.kind === "invalid-session") return endSession();
  return { ok: result.kind === "ok" };
}

const DELETE_ERRORS: Record<string, string> = {
  prazo_encerrado: "O prazo de 4 horas para apagar esta mensagem acabou.",
  mensagem_de_outra_pessoa: "Só quem escreveu a mensagem pode apagá-la.",
};

/**
 * Apaga a própria mensagem. A API confere o autor e o prazo de 4 horas, e apagar de novo é sucesso sem efeito; o erro
 * volta como texto para o diálogo de confirmação, que continua aberto.
 */
export async function deleteMessageAction(conversationId: string, messageId: string): Promise<DeleteMessageResult> {
  const result = await callChatApi<ChatMessage>(
    `/v1/conversas/${encodeURIComponent(conversationId)}/mensagens/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
  if (result.kind === "ok") return { status: "deleted", message: result.data };
  if (result.kind === "invalid-session") return endSession();
  const fallback = "Não foi possível apagar a mensagem. Verifique a conexão e tente de novo.";
  if (result.kind !== "error") return { status: "error", message: fallback };
  return { status: "error", message: DELETE_ERRORS[result.code] ?? conversationErrorMessage(result.code, fallback) };
}

/**
 * Salva o texto novo da própria mensagem. A API confere o autor, o prazo de 4 horas e se a mensagem foi apagada; o
 * erro volta como texto para o editor, que continua aberto com o que a pessoa escreveu.
 */
export async function editMessageAction(conversationId: string, messageId: string, texto: string): Promise<EditMessageResult> {
  const parsed = editMessageSchema.safeParse({ texto });
  if (!parsed.success) return { status: "error", message: fieldErrorsOf<"texto">(parsed.error).texto ?? "Escreva uma mensagem." };

  const result = await callChatApi<ChatMessage>(
    `/v1/conversas/${encodeURIComponent(conversationId)}/mensagens/${encodeURIComponent(messageId)}`,
    { method: "PATCH", body: { texto: parsed.data.texto } },
  );
  if (result.kind === "ok") return { status: "edited", message: result.data };
  if (result.kind === "invalid-session") return endSession();
  const fallback = "Não foi possível salvar a edição. Verifique a conexão e tente de novo. O texto foi mantido.";
  return { status: "error", message: result.kind === "error" ? conversationErrorMessage(result.code, fallback) : fallback };
}

export async function sendMessageAction(
  conversationId: string,
  _previous: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const parsed = sendMessageSchema.safeParse({ texto: text(formData, "texto"), citacaoId: text(formData, "citacao_id") });
  if (!parsed.success) {
    const errors = fieldErrorsOf<"texto" | "citacaoId">(parsed.error);
    return { status: "error", message: errors.texto ?? (errors.citacaoId ? QUOTE_GONE : "Escreva uma mensagem.") };
  }
  const quoteId = parsed.data.citacaoId;

  const result = await callChatApi<ChatMessage>(`/v1/conversas/${encodeURIComponent(conversationId)}/mensagens`, {
    method: "POST",
    body: quoteId ? { texto: parsed.data.texto, citacao_id: quoteId } : { texto: parsed.data.texto },
  });
  if (result.kind === "ok") return { status: "sent", message: result.data };
  if (result.kind === "invalid-session") return endSession();
  // A API só recusa o envio por dados inválidos quando a mensagem citada deixou de existir ou foi apagada.
  if (quoteId && result.kind === "error" && result.code === "dados_invalidos") return { status: "error", message: QUOTE_GONE };
  const fallback = "Não foi possível enviar a mensagem. Verifique a conexão e tente de novo. O texto foi mantido.";
  return { status: "error", message: result.kind === "error" ? conversationErrorMessage(result.code, fallback) : fallback };
}
