import { copyText } from "./clipboard";

describe("copyText", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("copia o texto puro para a área de transferência e diz que deu certo", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await copyText("Oi @bia, tudo bem?")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("Oi @bia, tudo bem?");
  });

  it("diz que falhou quando o navegador recusa (sem permissão)", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new DOMException("negado", "NotAllowedError")) } });
    expect(await copyText("oi")).toBe(false);
  });

  it("diz que falhou quando não há API de área de transferência (contexto inseguro)", async () => {
    vi.stubGlobal("navigator", {});
    expect(await copyText("oi")).toBe(false);
  });
});
