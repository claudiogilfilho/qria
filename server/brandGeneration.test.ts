import { describe, expect, it } from "vitest";
import { getAnswerNarrative, BRAND_QUIZ_TOTAL } from "../shared/brandQuiz";
import { createFallbackDirections, createFallbackLogo } from "./brandGeneration";

describe("diagnóstico de marca", () => {
  it("mantém um conjunto de perguntas suficiente para orientar a geração", () => {
    expect(BRAND_QUIZ_TOTAL).toBeGreaterThanOrEqual(10);
  });

  it("traduz respostas salvas em um resumo legível para a geração", () => {
    const narrative = getAnswerNarrative({ personalidade: "A", cor: "D" });
    expect(narrative.some(item => item.includes("Essência: Sofisticada"))).toBe(true);
    expect(narrative.some(item => item.includes("Cor: Natural"))).toBe(true);
  });

  it("cria um símbolo vetorial de contingência quando a imagem externa não estiver disponível", () => {
    const fallback = createFallbackLogo({
      title: "Topografia de Impacto",
      essence: "Teste",
      visualStyle: "Editorial técnico",
      palette: [{ name: "Azul", hex: "#2466FF", use: "Base" }, { name: "Lima", hex: "#C8FF00", use: "Destaque" }, { name: "Claro", hex: "#F2F4F8", use: "Contraste" }, { name: "Escuro", hex: "#24251C", use: "Texto" }],
      typography: { display: "Playfair Display", body: "DM Sans", scale: { h1: "64px", h2: "42px", body: "16px", label: "12px" } },
      logoConcept: "Linhas de relevo",
      logoPrompt: "vector symbol",
      imagery: "Teste",
      voice: "Teste",
      site: { headline: "Teste", description: "Teste", sections: [{ title: "Início", purpose: "Teste" }, { title: "Método", purpose: "Teste" }, { title: "Dados", purpose: "Teste" }, { title: "Contato", purpose: "Teste" }] },
    });
    expect(fallback).toMatch(/^data:image\/svg\+xml/);
  });

  it("mantém quatro direções estratégicas utilizáveis quando a geração externa não responde", () => {
    const directions = createFallbackDirections({
      brand: { name: "AGENSsIA", description: "IA que orienta decisões de mídia e crescimento.", differentials: "Leitura de dados, criatividade e otimização contínua." },
      answers: { personalidade: "A" },
      priorDirectionTitles: [],
      refinementNote: "Quero uma proposta mais humana e menos fria.",
    });
    expect(directions).toHaveLength(4);
    expect(directions.every(direction => direction.palette.length === 4 && direction.site.sections.length >= 4)).toBe(true);
    expect(directions[0]?.essence).toContain("mais humana");
  });
});
