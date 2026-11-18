import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-redirect";
import { clearSessionCookie } from "@/server/chat-api";

/**
 * Sessão que a API do chat não reconhece: apaga o cookie velho e manda para "Entrar". Sem apagar, o proxy
 * veria o cookie e o navegador ficaria indo e voltando entre a tela principal e "Entrar" (LLD, seção 8).
 */
export async function GET(request: NextRequest) {
  await clearSessionCookie();
  const wanted = safeNext(request.nextUrl.searchParams.get("para"));
  // Redirecionamento relativo: atrás do contêiner o servidor escuta em 0.0.0.0, e a URL absoluta sairia com esse host.
  const location = wanted === "/" ? "/entrar" : `/entrar?para=${encodeURIComponent(wanted)}`;
  return new NextResponse(null, { status: 307, headers: { Location: location } });
}
