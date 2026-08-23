import { describe, expect, it, vi } from "vitest";

const llm = vi.hoisted(() => ({
  listPortableLLMModels: vi.fn(async () => ({ data: [{ id: "gpt-5.6-terra" }] })),
  invokePortableLLM: vi.fn(async () => { throw new Error("412 Precondition Failed"); }),
}));

vi.mock("./_core/portableLLM", () => llm);
vi.mock("./_core/portableImageGeneration", () => ({ generatePortableImage: vi.fn() }));

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
    expect(llm.invokePortableLLM).toHaveBeenCalledTimes(1);
    expect(llm.listPortableLLMModels).toHaveBeenCalledTimes(1);
  });
});
