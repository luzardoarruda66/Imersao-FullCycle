import { clearSessionCookie } from "@/server/chat-api";
import { getMentionable } from "@/server/conversations";

/**
 * A lista de `@` do campo de mensagem (LLD, seção 8, "Cliente"): repassa o cookie à API do chat, que confere a sessão
 * e a participação, e devolve só id, nome e @usuário. Uma sessão que a API não reconhece apaga o cookie velho e responde 401.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/conversas/[id]/mencionaveis">) {
  const { id } = await params;
  const terms = new URL(request.url).searchParams.getAll("busca");
  // O parâmetro repetido é entrada malformada: nem chega à API.
  if (terms.length > 1) return Response.json({ error: { code: "dados_invalidos" } }, { status: 400 });

  const result = await getMentionable(id, terms[0] ?? "");
  switch (result.kind) {
    case "ok":
      return Response.json({ pessoas: result.data.pessoas.map(({ id: personId, nome, usuario }) => ({ id: personId, nome, usuario })) });
    case "invalid-session":
      await clearSessionCookie();
      return Response.json({ error: { code: "sessao_invalida" } }, { status: 401 });
    case "unavailable":
      return Response.json({ error: { code: "indisponivel" } }, { status: 503 });
    default:
      // Conversa alheia: a API responde igual a uma conversa que não existe, e o BFF também.
      return Response.json({ error: { code: result.code } }, { status: result.status });
  }
}
