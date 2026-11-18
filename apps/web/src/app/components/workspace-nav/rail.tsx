import { UserMenu } from "./user-menu";

/** Trilho de seções: fundo `chrome`, logo no alto e o avatar do usuário embaixo. Os outros itens entram com a F1-06 e a F1-07. */
export function Rail({ memberName }: { memberName: string }) {
  return (
    <nav aria-label="Seções" className="flex w-rail shrink-0 flex-col items-center bg-chrome px-2 py-3">
      <div className="flex size-9 items-center justify-center rounded-card bg-sidebar-fg-strong text-small font-black text-sidebar">
        FC
      </div>
      <div className="flex-1" />
      <UserMenu name={memberName} />
    </nav>
  );
}
