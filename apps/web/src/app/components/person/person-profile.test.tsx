import { render, screen } from "@testing-library/react";
import type { PersonProfile as Profile } from "@/lib/people";
import { PersonProfile } from "./person-profile";

const FULL: Profile = {
  id: "0192f4a0-0000-7000-8000-000000000001",
  nome: "Alfredo Luiz",
  usuario: "alfredo.luiz",
  cargo: "Product Designer",
  telefone: "(11) 91234-5678",
  status: "Em reunião até as 15h",
};

const values = () => screen.getAllByRole("definition").map((el) => el.textContent);

describe("PersonProfile", () => {
  it("mostra o nome, o @usuário, o cargo, o telefone e o status", () => {
    render(<PersonProfile person={FULL} />);
    expect(screen.getByRole("heading", { level: 1, name: "Perfil" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Alfredo Luiz" })).toBeInTheDocument();
    expect(screen.getByText("@alfredo.luiz")).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((el) => el.textContent)).toEqual(["Cargo", "Telefone", "Status"]);
    expect(values()).toEqual(["Product Designer", "(11) 91234-5678", "Em reunião até as 15h"]);
  });

  it('mostra "Não informado" em cada campo que a pessoa não preencheu', () => {
    render(<PersonProfile person={{ ...FULL, cargo: null, telefone: null, status: null }} />);
    expect(values()).toEqual(["Não informado", "Não informado", "Não informado"]);
  });

  it('trata o campo só com espaços como não informado', () => {
    render(<PersonProfile person={{ ...FULL, cargo: "   ", telefone: "", status: null }} />);
    expect(values()).toEqual(["Não informado", "Não informado", "Não informado"]);
  });

  it("mostra só os campos que um Perfil tem: sem e-mail, sem presença", () => {
    render(<PersonProfile person={FULL} />);
    expect(screen.queryByText(/@.*\..*\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/online|ausente|disponível/i)).not.toBeInTheDocument();
  });
});
