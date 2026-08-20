import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { brandDirections, brands, brandSessions, BrandDirectionRow, BrandSession, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

function getInsertId(result: unknown) {
  return Number((result as { insertId?: number }).insertId ?? 0);
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível no momento.");
  return db;
}

export async function createBrandWithSession(ownerId: number, input: { name: string; description: string; differentials: string }) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const brandResult = await tx.insert(brands).values({ ...input, ownerId, status: "draft" });
    const brandId = getInsertId(brandResult);
    const sessionResult = await tx.insert(brandSessions).values({
      brandId,
      ownerId,
      answers: {},
      status: "draft",
      currentRound: 0,
    });
    return { brandId, sessionId: getInsertId(sessionResult) };
  });
}

export async function listBrandsByOwner(ownerId: number) {
  const db = await requireDb();
  return db.select().from(brands).where(eq(brands.ownerId, ownerId)).orderBy(desc(brands.updatedAt));
}

export async function getOwnedBrand(ownerId: number, brandId: number) {
  const db = await requireDb();
  const result = await db.select().from(brands).where(and(eq(brands.id, brandId), eq(brands.ownerId, ownerId))).limit(1);
  return result[0];
}

export async function getOwnedSession(ownerId: number, sessionId: number) {
  const db = await requireDb();
  const result = await db.select().from(brandSessions).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))).limit(1);
  return result[0];
}

export async function getSessionByBrand(ownerId: number, brandId: number) {
  const db = await requireDb();
  const result = await db.select().from(brandSessions)
    .where(and(eq(brandSessions.brandId, brandId), eq(brandSessions.ownerId, ownerId)))
    .orderBy(desc(brandSessions.updatedAt))
    .limit(1);
  return result[0];
}

export async function saveSessionAnswer(ownerId: number, sessionId: number, questionId: string, option: string) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return undefined;
  const db = await requireDb();
  const answers = { ...(session.answers ?? {}), [questionId]: option };
  await db.update(brandSessions).set({ answers, status: "in_progress" }).where(eq(brandSessions.id, sessionId));
  return { ...session, answers, status: "in_progress" as const };
}

export async function getDirectionsForSession(sessionId: number) {
  const db = await requireDb();
  return db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round), brandDirections.optionKey);
}

export async function getLatestRound(sessionId: number) {
  const db = await requireDb();
  const result = await db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round)).limit(1);
  return result[0]?.round ?? 0;
}

export async function rejectLatestDirectionRound(ownerId: number, sessionId: number) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return false;
  const latestRound = await getLatestRound(sessionId);
  if (latestRound === 0) return true;
  const db = await requireDb();
  await db.update(brandDirections).set({ status: "rejected" })
    .where(and(eq(brandDirections.sessionId, sessionId), eq(brandDirections.round, latestRound), eq(brandDirections.status, "proposed")));
  return true;
}

export async function setSessionGenerating(ownerId: number, sessionId: number, currentRound: number) {
  const db = await requireDb();
  await db.update(brandSessions).set({ status: "generating", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
}

export async function restoreSessionAfterGenerationFailure(ownerId: number, sessionId: number, currentRound: number) {
  const db = await requireDb();
  await db.update(brandSessions).set({ status: "in_progress", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
}

export async function createDirectionRound(sessionId: number, round: number, directions: Array<{ title: string; content: Record<string, unknown>; logoImageUrl: string | null }>) {
  const db = await requireDb();
  const optionKeys = ["A", "B", "C", "D"];
  await db.insert(brandDirections).values(directions.map((direction, index) => ({
    sessionId,
    round,
    optionKey: optionKeys[index] ?? "D",
    title: direction.title,
    content: direction.content,
    logoImageUrl: direction.logoImageUrl,
    status: "proposed" as const,
  })));
  await db.update(brandSessions).set({ status: "in_progress", currentRound: round }).where(eq(brandSessions.id, sessionId));
}

export async function selectDirection(ownerId: number, sessionId: number, directionId: number) {
  const db = await requireDb();
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return false;
  const direction = await db.select().from(brandDirections).where(and(eq(brandDirections.id, directionId), eq(brandDirections.sessionId, sessionId))).limit(1);
  if (!direction[0]) return false;
  await db.transaction(async tx => {
    await tx.update(brandDirections).set({ status: "selected" }).where(eq(brandDirections.id, directionId));
    await tx.update(brandSessions).set({ status: "selected", selectedDirectionId: directionId }).where(eq(brandSessions.id, sessionId));
    await tx.update(brands).set({ status: "selected" }).where(eq(brands.id, session.brandId));
  });
  return true;
}

export async function getSelectedDirection(ownerId: number, brandId: number) {
  const session = await getSessionByBrand(ownerId, brandId);
  if (!session?.selectedDirectionId) return undefined;
  const db = await requireDb();
  const result = await db.select().from(brandDirections).where(eq(brandDirections.id, session.selectedDirectionId)).limit(1);
  return result[0] as BrandDirectionRow | undefined;
}
