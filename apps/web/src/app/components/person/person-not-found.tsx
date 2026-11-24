import { CircleUser } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ProfileHeader } from "./profile-header";

/**
 * Tela de Perfil inexistente (frame `Pessoas / Perfil / Não encontrado`): vale para o id que não existe e para o que
 * não é um UUID, e oferece o caminho de volta.
 */
export function PersonNotFound() {
  return (
    <>
      <ProfileHeader />
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={CircleUser}
          title="Pessoa não encontrada"
          description="Este perfil não existe ou o endereço está incorreto."
          action={
            <Link href="/" className={buttonVariants()}>
              Voltar ao início
            </Link>
          }
        />
      </div>
    </>
  );
}
