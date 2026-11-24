import { render, screen } from "@testing-library/react";
import { Search } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("mostra o título e a descrição", () => {
    render(<EmptyState icon={Search} title="Ninguém encontrado" description="Tente outro nome." />);
    expect(screen.getByRole("heading", { name: "Ninguém encontrado" })).toBeInTheDocument();
    expect(screen.getByText("Tente outro nome.")).toBeInTheDocument();
  });

  it("mostra a ação quando há uma", () => {
    render(
      <EmptyState icon={Search} title="Falhou" description="Tente de novo." action={<button type="button">Tentar de novo</button>} />,
    );
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("não mostra ação nem a descrição quando não há", () => {
    render(<EmptyState icon={Search} title="Vazio" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vazio" })).toBeInTheDocument();
  });
});
