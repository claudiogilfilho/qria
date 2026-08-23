import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull(),
  differentials: text("differentials").notNull(),
  /** Origem da jornada: qria, agenssia ou futura integração. */
  source: varchar("source", { length: 64 }).default("qria").notNull(),
  /** Identificador da marca no sistema de origem, quando houver. */
  externalBrandRef: varchar("externalBrandRef", { length: 191 }),
  status: mysqlEnum("status", ["draft", "in_progress", "selected"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("brands_owner_idx").on(table.ownerId),
  index("brands_source_external_idx").on(table.source, table.externalBrandRef),
]);

export const brandSessions = mysqlTable("brandSessions", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  ownerId: int("ownerId").notNull(),
  answers: json("answers").$type<Record<string, string>>().notNull(),
  status: mysqlEnum("status", ["draft", "in_progress", "generating", "selected"]).default("draft").notNull(),
  currentRound: int("currentRound").default(0).notNull(),
  selectedDirectionId: int("selectedDirectionId"),
  refinementNote: text("refinementNote"),
  siteApproved: boolean("siteApproved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("brand_sessions_owner_idx").on(table.ownerId), index("brand_sessions_brand_idx").on(table.brandId)]);

export const brandDirections = mysqlTable("brandDirections", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  round: int("round").notNull(),
  optionKey: varchar("optionKey", { length: 1 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  content: json("content").$type<Record<string, unknown>>().notNull(),
  logoImageUrl: text("logoImageUrl"),
  status: mysqlEnum("status", ["proposed", "rejected", "selected"]).default("proposed").notNull(),
  /** Favoritar não encerra a exploração: apenas guarda a direção para a final. */
  isFavorite: boolean("isFavorite").default(false).notNull(),
  /** Direção que originou esta variação. Nulo nas direções-raiz. */
  parentDirectionId: int("parentDirectionId"),
  /** Profundidade da árvore criativa: 0 raiz, 1 filha, 2 neta... */
  explorationDepth: int("explorationDepth").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("brand_directions_session_round_idx").on(table.sessionId, table.round),
  index("brand_directions_parent_idx").on(table.parentDirectionId),
  index("brand_directions_favorite_idx").on(table.sessionId, table.isFavorite),
]);

export type Brand = typeof brands.$inferSelect;
export type BrandSession = typeof brandSessions.$inferSelect;
export type BrandDirectionRow = typeof brandDirections.$inferSelect;
