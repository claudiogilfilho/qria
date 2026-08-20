import { describe, expect, it } from "vitest";
import { getAnswerNarrative, BRAND_QUIZ_TOTAL } from "../shared/brandQuiz";

describe("diagnóstico de marca", () => {
  it("mantém um conjunto de perguntas suficiente para orientar a geração", () => {
    expect(BRAND_QUIZ_TOTAL).toBeGreaterThanOrEqual(10);
  });

  it("traduz respostas salvas em um resumo legível para a geração", () => {
    const narrative = getAnswerNarrative({ personalidade: "A", cor: "D" });
    expect(narrative.some(item => item.includes("Essência: Sofisticada"))).toBe(true);
    expect(narrative.some(item => item.includes("Cor: Natural"))).toBe(true);
  });
});
