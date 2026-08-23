import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  createBrandWithSession: vi.fn(),
  createDirectionRound: vi.fn(),
  getDirection: vi.fn(),
  getDirectionsForSession: vi.fn(),
  getFavoriteDirections: vi.fn(),
  getIntegrationContext: vi.fn(() => ({ source: "qria", externalBrandRef: null })),
  getLatestRound: vi.fn(),
  getOwnedBrand: vi.fn(),
  getOwnedSession: vi.fn(),
  getSelectedDirection: vi.fn(),
  getSessionByBrand: vi.fn(),
  listBrandsByOwner: vi.fn(),
  rejectLatestDirectionRound: vi.fn(),
  restoreSessionAfterGenerationFailure: vi.fn(),
  saveSessionAnswer: vi.fn(),
  saveRefinementNote: vi.fn(),
  selectDirection: vi.fn(),
  setDirectionFavorite: vi.fn(),
  setSessionGenerating: vi.fn(),
  setSiteApproval: vi.fn(),
  reopenSelectedBrandSession: vi.fn(),
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
      id: 12,
      openId: "router-test-user",
      name: "Router Test",
      email: "router@test.local",
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

describe("procedimentos de marca", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getFavoriteDirections.mockResolvedValue([]);
    db.getIntegrationContext.mockReturnValue({ source: "qria", externalBrandRef: null });
  });

  it("rejeita dados iniciais incompletos antes de criar uma sessão", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.brand.start({ name: "A", description: "curta", differentials: "pouco" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.createBrandWithSession).not.toHaveBeenCalled();
  });

  it("cria uma marca e a sessão de diagnóstico para entradas válidas", async () => {
    db.createBrandWithSession.mockResolvedValue({ brandId: 41, sessionId: 72 });
    const caller = appRouter.createCaller(createContext());
    const input = {
      name: "Noma Studio",
      description: "Estúdio de estratégia e identidade para marcas autorais.",
      differentials: "Direção próxima, repertório cultural e clareza estratégica.",
    };
    await expect(caller.brand.start(input)).resolves.toEqual({ brandId: 41, sessionId: 72 });
    expect(db.createBrandWithSession).toHaveBeenCalledWith(12, input);
  });

  it("aceita metadados de origem para futura integração com a Agenssia", async () => {
    db.createBrandWithSession.mockResolvedValue({ brandId: 42, sessionId: 73 });
    const caller = appRouter.createCaller(createContext());
    const input = {
      name: "Marca Integrada",
      description: "Marca criada a partir de um onboarding externo já preenchido.",
      differentials: "Contexto reaproveitado sem duplicação de cadastro.",
      source: "agenssia",
      externalBrandRef: "brand_abc123",
    };
    await caller.brand.start(input);
    expect(db.createBrandWithSession).toHaveBeenCalledWith(12, input);
  });

  it("rejeita respostas de perguntas inexistentes antes de alterar a sessão", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.brand.answer({ sessionId: 72, questionId: "fora-do-quiz", option: "A" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.saveSessionAnswer).not.toHaveBeenCalled();
  });

  it("monta o workspace com marca, sessão, direções, favoritas, integração e escolha persistida", async () => {
    const brand = { id: 41, ownerId: 12, name: "Noma Studio", description: "Descrição", differentials: "Diferenciais", status: "selected" };
    const session = { id: 72, brandId: 41, ownerId: 12, answers: { personalidade: "A", __source: "agenssia", __externalBrandRef: "brand_123" }, status: "selected", currentRound: 1, selectedDirectionId: 93 };
    const directions = [{ id: 93, sessionId: 72, title: "Âmbar Editorial", round: 1, optionKey: "B", status: "selected", isFavorite: true }];
    const integration = { source: "agenssia", externalBrandRef: "brand_123" };
    db.getOwnedBrand.mockResolvedValue(brand);
    db.getSessionByBrand.mockResolvedValue(session);
    db.getDirectionsForSession.mockResolvedValue(directions);
    db.getFavoriteDirections.mockResolvedValue(directions);
    db.getSelectedDirection.mockResolvedValue(directions[0]);
    db.getIntegrationContext.mockReturnValue(integration);
    const caller = appRouter.createCaller(createContext());
    await expect(caller.brand.getWorkspace({ brandId: 41 })).resolves.toEqual({ brand, session, directions, favorites: directions, selectedDirection: directions[0], integration });
  });

  it("favorita e desfavorita uma direção sem encerrar a sessão", async () => {
    db.setDirectionFavorite.mockResolvedValue(true);
    const caller = appRouter.createCaller(createContext());
    await expect(caller.brand.favorite({ sessionId: 72, directionId: 93, favorite: true })).resolves.toEqual({ success: true, favorite: true });
    expect(db.setDirectionFavorite).toHaveBeenCalledWith(12, 72, 93, true);
  });

  it("persiste a direção final escolhida somente quando ela pertence à sessão", async () => {
    db.selectDirection.mockResolvedValue(true);
    const caller = appRouter.createCaller(createContext());
    await expect(caller.brand.choose({ sessionId: 72, directionId: 93 })).resolves.toEqual({ success: true });
    expect(db.selectDirection).toHaveBeenCalledWith(12, 72, 93);
  });

  it("persiste a aprovação da sugestão de site na sessão correta", async () => {
    db.setSiteApproval.mockResolvedValue(true);
    const caller = appRouter.createCaller(createContext());
    await expect(caller.brand.approveSite({ sessionId: 72 })).resolves.toEqual({ success: true });
    expect(db.setSiteApproval).toHaveBeenCalledWith(12, 72);
  });
});
