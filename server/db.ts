import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  brandDirections,
  brands,
  brandSessions,
  BrandDirectionRow,
  BrandSession,
  Brand,
  InsertUser,
  User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

type MemoryState = {
  userSeq: number;
  brandSeq: number;
  sessionSeq: number;
  directionSeq: number;
  users: User[];
  brands: Brand[];
  sessions: BrandSession[];
  directions: BrandDirectionRow[];
};

const memory: MemoryState = {
  userSeq: 1,
  brandSeq: 1,
  sessionSeq: 1,
  directionSeq: 1,
  users: [],
  brands: [],
  sessions: [],
  directions: [],
};

const useMemory = () => ENV.dbMode === "memory" || !ENV.databaseUrl;
const now = () => new Date();

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
  const meta = readDirectionMeta((direction.content ?? {}) as Record<string, unknown>);
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
  if (useMemory()) return null;
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  if (useMemory()) {
    const existing = memory.users.find(item => item.openId === user.openId);
    const stamp = now();
    if (existing) {
      if (user.name !== undefined) existing.name = user.name ?? null;
      if (user.email !== undefined) existing.email = user.email ?? null;
      if (user.loginMethod !== undefined) existing.loginMethod = user.loginMethod ?? null;
      if (user.role !== undefined) existing.role = user.role;
      existing.lastSignedIn = user.lastSignedIn ?? stamp;
      existing.updatedAt = stamp;
      return;
    }
    memory.users.push({
      id: memory.userSeq++,
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      createdAt: stamp,
      updatedAt: stamp,
      lastSignedIn: user.lastSignedIn ?? stamp,
    });
    return;
  }

  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível no momento.");
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
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  if (useMemory()) return memory.users.find(user => user.openId === openId);
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export function getInsertId(result: unknown) {
  const metadata = Array.isArray(result) ? result[0] : result;
  const insertId = Number((metadata as { insertId?: unknown } | undefined)?.insertId);
  if (!Number.isSafeInteger(insertId) || insertId < 1) throw new Error("Não foi possível obter o identificador da inserção no banco de dados.");
  return insertId;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível no momento.");
  return db;
}

export async function createBrandWithSession(ownerId: number, input: { name: string; description: string; differentials: string; source?: string; externalBrandRef?: string }) {
  const answers: Record<string, string> = { [SOURCE_KEY]: input.source?.trim() || "qria" };
  if (input.externalBrandRef?.trim()) answers[EXTERNAL_REF_KEY] = input.externalBrandRef.trim();

  if (useMemory()) {
    const stamp = now();
    const brandId = memory.brandSeq++;
    const sessionId = memory.sessionSeq++;
    memory.brands.push({
      id: brandId,
      ownerId,
      name: input.name,
      description: input.description,
      differentials: input.differentials,
      status: "draft",
      createdAt: stamp,
      updatedAt: stamp,
    });
    memory.sessions.push({
      id: sessionId,
      brandId,
      ownerId,
      answers,
      status: "draft",
      currentRound: 0,
      selectedDirectionId: null,
      refinementNote: null,
      siteApproved: false,
      createdAt: stamp,
      updatedAt: stamp,
    });
    return { brandId, sessionId };
  }

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
    const sessionResult = await tx.insert(brandSessions).values({ brandId, ownerId, answers, status: "draft", currentRound: 0 });
    return { brandId, sessionId: getInsertId(sessionResult) };
  });
}

export async function listBrandsByOwner(ownerId: number) {
  if (useMemory()) return memory.brands.filter(brand => brand.ownerId === ownerId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const db = await requireDb();
  return db.select().from(brands).where(eq(brands.ownerId, ownerId)).orderBy(desc(brands.updatedAt));
}

export async function getOwnedBrand(ownerId: number, brandId: number) {
  if (useMemory()) return memory.brands.find(brand => brand.id === brandId && brand.ownerId === ownerId);
  const db = await requireDb();
  return (await db.select().from(brands).where(and(eq(brands.id, brandId), eq(brands.ownerId, ownerId))).limit(1))[0];
}

export async function getOwnedSession(ownerId: number, sessionId: number) {
  if (useMemory()) return memory.sessions.find(session => session.id === sessionId && session.ownerId === ownerId);
  const db = await requireDb();
  return (await db.select().from(brandSessions).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))).limit(1))[0];
}

