import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getPortableLocalUser(): Promise<User | null> {
  try {
    let user = await db.getUserByOpenId(ENV.localUserOpenId);
    if (!user) {
      await db.upsertUser({
        openId: ENV.localUserOpenId,
        name: ENV.localUserName,
        email: ENV.localUserEmail,
        loginMethod: "local",
        lastSignedIn: new Date(),
      });
      user = await db.getUserByOpenId(ENV.localUserOpenId);
    }
    return user ?? null;
  } catch (error) {
    console.warn("[Auth] Portable local user unavailable", error);
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (ENV.authMode === "local" || ENV.authMode === "none") {
    user = await getPortableLocalUser();
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
