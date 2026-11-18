import { missingRulesMessage } from "./password-rules";
import { formatWait } from "./wait-time";

describe("formatWait", () => {
  it("arredonda os segundos para cima, em minutos", () => {
    expect(formatWait(900)).toBe("15 minutos");
    expect(formatWait(61)).toBe("2 minutos");
    expect(formatWait(60)).toBe("1 minuto");
    expect(formatWait(5)).toBe("1 minuto");
  });
});

describe("missingRulesMessage", () => {
  it("lista exatamente as regras que faltaram", () => {
    expect(missingRulesMessage(["maiuscula", "simbolo"])).toBe("Inclua uma letra maiúscula. Inclua um símbolo.");
  });
  it("tem uma mensagem de reserva", () => {
    expect(missingRulesMessage(undefined)).toBe("A nova senha não cumpre a regra.");
  });
});