export async function getSessionByBrand(ownerId: number, brandId: number) {
  if (useMemory()) return memory.sessions.filter(session => session.brandId === brandId && session.ownerId === ownerId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  const db = await requireDb();
  return (await db.select().from(brandSessions).where(and(eq(brandSessions.brandId, brandId), eq(brandSessions.ownerId, ownerId))).orderBy(desc(brandSessions.updatedAt)).limit(1))[0];
}

export async function saveSessionAnswer(ownerId: number, sessionId: number, questionId: string, option: string) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return undefined;
  const answers = { ...((session.answers ?? {}) as Record<string, string>), [questionId]: option };
  if (useMemory()) {
    session.answers = answers;
    session.status = "in_progress";
    session.updatedAt = now();
    return { ...session, answers, status: "in_progress" as const };
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ answers, status: "in_progress" }).where(eq(brandSessions.id, sessionId));
  return { ...session, answers, status: "in_progress" as const };
}

export async function saveRefinementNote(ownerId: number, sessionId: number, refinementNote: string) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return false;
  if (useMemory()) { session.refinementNote = refinementNote; session.updatedAt = now(); return true; }
  const db = await requireDb();
  await db.update(brandSessions).set({ refinementNote }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
  return true;
}

export async function setSiteApproval(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return false;
  if (useMemory()) { session.siteApproved = true; session.updatedAt = now(); return true; }
  const db = await requireDb();
  await db.update(brandSessions).set({ siteApproved: true }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
  return true;
}

export async function getDirectionsForSession(sessionId: number): Promise<ExplorableDirection[]> {
  if (useMemory()) return memory.directions.filter(direction => direction.sessionId === sessionId).sort((a, b) => b.round - a.round || a.optionKey.localeCompare(b.optionKey)).map(withDirectionMeta);
  const db = await requireDb();
  const rows = await db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round), brandDirections.optionKey);
  return rows.map(withDirectionMeta);
}

export async function getDirection(ownerId: number, sessionId: number, directionId: number): Promise<ExplorableDirection | undefined> {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return undefined;
  if (useMemory()) {
    const row = memory.directions.find(direction => direction.id === directionId && direction.sessionId === sessionId);
    return row ? withDirectionMeta(row) : undefined;
  }
  const db = await requireDb();
  const row = (await db.select().from(brandDirections).where(and(eq(brandDirections.id, directionId), eq(brandDirections.sessionId, sessionId))).limit(1))[0];
  return row ? withDirectionMeta(row) : undefined;
}

export async function getFavoriteDirections(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return [];
  return (await getDirectionsForSession(sessionId)).filter(direction => direction.isFavorite);
}

export async function setDirectionFavorite(ownerId: number, sessionId: number, directionId: number, favorite: boolean) {
  const direction = await getDirection(ownerId, sessionId, directionId); if (!direction) return false;
  if (useMemory()) {
    const row = memory.directions.find(item => item.id === directionId)!;
    row.content = mergeDirectionMeta(direction.content as Record<string, unknown>, { favorite });
    return true;
  }
  const db = await requireDb();
  await db.update(brandDirections).set({ content: mergeDirectionMeta(direction.content as Record<string, unknown>, { favorite }) }).where(eq(brandDirections.id, directionId));
  return true;
}

export async function getLatestRound(sessionId: number) {
  if (useMemory()) return memory.directions.filter(direction => direction.sessionId === sessionId).reduce((max, direction) => Math.max(max, direction.round), 0);
  const db = await requireDb();
  const result = await db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round)).limit(1);
  return result[0]?.round ?? 0;
}

export async function rejectLatestDirectionRound(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return false;
  const latestRound = await getLatestRound(sessionId); if (latestRound === 0) return true;
  const directions = await getDirectionsForSession(sessionId);
  const ids = directions.filter(direction => direction.round === latestRound && direction.status === "proposed" && !direction.isFavorite).map(direction => direction.id);
  if (useMemory()) {
    memory.directions.forEach(direction => { if (ids.includes(direction.id)) direction.status = "rejected"; });
    return true;
  }
  if (ids.length > 0) { const db = await requireDb(); await db.update(brandDirections).set({ status: "rejected" }).where(inArray(brandDirections.id, ids)); }
  return true;
}

