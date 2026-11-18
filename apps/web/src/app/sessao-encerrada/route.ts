import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-redirect";
import { clearSessionCookie } from "@/server/chat-api";

/**
 * Sessão que a API do chat não reconhece: apaga o cookie velho e manda para "Entrar". Sem apagar, o proxy
 * veria o cookie e o navegador ficaria indo e voltando entre a tela principal e "Entrar" (LLD, seção 8).
 */
export async function GET(request: NextRequest) {
  await clearSessionCookie();
  const url = request.nextUrl.clone();
  const wanted = safeNext(request.nextUrl.searchParams.get("para"));
  url.pathname = "/entrar";
  url.search = "";
  if (wanted !== "/") url.searchParams.set("para", wanted);
  return NextResponse.redirect(url);
}
