import { beforeEach, describe, expect, it, vi } from "vitest";
import { BRAND_QUIZ } from "../shared/brandQuiz";
import type { TrpcContext } from "./_core/context";

type StoredBrand = { id: number; ownerId: number; name: string; description: string; differentials: string; status: "draft" | "selected" };
type StoredSession = { id: number; brandId: number; ownerId: number; answers: Record<string, string>; status: "draft" | "in_progress" | "generating" | "selected"; currentRound: number; selectedDirectionId: number | null };
type StoredDirection = { id: number; sessionId: number; round: number; optionKey: string; title: string; content: Record<string, unknown>; logoImageUrl: string | null; status: "proposed" | "rejected" | "selected" };

const state = vi.hoisted(() => ({
  brands: [] as StoredBrand[],
  sessions: [] as StoredSession[],
  directions: [] as StoredDirection[],
  directionRun: 0,
}));

const db = vi.hoisted(() => ({
  createBrandWithSession: vi.fn(async (ownerId: number, input: Omit<StoredBrand, "id" | "ownerId" | "status">) => {
    const brand = { id: state.brands.length + 1, ownerId, ...input, status: "draft" as const };
    const session = { id: state.sessions.length + 1, brandId: brand.id, ownerId, answers: {}, status: "draft" as const, currentRound: 0, selectedDirectionId: null };
    state.brands.push(brand);
    state.sessions.push(session);
    return { brandId: brand.id, sessionId: session.id };
  }),
  getOwnedBrand: vi.fn(async (ownerId: number, brandId: number) => state.brands.find(brand => brand.ownerId === ownerId && brand.id === brandId)),
  getOwnedSession: vi.fn(async (ownerId: number, sessionId: number) => state.sessions.find(session => session.ownerId === ownerId && session.id === sessionId)),
  getSessionByBrand: vi.fn(async (ownerId: number, brandId: number) => state.sessions.find(session => session.ownerId === ownerId && session.brandId === brandId)),
  listBrandsByOwner: vi.fn(async (ownerId: number) => state.brands.filter(brand => brand.ownerId === ownerId)),
  saveSessionAnswer: vi.fn(async (ownerId: number, sessionId: number, questionId: string, option: string) => {
    const session = state.sessions.find(item => item.ownerId === ownerId && item.id === sessionId);
    if (!session) return undefined;
    session.answers[questionId] = option;
    session.status = "in_progress";
    return session;
  }),
  saveRefinementNote: vi.fn(async (_ownerId: number, _sessionId: number, _refinementNote: string) => true),
  setSiteApproval: vi.fn(async (_ownerId: number, _sessionId: number) => true),
  getDirectionsForSession: vi.fn(async (sessionId: number) => state.directions.filter(direction => direction.sessionId === sessionId).sort((left, right) => right.round - left.round || left.optionKey.localeCompare(right.optionKey))),
  getLatestRound: vi.fn(async (sessionId: number) => Math.max(0, ...state.directions.filter(direction => direction.sessionId === sessionId).map(direction => direction.round))),
  rejectLatestDirectionRound: vi.fn(async (_ownerId: number, sessionId: number) => {
    const round = Math.max(0, ...state.directions.filter(direction => direction.sessionId === sessionId).map(direction => direction.round));
    state.directions.filter(direction => direction.sessionId === sessionId && direction.round === round && direction.status === "proposed").forEach(direction => { direction.status = "rejected"; });
    return true;
  }),
  setSessionGenerating: vi.fn(async (ownerId: number, sessionId: number, currentRound: number) => {
    const session = state.sessions.find(item => item.ownerId === ownerId && item.id === sessionId)!;
    session.status = "generating";
    session.currentRound = currentRound;
  }),
  reopenSelectedBrandSession: vi.fn(async (_ownerId: number, sessionId: number) => {
    const session = state.sessions.find(item => item.id === sessionId)!;
    state.directions.filter(direction => direction.sessionId === sessionId && direction.round === session.currentRound && (direction.status === "selected" || direction.status === "proposed")).forEach(direction => { direction.status = "rejected"; });
    session.status = "in_progress";
    session.selectedDirectionId = null;
    return true;
  }),
  restoreSessionAfterGenerationFailure: vi.fn(),
  createDirectionRound: vi.fn(async (sessionId: number, round: number, directions: Array<{ title: string; content: Record<string, unknown>; logoImageUrl: string | null }>) => {
    directions.forEach((direction, index) => state.directions.push({ id: state.directions.length + 1, sessionId, round, optionKey: ["A", "B", "C", "D", "E"][index]!, ...direction, status: "proposed" }));
    const session = state.sessions.find(item => item.id === sessionId)!;
    session.status = "in_progress";
    session.currentRound = round;
  }),
  selectDirection: vi.fn(async (ownerId: number, sessionId: number, directionId: number) => {
    const session = state.sessions.find(item => item.ownerId === ownerId && item.id === sessionId);
    const direction = state.directions.find(item => item.id === directionId && item.sessionId === sessionId);
    if (!session || !direction) return false;
    direction.status = "selected";
    session.status = "selected";
    session.selectedDirectionId = directionId;
    const brand = state.brands.find(item => item.id === session.brandId)!;
    brand.status = "selected";
    return true;
  }),
  getSelectedDirection: vi.fn(async (ownerId: number, brandId: number) => {
    const session = state.sessions.find(item => item.ownerId === ownerId && item.brandId === brandId);
    return state.directions.find(direction => direction.id === session?.selectedDirectionId);
  }),
}));

