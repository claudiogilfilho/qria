import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  getOwnedSession: vi.fn(),
  getOwnedBrand: vi.fn(),
  getDirection: vi.fn(),
  getDirectionsForSession: vi.fn(),
  getFavoriteDirections: vi.fn(),
  getIntegrationContext: vi.fn(() => ({ source: "qria", externalBrandRef: null })),
  getLatestRound: vi.fn(),
  rejectLatestDirectionRound: vi.fn(),
  setSessionGenerating: vi.fn(),
  reopenSelectedBrandSession: vi.fn(),
  restoreSessionAfterGenerationFailure: vi.fn(),
  createDirectionRound: vi.fn(),
  createBrandWithSession: vi.fn(),
  getSelectedDirection: vi.fn(),
  getSessionByBrand: vi.fn(),
  listBrandsByOwner: vi.fn(),
  saveSessionAnswer: vi.fn(),
  saveRefinementNote: vi.fn(),
  selectDirection: vi.fn(),
  setDirectionFavorite: vi.fn(),
  setSiteApproval: vi.fn(),
}));

const generation = vi.hoisted(() => ({
  generateBrandDirections: vi.fn(),
  generateLogoConcepts: vi.fn(),
}));

vi.mock("./db", () => db);
vi.mock("./brandGeneration", () => generation);

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "brand-test-user",
      name: "Brand Test",
      email: "brand@test.local",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("brand.regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getIntegrationContext.mockReturnValue({ source: "qria", externalBrandRef: null });
    db.getOwnedSession.mockResolvedValue({
      id: 21,
      brandId: 8,
      ownerId: 7,
      currentRound: 1,
      status: "in_progress",
      answers: {
        personalidade: "A", posicionamento: "B", publico: "C", linguagem_visual: "D", cor: "E",
        tipografia: "A", simbolo: "B", diferenciacao: "C", experiencia_digital: "D", nao_negociavel: "E",
      },
    });
    db.getOwnedBrand.mockResolvedValue({ id: 8, name: "Teste", description: "Uma marca para teste", differentials: "Clareza e qualidade" });
    db.getDirectionsForSession.mockResolvedValue([{ id: 31, title: "Direção anterior" }]);
    db.getLatestRound.mockResolvedValue(1);
    db.rejectLatestDirectionRound.mockResolvedValue(true);
    db.setSessionGenerating.mockResolvedValue(undefined);
    db.restoreSessionAfterGenerationFailure.mockResolvedValue(undefined);
  });

  it("rejeita a rodada atual e restaura uma sessão recuperável se a geração falhar", async () => {
    generation.generateBrandDirections.mockRejectedValue(new Error("Serviço de IA indisponível"));
    const caller = appRouter.createCaller(createContext());

    await expect(caller.brand.regenerate({ sessionId: 21 })).rejects.toThrow("Serviço de IA indisponível");

    expect(db.rejectLatestDirectionRound).toHaveBeenCalledWith(7, 21);
    expect(db.setSessionGenerating).toHaveBeenCalledWith(7, 21, 2);
    expect(db.restoreSessionAfterGenerationFailure).toHaveBeenCalledWith(7, 21, 1);
    expect(db.createDirectionRound).not.toHaveBeenCalled();
  });

  it("reabre uma identidade escolhida e usa a observação livre na nova geração", async () => {
    db.getOwnedSession.mockResolvedValue({
      id: 21,
      brandId: 8,
      ownerId: 7,
      currentRound: 1,
      status: "selected",
      answers: {
        personalidade: "A", posicionamento: "B", publico: "C", linguagem_visual: "D", cor: "E",
        tipografia: "A", simbolo: "B", diferenciacao: "C", experiencia_digital: "D", nao_negociavel: "E",
      },
    });
    db.reopenSelectedBrandSession.mockResolvedValue(true);
    db.saveRefinementNote.mockResolvedValue(true);
    generation.generateBrandDirections.mockResolvedValue([{ title: "Nova direção" }]);
    generation.generateLogoConcepts.mockResolvedValue(["https://example.test/logo.png"]);
    const caller = appRouter.createCaller(createContext());

    await caller.brand.regenerate({ sessionId: 21, refinementNote: "Quero uma direção mais humana e menos tecnológica." });

    expect(db.saveRefinementNote).toHaveBeenCalledWith(7, 21, "Quero uma direção mais humana e menos tecnológica.");
    expect(db.reopenSelectedBrandSession).toHaveBeenCalledWith(7, 21);
    expect(generation.generateBrandDirections).toHaveBeenCalledWith(expect.objectContaining({ refinementNote: "Quero uma direção mais humana e menos tecnológica." }));
  });
});
