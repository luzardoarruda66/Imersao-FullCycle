import { cn } from "./cn";

describe("cn", () => {
  it("mantém a cor do texto ao lado de um tamanho do design system", () => {
    expect(cn("bg-primary text-on-primary", "text-body")).toBe("bg-primary text-on-primary text-body");
    expect(cn("text-small text-fg-muted")).toBe("text-small text-fg-muted");
  });

  it("ainda resolve conflitos: o último vence", () => {
    expect(cn("text-body", "text-small")).toBe("text-small");
    expect(cn("bg-primary", "bg-danger")).toBe("bg-danger");
  });
});
