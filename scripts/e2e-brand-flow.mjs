import { and, eq } from "drizzle-orm";
import { BRAND_QUIZ } from "../shared/brandQuiz.ts";
import { generateBrandDirections, generateLogoConcepts } from "../server/brandGeneration.ts";
import {
  createBrandWithSession,
  createDirectionRound,
  getDirectionsForSession,
  getLatestRound,
  getOwnedBrand,
  getOwnedSession,
  getSelectedDirection,
  getSessionByBrand,
  getDb,
  rejectLatestDirectionRound,
  saveSessionAnswer,
  selectDirection,
  setSessionGenerating,
} from "../server/db.ts";
import { brandDirections, brands, brandSessions, users } from "../drizzle/schema.ts";

let cleanup = { brandId: null, sessionId: null };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createRound(ownerId, sessionId, brand, answers, priorTitles) {
  const nextRound = await getLatestRound(sessionId) + 1;
  await setSessionGenerating(ownerId, sessionId, nextRound);
  const directions = await generateBrandDirections({
    brand: { name: brand.name, description: brand.description, differentials: brand.differentials },
    answers,
    priorDirectionTitles: priorTitles,
  });
  const logoImageUrls = await generateLogoConcepts(directions);
  assert(logoImageUrls.filter(Boolean).length === 4, `Rodada ${nextRound}: conceitos visuais incompletos.`);
  await createDirectionRound(sessionId, nextRound, directions.map((direction, index) => ({
    title: direction.title,
    content: direction,
    logoImageUrl: logoImageUrls[index],
  })));
  return getDirectionsForSession(sessionId);
}

async function run() {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível para a validação ponta a ponta.");
  const [owner] = await db.select().from(users).limit(1);
  if (!owner) throw new Error("Nenhum usuário disponível para a validação controlada.");

  const created = await createBrandWithSession(owner.id, {
    name: `Validação técnica QRIA ${Date.now()}`,
    description: "Registro temporário para validar, de ponta a ponta, o diagnóstico, a geração de identidade e a seleção final do QRIA.",
    differentials: "Usa persistência real, duas rodadas de IA e limpeza automática dos dados temporários após o teste.",
  });
  cleanup = created;
  assert(created.brandId > 0 && created.sessionId > 0, "Criação não retornou identificadores válidos.");

  for (const question of BRAND_QUIZ) {
    const updated = await saveSessionAnswer(owner.id, created.sessionId, question.id, "A");
    assert(updated, `Não foi possível salvar a resposta ${question.id}.`);
  }

  const brand = await getOwnedBrand(owner.id, created.brandId);
  const session = await getOwnedSession(owner.id, created.sessionId);
  assert(brand && session && session.brandId === created.brandId, "Marca e sessão não foram vinculadas corretamente.");

  console.log("[e2e] rodada 1: criando quatro direções e conceitos visuais");
  const firstRound = await createRound(owner.id, created.sessionId, brand, session.answers, []);
  assert(firstRound.length === 4 && firstRound.every(direction => direction.status === "proposed"), "Rodada 1 não persistiu quatro propostas.");

  console.log("[e2e] opção E: rejeitando a rodada e gerando quatro novas direções");
  assert(await rejectLatestDirectionRound(owner.id, created.sessionId), "Não foi possível rejeitar a primeira rodada.");
  const secondRound = await createRound(owner.id, created.sessionId, brand, session.answers, firstRound.map(direction => direction.title));
  const rejectedCount = secondRound.filter(direction => direction.status === "rejected").length;
  const currentProposals = secondRound.filter(direction => direction.round === 2 && direction.status === "proposed");
  assert(rejectedCount === 4 && currentProposals.length === 4, "A regeneração não preservou a rejeição e quatro novas propostas.");

  console.log("[e2e] selecionando uma direção final");
  assert(await selectDirection(owner.id, created.sessionId, currentProposals[0].id), "Não foi possível selecionar a direção final.");
  const persistedSession = await getSessionByBrand(owner.id, created.brandId);
  const selected = await getSelectedDirection(owner.id, created.brandId);
  assert(persistedSession?.status === "selected" && selected?.id === currentProposals[0].id, "A escolha final não foi persistida corretamente.");

  console.log("[e2e] aprovado: criação → quiz → geração → opção E → nova geração → escolha final");
}

async function removeTemporaryData() {
  if (!cleanup.sessionId || !cleanup.brandId) return;
  const db = await getDb();
  if (!db) return;
  await db.delete(brandDirections).where(eq(brandDirections.sessionId, cleanup.sessionId));
  await db.delete(brandSessions).where(and(eq(brandSessions.id, cleanup.sessionId), eq(brandSessions.brandId, cleanup.brandId)));
  await db.delete(brands).where(eq(brands.id, cleanup.brandId));
  console.log("[e2e] dados temporários removidos");
}

run()
  .catch(error => {
    console.error("[e2e] falha:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await removeTemporaryData();
    process.exit(process.exitCode ?? 0);
  });
