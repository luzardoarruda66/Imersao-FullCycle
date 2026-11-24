import { render, screen } from "@testing-library/react";
import { PersonNotFound } from "./person-not-found";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("PersonNotFound", () => {
  it("diz que a pessoa não foi encontrada e oferece o caminho de volta", () => {
    render(<PersonNotFound />);
    expect(screen.getByRole("heading", { name: "Pessoa não encontrada" })).toBeInTheDocument();
    expect(screen.getByText(/não existe ou o endereço está incorreto/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
  });
});
