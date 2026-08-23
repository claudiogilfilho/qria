import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { brandDirections, brands, brandSessions, BrandDirectionRow, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

const DIRECTION_META_KEY = "__qriaMeta";
const SOURCE_KEY = "__source";
const EXTERNAL_REF_KEY = "__externalBrandRef";

type DirectionMeta = {
  favorite?: boolean;
  parentDirectionId?: number | null;
  explorationDepth?: number;
};

export type ExplorableDirection = BrandDirectionRow & {
  isFavorite: boolean;
  parentDirectionId: number | null;
  explorationDepth: number;
};

function readDirectionMeta(content: Record<string, unknown>): DirectionMeta {
  const candidate = content[DIRECTION_META_KEY];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  return candidate as DirectionMeta;
}

function mergeDirectionMeta(content: Record<string, unknown>, patch: DirectionMeta): Record<string, unknown> {
  const previous = readDirectionMeta(content);
  return { ...content, [DIRECTION_META_KEY]: { ...previous, ...patch } };
}

function withDirectionMeta(direction: BrandDirectionRow): ExplorableDirection {
  const meta = readDirectionMeta(direction.content ?? {});
  return {
    ...direction,
    isFavorite: meta.favorite === true,
    parentDirectionId: typeof meta.parentDirectionId === "number" ? meta.parentDirectionId : null,
    explorationDepth: typeof meta.explorationDepth === "number" ? meta.explorationDepth : 0,
  };
}

export function getIntegrationContext(session: { answers?: Record<string, string> | null } | undefined) {
  const answers = session?.answers ?? {};
  return {
    source: answers[SOURCE_KEY] || "qria",
    externalBrandRef: answers[EXTERNAL_REF_KEY] || null,
  };
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export function getInsertId(result: unknown) {
  const metadata = Array.isArray(result) ? result[0] : result;
  const insertId = Number((metadata as { insertId?: unknown } | undefined)?.insertId);
  if (!Number.isSafeInteger(insertId) || insertId < 1) throw new Error("Não foi possível obter o identificador da inserção no banco de dados.");
  return insertId;
}

async function requireDb() { const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível no momento."); return db; }

export async function createBrandWithSession(ownerId: number, input: { name: string; description: string; differentials: string; source?: string; externalBrandRef?: string }) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const brandResult = await tx.insert(brands).values({
      name: input.name,
      description: input.description,
      differentials: input.differentials,
      ownerId,
      status: "draft",
    });
    const brandId = getInsertId(brandResult);
    const answers: Record<string, string> = { [SOURCE_KEY]: input.source?.trim() || "qria" };
    if (input.externalBrandRef?.trim()) answers[EXTERNAL_REF_KEY] = input.externalBrandRef.trim();
    const sessionResult = await tx.insert(brandSessions).values({ brandId, ownerId, answers, status: "draft", currentRound: 0 });
    return { brandId, sessionId: getInsertId(sessionResult) };
  });
}

export async function listBrandsByOwner(ownerId: number) { const db = await requireDb(); return db.select().from(brands).where(eq(brands.ownerId, ownerId)).orderBy(desc(brands.updatedAt)); }
export async function getOwnedBrand(ownerId: number, brandId: number) { const db = await requireDb(); return (await db.select().from(brands).where(and(eq(brands.id, brandId), eq(brands.ownerId, ownerId))).limit(1))[0]; }
export async function getOwnedSession(ownerId: number, sessionId: number) { const db = await requireDb(); return (await db.select().from(brandSessions).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))).limit(1))[0]; }
export async function getSessionByBrand(ownerId: number, brandId: number) { const db = await requireDb(); return (await db.select().from(brandSessions).where(and(eq(brandSessions.brandId, brandId), eq(brandSessions.ownerId, ownerId))).orderBy(desc(brandSessions.updatedAt)).limit(1))[0]; }

export async function saveSessionAnswer(ownerId: number, sessionId: number, questionId: string, option: string) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return undefined;
  const db = await requireDb(); const answers = { ...(session.answers ?? {}), [questionId]: option };
  await db.update(brandSessions).set({ answers, status: "in_progress" }).where(eq(brandSessions.id, sessionId));
  return { ...session, answers, status: "in_progress" as const };
}
export async function saveRefinementNote(ownerId: number, sessionId: number, refinementNote: string) { const session = await getOwnedSession(ownerId, sessionId); if (!session) return false; const db = await requireDb(); await db.update(brandSessions).set({ refinementNote }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))); return true; }
export async function setSiteApproval(ownerId: number, sessionId: number) { const session = await getOwnedSession(ownerId, sessionId); if (!session) return false; const db = await requireDb(); await db.update(brandSessions).set({ siteApproved: true }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))); return true; }