export async function reopenSelectedBrandSession(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return false;
  const directions = await getDirectionsForSession(sessionId);
  const ids = directions.filter(direction => direction.round === session.currentRound && (direction.status === "proposed" || direction.status === "selected") && !direction.isFavorite).map(direction => direction.id);
  if (useMemory()) {
    memory.directions.forEach(direction => { if (ids.includes(direction.id)) direction.status = "rejected"; });
    session.status = "in_progress";
    session.selectedDirectionId = null;
    session.updatedAt = now();
    const brand = memory.brands.find(item => item.id === session.brandId); if (brand) { brand.status = "in_progress"; brand.updatedAt = now(); }
    return true;
  }
  const db = await requireDb();
  await db.transaction(async tx => {
    if (ids.length > 0) await tx.update(brandDirections).set({ status: "rejected" }).where(inArray(brandDirections.id, ids));
    await tx.update(brandSessions).set({ status: "in_progress", selectedDirectionId: null }).where(eq(brandSessions.id, sessionId));
    await tx.update(brands).set({ status: "in_progress" }).where(eq(brands.id, session.brandId));
  });
  return true;
}

export async function setSessionGenerating(ownerId: number, sessionId: number, currentRound: number) {
  if (useMemory()) {
    const session = await getOwnedSession(ownerId, sessionId); if (!session) return;
    session.status = "generating"; session.currentRound = currentRound; session.updatedAt = now(); return;
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ status: "generating", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
}

export async function restoreSessionAfterGenerationFailure(ownerId: number, sessionId: number, currentRound: number) {
  if (useMemory()) {
    const session = await getOwnedSession(ownerId, sessionId); if (!session) return;
    session.status = "in_progress"; session.currentRound = currentRound; session.updatedAt = now(); return;
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ status: "in_progress", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
}

export async function createDirectionRound(sessionId: number, round: number, directions: Array<{ title: string; content: Record<string, unknown>; logoImageUrl: string | null }>, parentDirectionId?: number | null, explorationDepth = 0) {
  const optionKeys = ["A", "B", "C", "D", "E"];
  if (useMemory()) {
    const stamp = now();
    directions.forEach((direction, index) => memory.directions.push({
      id: memory.directionSeq++,
      sessionId,
      round,
      optionKey: optionKeys[index] ?? "E",
      title: direction.title,
      content: mergeDirectionMeta(direction.content, { favorite: false, parentDirectionId: parentDirectionId ?? null, explorationDepth }),
      logoImageUrl: direction.logoImageUrl,
      status: "proposed",
      createdAt: stamp,
    }));
    const session = memory.sessions.find(item => item.id === sessionId); if (session) { session.status = "in_progress"; session.currentRound = round; session.updatedAt = stamp; }
    return;
  }
  const db = await requireDb();
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
  const session = await getOwnedSession(ownerId, sessionId); if (!session) return false;
  const direction = await getDirection(ownerId, sessionId, directionId); if (!direction) return false;
  if (useMemory()) {
    const row = memory.directions.find(item => item.id === directionId)!;
    row.status = "selected";
    row.content = mergeDirectionMeta(direction.content as Record<string, unknown>, { favorite: true });
    session.status = "selected"; session.selectedDirectionId = directionId; session.updatedAt = now();
    const brand = memory.brands.find(item => item.id === session.brandId); if (brand) { brand.status = "selected"; brand.updatedAt = now(); }
    return true;
  }
  const db = await requireDb();
  await db.transaction(async tx => {
    await tx.update(brandDirections).set({ status: "selected", content: mergeDirectionMeta(direction.content as Record<string, unknown>, { favorite: true }) }).where(eq(brandDirections.id, directionId));
    await tx.update(brandSessions).set({ status: "selected", selectedDirectionId: directionId }).where(eq(brandSessions.id, sessionId));
    await tx.update(brands).set({ status: "selected" }).where(eq(brands.id, session.brandId));
  });
  return true;
}

export async function getSelectedDirection(ownerId: number, brandId: number) {
  const session = await getSessionByBrand(ownerId, brandId); if (!session?.selectedDirectionId) return undefined;
  if (useMemory()) {
    const row = memory.directions.find(direction => direction.id === session.selectedDirectionId);
    return row ? withDirectionMeta(row) : undefined;
  }
  const db = await requireDb();
  const row = (await db.select().from(brandDirections).where(eq(brandDirections.id, session.selectedDirectionId)).limit(1))[0];
  return row ? withDirectionMeta(row) : undefined;
}
