import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/app/components/auth/login-form";
import { safeNext } from "@/lib/safe-redirect";
import { getSessionState } from "@/server/session";

export const metadata: Metadata = { title: "Entrar · Full Cycle Chat" };

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface-subtle p-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-panel bg-surface-raised p-8 shadow-2">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-card bg-sidebar text-sidebar-fg-strong">
            <MessageSquare size={24} aria-hidden />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-display font-black text-fg">Entrar no Full Cycle</h1>
            <p className="text-body text-fg-muted">Use o e-mail da sua conta de trabalho.</p>
          </div>
        </header>
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { para } = await searchParams;
  // Com sessão válida (conferida na API, não no proxy), "Entrar" leva à tela principal.
  const session = await getSessionState();
  if (session.kind === "member") redirect("/");
  return <LoginForm para={safeNext(Array.isArray(para) ? para[0] : para)} />;
}