export async function getDirectionsForSession(sessionId: number): Promise<ExplorableDirection[]> {
  const db = await requireDb();
  const rows = await db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round), brandDirections.optionKey);
  return rows.map(withDirectionMeta);
}

export async function getDirection(ownerId: number, sessionId: number, directionId: number): Promise<ExplorableDirection | undefined> {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return undefined;
  const db = await requireDb();
  const row = (await db.select().from(brandDirections).where(and(eq(brandDirections.id, directionId), eq(brandDirections.sessionId, sessionId))).limit(1))[0];
  return row ? withDirectionMeta(row) : undefined;
}

export async function getFavoriteDirections(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return [];
  const directions = await getDirectionsForSession(sessionId);
  return directions.filter(direction => direction.isFavorite);
}

export async function setDirectionFavorite(ownerId: number, sessionId: number, directionId: number, favorite: boolean) {
  const direction = await getDirection(ownerId, sessionId, directionId); if (!direction) return false;
  const db = await requireDb();
  await db.update(brandDirections).set({ content: mergeDirectionMeta(direction.content, { favorite }) }).where(eq(brandDirections.id, directionId));
  return true;
}

export async function getLatestRound(sessionId: number) { const db = await requireDb(); const result = await db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round)).limit(1); return result[0]?.round ?? 0; }

export async function rejectLatestDirectionRound(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return false;
  const latestRound = await getLatestRound(sessionId); if (latestRound === 0) return true;
  const directions = await getDirectionsForSession(sessionId);
  const ids = directions.filter(direction => direction.round === latestRound && direction.status === "proposed" && !direction.isFavorite).map(direction => direction.id);
  if (ids.length > 0) { const db = await requireDb(); await db.update(brandDirections).set({ status: "rejected" }).where(inArray(brandDirections.id, ids)); }
  return true;
}

export async function reopenSelectedBrandSession(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return false; const db = await requireDb();
  const directions = await getDirectionsForSession(sessionId);
  const ids = directions.filter(direction => direction.round === session.currentRound && (direction.status === "proposed" || direction.status === "selected") && !direction.isFavorite).map(direction => direction.id);
  await db.transaction(async tx => {
    if (ids.length > 0) await tx.update(brandDirections).set({ status: "rejected" }).where(inArray(brandDirections.id, ids));
    await tx.update(brandSessions).set({ status: "in_progress", selectedDirectionId: null }).where(eq(brandSessions.id, sessionId));
    await tx.update(brands).set({ status: "in_progress" }).where(eq(brands.id, session.brandId));
  }); return true;
}

export async function setSessionGenerating(ownerId: number, sessionId: number, currentRound: number) { const db = await requireDb(); await db.update(brandSessions).set({ status: "generating", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))); }
export async function restoreSessionAfterGenerationFailure(ownerId: number, sessionId: number, currentRound: number) { const db = await requireDb(); await db.update(brandSessions).set({ status: "in_progress", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))); }

export async function createDirectionRound(sessionId: number, round: number, directions: Array<{ title: string; content: Record<string, unknown>; logoImageUrl: string | null }>, parentDirectionId?: number | null, explorationDepth = 0) {
  const db = await requireDb(); const optionKeys = ["A", "B", "C", "D", "E"];
  await db.insert(brandDirections).values(directions.map((direction, index) => ({
    sessionId,
    round,
    optionKey: optionKeys[index] ?? "E",
    title: direction.title,
    content: mergeDirectionMeta(direction.content, { favorite: false, parentDirectionId: parentDirectionId ?? null, explorationDepth }),
    logoImageUrl: direction.logoImageUrl,
    status: "proposed" as const,
  })));
  await db.update(brandSessions).set({ status: "in_progress", currentRound: round }).where(eq(brandSessions.id, sessionId));
}

export async function selectDirection(ownerId: number, sessionId: number, directionId: number) {
  const db = await requireDb(); const session = await getOwnedSession(ownerId, sessionId); if (!session) return false;
  const direction = await getDirection(ownerId, sessionId, directionId); if (!direction) return false;
  await db.transaction(async tx => {
    await tx.update(brandDirections).set({ status: "selected", content: mergeDirectionMeta(direction.content, { favorite: true }) }).where(eq(brandDirections.id, directionId));
    await tx.update(brandSessions).set({ status: "selected", selectedDirectionId: directionId }).where(eq(brandSessions.id, sessionId));
    await tx.update(brands).set({ status: "selected" }).where(eq(brands.id, session.brandId));
  }); return true;
}

export async function getSelectedDirection(ownerId: number, brandId: number) {
  const session = await getSessionByBrand(ownerId, brandId); if (!session?.selectedDirectionId) return undefined;
  const db = await requireDb();
  const row = (await db.select().from(brandDirections).where(eq(brandDirections.id, session.selectedDirectionId)).limit(1))[0];
  return row ? withDirectionMeta(row) : undefined;
}
