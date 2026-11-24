import { render, screen } from "@testing-library/react";
import type { PersonProfile as Profile } from "@/lib/people";
import { PersonProfile } from "./person-profile";

vi.mock("@/app/actions/conversations", () => ({ openDirectAction: vi.fn() }));

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
    render(<PersonProfile person={FULL} isSelf={false} />);
    expect(screen.getByRole("heading", { level: 1, name: "Perfil" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Alfredo Luiz" })).toBeInTheDocument();
    expect(screen.getByText("@alfredo.luiz")).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((el) => el.textContent)).toEqual(["Cargo", "Telefone", "Status"]);
    expect(values()).toEqual(["Product Designer", "(11) 91234-5678", "Em reunião até as 15h"]);
  });

  it('mostra "Não informado" em cada campo que a pessoa não preencheu', () => {
    render(<PersonProfile person={{ ...FULL, cargo: null, telefone: null, status: null }} isSelf={false} />);
    expect(values()).toEqual(["Não informado", "Não informado", "Não informado"]);
  });

  it('trata o campo só com espaços como não informado', () => {
    render(<PersonProfile person={{ ...FULL, cargo: "   ", telefone: "", status: null }} isSelf={false} />);
    expect(values()).toEqual(["Não informado", "Não informado", "Não informado"]);
  });

  it("mostra só os campos que um Perfil tem: sem e-mail, sem presença", () => {
    render(<PersonProfile person={FULL} isSelf={false} />);
    expect(screen.queryByText(/@.*\..*\.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(/online|ausente|disponível/i)).not.toBeInTheDocument();
  });

  it("oferece Enviar mensagem no Perfil de outra pessoa", () => {
    render(<PersonProfile person={FULL} isSelf={false} />);
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeInTheDocument();
  });

  it("não oferece Enviar mensagem no próprio Perfil, que a conversa direta com a própria pessoa recusa", () => {
    render(<PersonProfile person={FULL} isSelf />);
    expect(screen.queryByRole("button", { name: "Enviar mensagem" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Alfredo Luiz" })).toBeInTheDocument();
  });
});
