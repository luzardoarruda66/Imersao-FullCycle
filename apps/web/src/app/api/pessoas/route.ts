import { clearSessionCookie } from "@/server/chat-api";
import { searchPeople } from "@/server/people";

/**
 * A busca de pessoas do diálogo (LLD, seção 8, "Cliente"): repassa o cookie à API do chat, que confere a sessão, e
 * devolve só id, nome e @usuário. Uma sessão que a API não reconhece apaga o cookie velho e responde 401.
 */
export async function GET(request: Request) {
  const terms = new URL(request.url).searchParams.getAll("busca");
  // O parâmetro repetido é entrada malformada: nem chega à API.
  if (terms.length > 1) return Response.json({ error: { code: "dados_invalidos" } }, { status: 400 });

  const result = await searchPeople(terms[0] ?? "");
  switch (result.kind) {
    case "ok":
      return Response.json({ pessoas: result.data.pessoas.map(({ id, nome, usuario }) => ({ id, nome, usuario })) });
    case "invalid-session":
      await clearSessionCookie();
      return Response.json({ error: { code: "sessao_invalida" } }, { status: 401 });
    case "unavailable":
      return Response.json({ error: { code: "indisponivel" } }, { status: 503 });
    default:
      return Response.json({ error: { code: "erro_na_busca" } }, { status: 502 });
  }
}
