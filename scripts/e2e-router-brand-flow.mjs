import { and, eq } from "drizzle-orm";
import { BRAND_QUIZ } from "../shared/brandQuiz.ts";
import { appRouter } from "../server/routers.ts";
import { getDb } from "../server/db.ts";
import { brandDirections, brands, brandSessions, users } from "../drizzle/schema.ts";

let created = { brandId: null, sessionId: null };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível.");
  const [user] = await db.select().from(users).limit(1);
  if (!user) throw new Error("Nenhum usuário disponível.");

  const caller = appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} },
    res: {},
  });

  const started = await caller.brand.start({
    name: `Validação tRPC QRIA ${Date.now()}`,
    description: "Registro temporário para validar pela camada tRPC o diagnóstico e a criação de identidade visual do QRIA.",
    differentials: "Validação real de persistência, geração, rejeição, regeneração e seleção final com limpeza automática.",
  });
  created = started;
  assert(started.brandId > 0 && started.sessionId > 0, "Identificadores inválidos retornados pela criação.");
  console.log(`[router-e2e] criação aprovada: marca=${started.brandId}, sessão=${started.sessionId}`);

  for (const question of BRAND_QUIZ) {
    await caller.brand.answer({ sessionId: started.sessionId, questionId: question.id, option: "A" });
  }
  console.log("[router-e2e] quiz completo aprovado");

  const firstRound = await caller.brand.generate({ sessionId: started.sessionId });
  assert(firstRound.length === 4 && firstRound.every(direction => direction.status === "proposed" && direction.logoImageUrl), "Primeira rodada incompleta.");
  console.log("[router-e2e] geração inicial aprovada: 4/4 direções com conceitos visuais");

  const regenerated = await caller.brand.regenerate({ sessionId: started.sessionId });
  const rejected = regenerated.filter(direction => direction.status === "rejected");
  const current = regenerated.filter(direction => direction.round === 2 && direction.status === "proposed" && direction.logoImageUrl);
  assert(rejected.length === 4 && current.length === 4, "Regeneração não preservou a rejeição e quatro novas direções.");
  console.log("[router-e2e] opção E e nova rodada aprovadas: 4 rejeitadas + 4 novas");

  await caller.brand.choose({ sessionId: started.sessionId, directionId: current[0].id });
  const workspace = await caller.brand.getWorkspace({ brandId: started.brandId });
  assert(workspace.session?.status === "selected" && workspace.selectedDirection?.id === current[0].id, "Escolha final não persistida.");
  console.log("[router-e2e] escolha final e workspace aprovados");

  await caller.brand.approveSite({ sessionId: started.sessionId });
  const approvedWorkspace = await caller.brand.getWorkspace({ brandId: started.brandId });
  assert(approvedWorkspace.session?.siteApproved === true, "A aprovação do site não foi persistida.");
  console.log("[router-e2e] aprovação de site persistida e retornada no workspace");
}

async function cleanup() {
  if (!created.brandId || !created.sessionId) return;
  const db = await getDb();
  if (!db) return;
  await db.delete(brandDirections).where(eq(brandDirections.sessionId, created.sessionId));
  await db.delete(brandSessions).where(and(eq(brandSessions.id, created.sessionId), eq(brandSessions.brandId, created.brandId)));
  await db.delete(brands).where(eq(brands.id, created.brandId));
  console.log("[router-e2e] dados temporários removidos");
}

run()
  .catch(error => {
    console.error("[router-e2e] falha:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    process.exit(process.exitCode ?? 0);
  });
