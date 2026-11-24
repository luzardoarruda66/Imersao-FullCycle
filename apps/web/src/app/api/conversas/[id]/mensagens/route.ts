import { clearSessionCookie } from "@/server/chat-api";
import { getMessages } from "@/server/conversations";

/**
 * A página anterior do histórico (LLD, seção 8, "Cliente"): repassa o cookie à API do chat, que confere a sessão e a
 * participação, e devolve só as mensagens e `tem_mais`. Uma sessão que a API não reconhece apaga o cookie velho e responde 401.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/conversas/[id]/mensagens">) {
  const { id } = await params;
  const anchors = new URL(request.url).searchParams.getAll("antes");
  // Sem âncora, ou repetida, é entrada malformada: nem chega à API.
  if (anchors.length !== 1 || !anchors[0]) return Response.json({ error: { code: "dados_invalidos" } }, { status: 400 });

  const result = await getMessages(id, anchors[0]);
  switch (result.kind) {
    case "ok":
      return Response.json({ mensagens: result.data.mensagens, tem_mais: result.data.tem_mais });
    case "invalid-session":
      await clearSessionCookie();
      return Response.json({ error: { code: "sessao_invalida" } }, { status: 401 });
    case "unavailable":
      return Response.json({ error: { code: "indisponivel" } }, { status: 503 });
    default:
      // Conversa alheia ou âncora que não é dela: a API responde igual, e o BFF também.
      return Response.json({ error: { code: result.code } }, { status: result.status });
  }
}
