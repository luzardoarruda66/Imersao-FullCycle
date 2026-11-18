import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { entrarPath } from "@/lib/safe-redirect";

/**
 * Confere só se o cookie de sessão existe; sem ele, manda para "Entrar" guardando o caminho pedido
 * (LLD, seção 8, "Sessão no cliente"). A validação de verdade é da API do chat.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = request.nextUrl.clone();
  const [pathname, search = ""] = entrarPath(request.nextUrl.pathname + request.nextUrl.search).split("?");
  url.pathname = pathname!;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Fora: estáticos, a tela de entrar e a rota que apaga o cookie velho.
  matcher: ["/((?!entrar|sessao-encerrada|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
