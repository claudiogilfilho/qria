import { COOKIE_NAME } from "@shared/const";
import { BRAND_QUIZ, BRAND_QUIZ_TOTAL } from "@shared/brandQuiz";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateBrandDirectionsFive, generateLogoConceptsFive } from "./brandGenerationFive";
import {
  createBrandWithSession,
  createDirectionRound,
  getDirectionsForSession,
  getLatestRound,
  getOwnedBrand,
  getOwnedSession,
  getSelectedDirection,
  getSessionByBrand,
  listBrandsByOwner,
  rejectLatestDirectionRound,
  reopenSelectedBrandSession,
  restoreSessionAfterGenerationFailure,
  saveSessionAnswer,
  saveRefinementNote,
  selectDirection,
  setSessionGenerating,
  setSiteApproval,
} from "./db";

const brandInput = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(12).max(2000),
  differentials: z.string().trim().min(8).max(2000),
});

async function generateRound(ownerId: number, sessionId: number, rejectCurrentRound = false, refinementNote?: string) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
  const brand = await getOwnedBrand(ownerId, session.brandId);
  if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Marca não encontrada." });
  if (Object.keys(session.answers ?? {}).length < BRAND_QUIZ_TOTAL) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Responda todas as perguntas antes de gerar as direções." });
  }

  const existingDirections = await getDirectionsForSession(sessionId);
  const requestedNote = refinementNote?.trim() || session.refinementNote || undefined;
  if (refinementNote?.trim()) {
    const saved = await saveRefinementNote(ownerId, sessionId, refinementNote.trim());
    if (!saved) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
  }
  if (rejectCurrentRound) {
    const rejected = session.status === "selected"
      ? await reopenSelectedBrandSession(ownerId, sessionId)
      : await rejectLatestDirectionRound(ownerId, sessionId);
    if (!rejected) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
  }
  const nextRound = await getLatestRound(sessionId) + 1;
  await setSessionGenerating(ownerId, sessionId, nextRound);

  try {
    const directions = await generateBrandDirectionsFive({
      brand: { name: brand.name, description: brand.description, differentials: brand.differentials },
      answers: session.answers ?? {},
      priorDirectionTitles: existingDirections.map(direction => direction.title),
      refinementNote: requestedNote,
    });
    const logoImageUrls = await generateLogoConceptsFive(directions);
    await createDirectionRound(sessionId, nextRound, directions.map((direction, index) => ({
      title: direction.title,
      content: direction as unknown as Record<string, unknown>,
      logoImageUrl: logoImageUrls[index] ?? null,
    })));
  } catch (error) {
    await restoreSessionAfterGenerationFailure(ownerId, sessionId, Math.max(nextRound - 1, 0));
    throw error;
  }

  return getDirectionsForSession(sessionId);
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  brand: router({
    list: protectedProcedure.query(({ ctx }) => listBrandsByOwner(ctx.user.id)),
    start: protectedProcedure.input(brandInput).mutation(({ ctx, input }) => createBrandWithSession(ctx.user.id, input)),
    getWorkspace: protectedProcedure.input(z.object({ brandId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const brand = await getOwnedBrand(ctx.user.id, input.brandId);
      if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Marca não encontrada." });
      const session = await getSessionByBrand(ctx.user.id, input.brandId);
      const directions = session ? await getDirectionsForSession(session.id) : [];
      const selectedDirection = await getSelectedDirection(ctx.user.id, input.brandId);
      return { brand, session, directions, selectedDirection };
    }),
    answer: protectedProcedure.input(z.object({
      sessionId: z.number().int().positive(),
      questionId: z.string(),
      option: z.enum(["A", "B", "C", "D", "E"]),
    })).mutation(async ({ ctx, input }) => {
      if (!BRAND_QUIZ.some(question => question.id === input.questionId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pergunta de quiz inválida." });
      }
      const updated = await saveSessionAnswer(ctx.user.id, input.sessionId, input.questionId, input.option);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
      return updated;
    }),
    generate: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId)),
    regenerate: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), refinementNote: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId, true, input.refinementNote)),
    choose: protectedProcedure.input(z.object({
      sessionId: z.number().int().positive(),
      directionId: z.number().int().positive(),
    })).mutation(async ({ ctx, input }) => {
      const selected = await selectDirection(ctx.user.id, input.sessionId, input.directionId);
      if (!selected) throw new TRPCError({ code: "NOT_FOUND", message: "Direção não encontrada." });
      return { success: true } as const;
    }),
    approveSite: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const approved = await setSiteApproval(ctx.user.id, input.sessionId);
      if (!approved) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
