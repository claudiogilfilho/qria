import { describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({
  listLLMModels: vi.fn(async () => ({ data: [{ id: "gpt-5" }] })),
  invokeLLM: vi.fn(async () => { throw new Error("412 Precondition Failed"); }),
}));

vi.mock("./_core/llm", () => llm);
vi.mock("./_core/imageGeneration", () => ({ generateImage: vi.fn() }));

import { generateBrandDirections, generateLogoConcepts } from "./brandGeneration";

const input = {
  brand: { name: "Agenssia", description: "Inteligência que organiza rotas de crescimento.", differentials: "Dados, estratégia e otimização contínua." },
  answers: { personalidade: "A" },
  priorDirectionTitles: [],
};

describe("contingência de geração", () => {
  it("usa fallback imediato nas chamadas seguintes depois de detectar indisponibilidade externa", async () => {
    const first = await generateBrandDirections(input);
    const second = await generateBrandDirections(input);
    const logos = await generateLogoConcepts(second);

    expect(first).toHaveLength(5);
    expect(second).toHaveLength(5);
    expect(logos).toHaveLength(5);
    expect(logos.every(url => url.startsWith("data:image/svg+xml"))).toBe(true);
    expect(llm.invokeLLM).toHaveBeenCalledTimes(1);
    expect(llm.listLLMModels).toHaveBeenCalledTimes(1);
  });
});