const generation = vi.hoisted(() => ({
  generateBrandDirections: vi.fn(async () => {
    state.directionRun += 1;
    return ["A", "B", "C", "D", "E"].map((key, index) => ({
      title: `Direção ${state.directionRun}-${key}`,
      essence: "Essência estratégica",
      visualStyle: "Visual editorial",
      palette: [{ name: "Carvão", hex: "#1F211A", use: "Base" }, { name: "Areia", hex: "#F6F1E8", use: "Fundo" }, { name: "Latão", hex: "#C7AA63", use: "Destaque" }, { name: "Branco", hex: "#FFFFFF", use: "Contraste" }],
      typography: { display: "Cormorant Garamond", body: "Inter", scale: { h1: "64px", h2: "42px", body: "16px", label: "12px" } },
      logoConcept: `Símbolo ${index + 1}`,
      logoPrompt: "Minimal vector symbol",
      imagery: "Imagem refinada",
      voice: "Precisa",
      site: { headline: "Uma marca clara", description: "Descrição", sections: [{ title: "Início", purpose: "Apresentar" }, { title: "Método", purpose: "Explicar" }, { title: "Benefícios", purpose: "Convencer" }, { title: "Contato", purpose: "Converter" }] },
    }));
  }),
  generateLogoConcepts: vi.fn(async (directions: Array<unknown>) => directions.map((_, index) => `https://example.test/logo-${index}.png`)),
}));

vi.mock("./db", () => db);
vi.mock("./brandGeneration", () => generation);

import { appRouter } from "./routers";

function context(): TrpcContext {
  return {
    user: { id: 9, openId: "flow-user", name: "Flow User", email: "flow@example.test", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("fluxo integrado de identidade", () => {
  beforeEach(() => {
    state.brands.length = 0;
    state.sessions.length = 0;
    state.directions.length = 0;
    state.directionRun = 0;
    vi.clearAllMocks();
  });

  it("cria a marca, conclui o quiz, regenera e seleciona uma direção final", async () => {
    const caller = appRouter.createCaller(context());
    const started = await caller.brand.start({ name: "QRIA", description: "Plataforma para criar identidades visuais orientadas por estratégia.", differentials: "Quiz proprietário, direções comparáveis e refinamento iterativo." });
    expect(started.brandId).toBeGreaterThan(0);

    for (const question of BRAND_QUIZ) {
      await caller.brand.answer({ sessionId: started.sessionId, questionId: question.id, option: "A" });
    }

    const firstRound = await caller.brand.generate({ sessionId: started.sessionId });
    expect(firstRound).toHaveLength(5);
    expect(firstRound.every(direction => direction.status === "proposed")).toBe(true);

    const secondRound = await caller.brand.regenerate({ sessionId: started.sessionId });
    expect(secondRound).toHaveLength(10);
    expect(secondRound.filter(direction => direction.status === "rejected")).toHaveLength(5);
    const newProposal = secondRound.find(direction => direction.round === 2 && direction.status === "proposed");
    expect(newProposal).toBeDefined();

    await expect(caller.brand.choose({ sessionId: started.sessionId, directionId: newProposal!.id })).resolves.toEqual({ success: true });
    const workspace = await caller.brand.getWorkspace({ brandId: started.brandId });
    expect(workspace.session?.status).toBe("selected");
    expect(workspace.selectedDirection?.id).toBe(newProposal!.id);
  });
});
