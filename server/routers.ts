import { COOKIE_NAME } from "@shared/const";
import { BRAND_QUIZ, BRAND_QUIZ_TOTAL } from "@shared/brandQuiz";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateBrandDirections, generateLogoConcepts } from "./brandGeneration";
import {
  createBrandWithSession, createDirectionRound, getDirection, getDirectionsForSession, getFavoriteDirections,
  getLatestRound, getOwnedBrand, getOwnedSession, getSelectedDirection, getSessionByBrand, listBrandsByOwner,
  rejectLatestDirectionRound, reopenSelectedBrandSession, restoreSessionAfterGenerationFailure, saveSessionAnswer,
  saveRefinementNote, selectDirection, setDirectionFavorite, setSessionGenerating, setSiteApproval,
} from "./db";

const brandInput = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(12).max(2000),
  differentials: z.string().trim().min(8).max(2000),
  source: z.string().trim().min(2).max(64).optional(),
  externalBrandRef: z.string().trim().max(191).optional(),
});

async function generateRound(ownerId: number, sessionId: number, options: { rejectCurrentRound?: boolean; refinementNote?: string; parentDirectionId?: number } = {}) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
  const brand = await getOwnedBrand(ownerId, session.brandId);
  if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Marca não encontrada." });
  if (Object.keys(session.answers ?? {}).length < BRAND_QUIZ_TOTAL) throw new TRPCError({ code: "BAD_REQUEST", message: "Responda todas as perguntas antes de gerar as direções." });

  const existingDirections = await getDirectionsForSession(sessionId);
  const parent = options.parentDirectionId ? await getDirection(ownerId, sessionId, options.parentDirectionId) : undefined;
  if (options.parentDirectionId && !parent) throw new TRPCError({ code: "NOT_FOUND", message: "Direção-base não encontrada." });
  const parentContent = parent?.content as Record<string, unknown> | undefined;
  const parentGuidance = parent ? `Crie cinco variações claramente descendentes da direção \"${parent.title}\". Preserve o que a torna reconhecível, mas explore cinco soluções diferentes de símbolo, composição, tipografia e acabamento.` : undefined;
  const requestedNote = options.refinementNote?.trim() || parentGuidance || session.refinementNote || undefined;
  if (options.refinementNote?.trim()) await saveRefinementNote(ownerId, sessionId, options.refinementNote.trim());
  if (options.rejectCurrentRound) {
    const rejected = session.status === "selected" ? await reopenSelectedBrandSession(ownerId, sessionId) : await rejectLatestDirectionRound(ownerId, sessionId);
    if (!rejected) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." });
  }
  const nextRound = await getLatestRound(sessionId) + 1;
  await setSessionGenerating(ownerId, sessionId, nextRound);
  try {
    const directions = await generateBrandDirections({
      brand: { name: brand.name, description: brand.description, differentials: brand.differentials },
      answers: session.answers ?? {},
      priorDirectionTitles: existingDirections.map(direction => direction.title),
      refinementNote: requestedNote,
      parentDirection: parent ? { title: parent.title, content: parentContent ?? {} } : undefined,
    });
    const logoImageUrls = await generateLogoConcepts(directions);
    await createDirectionRound(sessionId, nextRound, directions.map((direction, index) => ({ title: direction.title, content: direction as unknown as Record<string, unknown>, logoImageUrl: logoImageUrls[index] ?? null })), parent?.id, parent ? parent.explorationDepth + 1 : 0);
  } catch (error) {
    await restoreSessionAfterGenerationFailure(ownerId, sessionId, Math.max(nextRound - 1, 0));
    throw error;
  }
  return getDirectionsForSession(sessionId);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  brand: router({
    list: protectedProcedure.query(({ ctx }) => listBrandsByOwner(ctx.user.id)),
    start: protectedProcedure.input(brandInput).mutation(({ ctx, input }) => createBrandWithSession(ctx.user.id, input)),
    getWorkspace: protectedProcedure.input(z.object({ brandId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const brand = await getOwnedBrand(ctx.user.id, input.brandId); if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Marca não encontrada." });
      const session = await getSessionByBrand(ctx.user.id, input.brandId);
      const directions = session ? await getDirectionsForSession(session.id) : [];
      const favorites = session ? await getFavoriteDirections(ctx.user.id, session.id) : [];
      const selectedDirection = await getSelectedDirection(ctx.user.id, input.brandId);
      return { brand, session, directions, favorites, selectedDirection };
    }),
    answer: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), questionId: z.string(), option: z.enum(["A", "B", "C", "D", "E"]) })).mutation(async ({ ctx, input }) => {
      if (!BRAND_QUIZ.some(question => question.id === input.questionId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Pergunta de quiz inválida." });
      const updated = await saveSessionAnswer(ctx.user.id, input.sessionId, input.questionId, input.option); if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." }); return updated;
    }),
    generate: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId)),
    regenerate: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), refinementNote: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId, { rejectCurrentRound: true, refinementNote: input.refinementNote })),
    explore: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), directionId: z.number().int().positive(), refinementNote: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId, { parentDirectionId: input.directionId, refinementNote: input.refinementNote })),
    favorite: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), directionId: z.number().int().positive(), favorite: z.boolean() })).mutation(async ({ ctx, input }) => {
      const ok = await setDirectionFavorite(ctx.user.id, input.sessionId, input.directionId, input.favorite); if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "Direção não encontrada." }); return { success: true, favorite: input.favorite } as const;
    }),
    choose: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), directionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const selected = await selectDirection(ctx.user.id, input.sessionId, input.directionId); if (!selected) throw new TRPCError({ code: "NOT_FOUND", message: "Direção não encontrada." }); return { success: true } as const;
    }),
    approveSite: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const approved = await setSiteApproval(ctx.user.id, input.sessionId); if (!approved) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada." }); return { success: true } as const; }),
  }),
});

export type AppRouter = typeof appRouter;
