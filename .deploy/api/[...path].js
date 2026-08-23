// api/[...path].ts
import "dotenv/config";

// server/app.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// shared/brandQuiz.ts
var BRAND_QUIZ = [
  {
    id: "personalidade",
    category: "Ess\xEAncia",
    prompt: "Se a sua marca entrasse em uma sala, como voc\xEA gostaria que ela fosse percebida?",
    helper: "Escolha a presen\xE7a que deve orientar a identidade como um todo.",
    options: [
      { id: "A", label: "Sofisticada", detail: "Discreta, segura e atemporal." },
      { id: "B", label: "Contempor\xE2nea", detail: "Atual, limpa e inteligente." },
      { id: "C", label: "Ousada", detail: "Expressiva, marcante e confiante." },
      { id: "D", label: "Acolhedora", detail: "Humana, pr\xF3xima e inspiradora." },
      { id: "E", label: "Vision\xE1ria", detail: "Inovadora, curiosa e fora do \xF3bvio." }
    ]
  },
  {
    id: "posicionamento",
    category: "Posicionamento",
    prompt: "Qual promessa deve ficar mais clara quando algu\xE9m encontra a sua marca?",
    helper: "Priorize a percep\xE7\xE3o que mais ajuda a marca a ser escolhida.",
    options: [
      { id: "A", label: "Excel\xEAncia", detail: "Qualidade, cuidado e alto padr\xE3o." },
      { id: "B", label: "Praticidade", detail: "Clareza, agilidade e facilidade." },
      { id: "C", label: "Exclusividade", detail: "Sele\xE7\xE3o, raridade e desejo." },
      { id: "D", label: "Transforma\xE7\xE3o", detail: "Evolu\xE7\xE3o, resultado e impacto." },
      { id: "E", label: "Pertencimento", detail: "Comunidade, proximidade e prop\xF3sito." }
    ]
  },
  {
    id: "publico",
    category: "P\xFAblico",
    prompt: "Como o p\xFAblico ideal costuma tomar decis\xF5es?",
    helper: "Considere o comportamento, e n\xE3o apenas idade ou localiza\xE7\xE3o.",
    options: [
      { id: "A", label: "Racional", detail: "Compara, pesquisa e valoriza crit\xE9rios." },
      { id: "B", label: "Aspiracional", detail: "Busca elevar sua imagem e repert\xF3rio." },
      { id: "C", label: "Sens\xEDvel", detail: "Valoriza conex\xE3o, afeto e confian\xE7a." },
      { id: "D", label: "Pioneiro", detail: "Adota novidades e prefere diferencia\xE7\xE3o." },
      { id: "E", label: "Pragm\xE1tico", detail: "Quer resolver r\xE1pido, sem complexidade." }
    ]
  },
  {
    id: "linguagem_visual",
    category: "Est\xE9tica",
    prompt: "Qual universo visual mais combina com o futuro da marca?",
    helper: "A resposta orienta forma, composi\xE7\xE3o e grau de minimalismo.",
    options: [
      { id: "A", label: "Editorial", detail: "Refinado, cultural e com respiro." },
      { id: "B", label: "Minimalista", detail: "Essencial, preciso e funcional." },
      { id: "C", label: "Org\xE2nico", detail: "Textural, natural e sensorial." },
      { id: "D", label: "Geom\xE9trico", detail: "Estruturado, claro e memor\xE1vel." },
      { id: "E", label: "Experimental", detail: "Autoral, inesperado e expressivo." }
    ]
  },
  {
    id: "cor",
    category: "Cor",
    prompt: "Qual clima crom\xE1tico deve liderar a percep\xE7\xE3o da marca?",
    helper: "N\xE3o se trata da cor final, mas da sensa\xE7\xE3o desejada.",
    options: [
      { id: "A", label: "Neutro precioso", detail: "Off-white, grafite e metalizados sutis." },
      { id: "B", label: "Profundo", detail: "Tons densos, elegantes e contrastados." },
      { id: "C", label: "Solar", detail: "Vibrante, otimista e energizante." },
      { id: "D", label: "Natural", detail: "Terroso, mineral e sereno." },
      { id: "E", label: "Digital", detail: "El\xE9trico, futurista e de alto impacto." }
    ]
  },
  {
    id: "tipografia",
    category: "Tipografia",
    prompt: "Como a voz escrita da marca deve soar?",
    helper: "Pense no equil\xEDbrio entre autoridade, personalidade e legibilidade.",
    options: [
      { id: "A", label: "Cl\xE1ssica", detail: "Serifada, culta e sofisticada." },
      { id: "B", label: "Precisa", detail: "Sans serif, limpa e contempor\xE2nea." },
      { id: "C", label: "Expressiva", detail: "Cheia de car\xE1ter e assinatura visual." },
      { id: "D", label: "Humana", detail: "Calorosa, fluida e acess\xEDvel." },
      { id: "E", label: "T\xE9cnica", detail: "Racional, modular e digital." }
    ]
  },
  {
    id: "simbolo",
    category: "Logotipo",
    prompt: "Que papel um s\xEDmbolo deve ter no logotipo da marca?",
    helper: "Isso define se a marca deve ser mais verbal, ic\xF4nica ou abstrata.",
    options: [
      { id: "A", label: "Monograma", detail: "Iniciais como assinatura reconhec\xEDvel." },
      { id: "B", label: "\xCDcone essencial", detail: "S\xEDmbolo simples com leitura imediata." },
      { id: "C", label: "Abstra\xE7\xE3o", detail: "Forma autoral que sugere uma ideia." },
      { id: "D", label: "Wordmark", detail: "Nome como protagonista absoluto." },
      { id: "E", label: "Sistema flex\xEDvel", detail: "Marca que muda sem perder coer\xEAncia." }
    ]
  },
  {
    id: "diferenciacao",
    category: "Express\xE3o",
    prompt: "Qual contraste melhor traduz o diferencial da sua marca?",
    helper: "Escolha a tens\xE3o criativa que deve guiar a dire\xE7\xE3o visual.",
    options: [
      { id: "A", label: "Tradi\xE7\xE3o + inova\xE7\xE3o", detail: "Legado com uma leitura atual." },
      { id: "B", label: "Luxo + simplicidade", detail: "Alto padr\xE3o sem excesso." },
      { id: "C", label: "Tecnologia + humanidade", detail: "Precis\xE3o com proximidade." },
      { id: "D", label: "Arte + estrat\xE9gia", detail: "Originalidade com intencionalidade." },
      { id: "E", label: "Impacto + leveza", detail: "Presen\xE7a forte, mas descomplicada." }
    ]
  },
  {
    id: "experiencia_digital",
    category: "Site",
    prompt: "Qual sensa\xE7\xE3o o site da marca precisa deixar na primeira visita?",
    helper: "A resposta vai orientar o ritmo da sugest\xE3o digital.",
    options: [
      { id: "A", label: "Imers\xE3o", detail: "Narrativa visual e descoberta gradual." },
      { id: "B", label: "Confian\xE7a", detail: "Clareza, prova e decis\xE3o segura." },
      { id: "C", label: "Desejo", detail: "Atmosfera, curadoria e convers\xE3o suave." },
      { id: "D", label: "Agilidade", detail: "Direto ao ponto, funcional e objetivo." },
      { id: "E", label: "Inspira\xE7\xE3o", detail: "Repert\xF3rio, ideias e vis\xE3o de futuro." }
    ]
  },
  {
    id: "nao_negociavel",
    category: "Dire\xE7\xE3o",
    prompt: "O que a marca jamais pode parecer?",
    helper: "Use esta resposta como filtro para evitar uma identidade fora de contexto.",
    options: [
      { id: "A", label: "Gen\xE9rica", detail: "Sem personalidade ou distin\xE7\xE3o." },
      { id: "B", label: "Fria", detail: "Distante, r\xEDgida ou impessoal." },
      { id: "C", label: "Exagerada", detail: "Barulhenta, confusa ou excessiva." },
      { id: "D", label: "Conservadora", detail: "Previs\xEDvel, datada ou pouco ambiciosa." },
      { id: "E", label: "Complexa", detail: "Dif\xEDcil de entender ou de aplicar." }
    ]
  }
];
var BRAND_QUIZ_TOTAL = BRAND_QUIZ.length;
function getAnswerNarrative(answers) {
  return BRAND_QUIZ.map((question) => {
    const selected = question.options.find((option) => option.id === answers[question.id]);
    return selected ? `${question.category}: ${selected.label} \u2014 ${selected.detail}` : null;
  }).filter((value) => Boolean(value));
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? process.env.APP_ID ?? "qria",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  dbMode: (process.env.DB_MODE ?? (process.env.DATABASE_URL ? "mysql" : "memory")).toLowerCase(),
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /**
   * Portable AI configuration.
   * AI_PROVIDER=openai | compatible | manus
   * Any OpenAI-compatible gateway can be used by setting AI_API_BASE_URL.
   */
  aiProvider: (process.env.AI_PROVIDER ?? (process.env.OPENAI_API_KEY ? "openai" : "manus")).toLowerCase(),
  aiApiBaseUrl: process.env.AI_API_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  aiApiKey: process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
  /** Image generation can use OpenAI directly, an OpenAI-compatible service or Manus Forge. */
  imageProvider: (process.env.IMAGE_PROVIDER ?? (process.env.OPENAI_API_KEY ? "openai" : "manus")).toLowerCase(),
  imageApiBaseUrl: process.env.IMAGE_API_BASE_URL ?? process.env.AI_API_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  imageApiKey: process.env.IMAGE_API_KEY ?? process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  imageModel: process.env.IMAGE_MODEL ?? "gpt-image-2",
  /**
   * authMode=manus preserves the original OAuth flow.
   * authMode=local creates/uses a configured local user and removes the dependency on Manus auth.
   */
  authMode: (process.env.AUTH_MODE ?? (process.env.OAUTH_SERVER_URL ? "manus" : "local")).toLowerCase(),
  localUserOpenId: process.env.LOCAL_USER_OPEN_ID ?? "qria-local-user",
  localUserName: process.env.LOCAL_USER_NAME ?? "QRIA User",
  localUserEmail: process.env.LOCAL_USER_EMAIL ?? "local@qria.app",
  // Backward-compatible Manus Forge settings. They can be removed after legacy environments migrate.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/_core/imageGeneration.ts
var DEFAULT_IMAGE_MODEL = "MODEL_GPT_IMAGE_2";
var DEFAULT_IMAGE_QUALITY = "medium";
async function generateImage(options) {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();
  const model = options.model ?? DEFAULT_IMAGE_MODEL;
  const quality = options.quality ?? (model === DEFAULT_IMAGE_MODEL ? DEFAULT_IMAGE_QUALITY : void 0);
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
      model,
      ...quality ? { quality } : {}
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }
  const result = await response.json();
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    url
  };
}

// server/_core/portableImageGeneration.ts
function trimSlash(value) {
  return value.replace(/\/$/, "");
}
async function generatePortableImage(options) {
  if (ENV.imageProvider === "manus") return generateImage(options);
  if (!ENV.imageApiKey) throw new Error(`Image API key is not configured for provider ${ENV.imageProvider}`);
  const baseUrl = trimSlash(ENV.imageApiBaseUrl || "https://api.openai.com/v1");
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.imageApiKey}`
    },
    body: JSON.stringify({
      model: options.model || ENV.imageModel,
      prompt: options.prompt,
      quality: options.quality || "medium",
      size: "1024x1024",
      response_format: "b64_json"
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Image request failed (${response.status}): ${detail}`);
  }
  const result = await response.json();
  const first = result.data?.[0];
  if (first?.url) return { url: first.url };
  if (first?.b64_json) return { url: `data:image/png;base64,${first.b64_json}` };
  throw new Error("Image provider returned no image data");
}

// server/_core/portableLLM.ts
function trimSlash2(value) {
  return value.replace(/\/$/, "");
}
function openAiCompatibleBaseUrl() {
  return trimSlash2(ENV.aiApiBaseUrl || "https://api.openai.com/v1");
}
function providerConfig() {
  if (ENV.aiProvider === "manus") {
    return {
      baseUrl: trimSlash2(ENV.forgeApiUrl || "https://forge.manus.im"),
      apiKey: ENV.forgeApiKey,
      model: ENV.aiModel
    };
  }
  return {
    baseUrl: openAiCompatibleBaseUrl(),
    apiKey: ENV.aiApiKey,
    model: ENV.aiModel
  };
}
function normalizeMessage(message) {
  if (typeof message.content === "string") return message;
  const parts = Array.isArray(message.content) ? message.content : [message.content];
  return {
    ...message,
    content: parts.map((part) => typeof part === "string" ? { type: "text", text: part } : part)
  };
}
function normalizeResponseFormat(params) {
  if (params.response_format) return params.response_format;
  if (params.responseFormat) return params.responseFormat;
  const schema = params.output_schema ?? params.outputSchema;
  if (!schema) return void 0;
  return { type: "json_schema", json_schema: schema };
}
async function invokePortableLLM(params) {
  const { baseUrl, apiKey, model } = providerConfig();
  if (!apiKey) throw new Error(`AI API key is not configured for provider ${ENV.aiProvider}`);
  const payload = {
    model: params.model || model,
    messages: params.messages.map(normalizeMessage)
  };
  if (params.tools?.length) payload.tools = params.tools;
  if (params.tool_choice ?? params.toolChoice) payload.tool_choice = params.tool_choice ?? params.toolChoice;
  if (params.max_tokens ?? params.maxTokens) payload.max_tokens = params.max_tokens ?? params.maxTokens;
  const responseFormat = normalizeResponseFormat(params);
  if (responseFormat) payload.response_format = responseFormat;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }
  return await response.json();
}
async function listPortableLLMModels() {
  const { baseUrl, apiKey, model } = providerConfig();
  if (!apiKey) {
    return { object: "list", data: [{ id: model, object: "model", created: 0, owned_by: ENV.aiProvider }] };
  }
  try {
    const response = await fetch(`${baseUrl}/models`, { headers: { authorization: `Bearer ${apiKey}` } });
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } catch {
    return { object: "list", data: [{ id: model, object: "model", created: 0, owned_by: ENV.aiProvider }] };
  }
}

// server/brandGeneration.ts
var externalGenerationUnavailable = false;
function shouldUseFallback(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /precondition|exhausted|rate limit|temporarily unavailable/i.test(message);
}
var directionItem = {
  type: "object",
  properties: {
    title: { type: "string" },
    essence: { type: "string" },
    visualStyle: { type: "string" },
    palette: { type: "array", minItems: 4, maxItems: 5, items: { type: "object", properties: { name: { type: "string" }, hex: { type: "string" }, use: { type: "string" } }, required: ["name", "hex", "use"], additionalProperties: false } },
    typography: { type: "object", properties: { display: { type: "string" }, body: { type: "string" }, scale: { type: "object", properties: { h1: { type: "string" }, h2: { type: "string" }, body: { type: "string" }, label: { type: "string" } }, required: ["h1", "h2", "body", "label"], additionalProperties: false } }, required: ["display", "body", "scale"], additionalProperties: false },
    logoConcept: { type: "string" },
    logoPrompt: { type: "string" },
    imagery: { type: "string" },
    voice: { type: "string" },
    site: { type: "object", properties: { headline: { type: "string" }, description: { type: "string" }, sections: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { title: { type: "string" }, purpose: { type: "string" } }, required: ["title", "purpose"], additionalProperties: false } } }, required: ["headline", "description", "sections"], additionalProperties: false }
  },
  required: ["title", "essence", "visualStyle", "palette", "typography", "logoConcept", "logoPrompt", "imagery", "voice", "site"],
  additionalProperties: false
};
var directionSchema = { type: "object", properties: { directions: { type: "array", minItems: 5, maxItems: 5, items: directionItem } }, required: ["directions"], additionalProperties: false };
function selectModel(models) {
  return models.find((model) => model.id === "gpt-5.6-terra")?.id ?? models.find((model) => model.id === "gpt-5.6-sol")?.id ?? models.find((model) => model.id === "gpt-5")?.id ?? models.find((model) => model.id === "claude-sonnet-4-6")?.id ?? models[0]?.id;
}
function createFallbackDirections(input) {
  const round = Math.floor(input.priorDirectionTitles.length / 5) + 1;
  const refinement = input.refinementNote?.trim() ? `A proposta responde ao pedido de refinamento: ${input.refinementNote.trim()}` : "A proposta traduz as escolhas feitas no diagn\xF3stico de marca.";
  const territories = [
    { title: "Rota Essencial", style: "Clareza estrat\xE9gica", palette: [["Carv\xE3o", "#24251C", "Base institucional"], ["Marfim", "#F7F4ED", "Fundo"], ["Champanhe", "#C4B96D", "Sinal"], ["Oliva", "#6B6C4E", "Apoio"]], voice: "Direta, segura e orientada ao essencial." },
    { title: "Pulso Preciso", style: "Impacto contempor\xE2neo", palette: [["Azul el\xE9trico", "#2466FF", "Base de impacto"], ["Lima", "#C8FF00", "Acento"], ["Preto profundo", "#141512", "Texto"], ["Nuvem", "#F2F4F8", "Contraste"]], voice: "\xC1gil, n\xEDtida e tecnicamente confiante." },
    { title: "Mat\xE9ria Humana", style: "Proximidade autoral", palette: [["Terracota", "#B95E46", "Base expressiva"], ["Areia", "#EDE1CF", "Fundo"], ["Cacau", "#3C2B25", "Texto"], ["N\xE9voa", "#FFF9F1", "Contraste"]], voice: "Humana, calorosa e precisa sem perder autoridade." },
    { title: "Campo Editorial", style: "Eleg\xE2ncia cultural", palette: [["Vinho", "#54222D", "Base editorial"], ["Rosa mineral", "#E9BEC6", "Acento"], ["Grafite", "#252329", "Texto"], ["Papel", "#FAF8F4", "Contraste"]], voice: "Culta, marcante e intencional." },
    { title: "Sinal Vivo", style: "Expressividade memor\xE1vel", palette: [["Azul noite", "#18243A", "Base"], ["Coral", "#FF6B5F", "Acento"], ["Creme", "#FFF4DF", "Fundo"], ["Verde mineral", "#5E786C", "Apoio"]], voice: "Expressiva, clara e reconhec\xEDvel sem excesso." }
  ];
  return territories.map((territory, index2) => ({
    title: `${input.parentDirection ? `${input.parentDirection.title} \xB7 ` : ""}${territory.title} ${round}`,
    essence: `${refinement} Uma dire\xE7\xE3o constru\xEDda para dar a ${input.brand.name} uma presen\xE7a ${territory.style.toLowerCase()}.`,
    visualStyle: territory.style,
    palette: territory.palette.map(([name, hex, use]) => ({ name, hex, use })),
    typography: { display: index2 % 2 === 0 ? "Playfair Display" : "DM Sans", body: "DM Sans", scale: { h1: "64px", h2: "42px", body: "16px", label: "12px" } },
    logoConcept: `S\xEDmbolo abstrato inspirado em ${territory.title.toLowerCase()}, simples, memor\xE1vel e apto a evoluir em sistema de marca.`,
    logoPrompt: `minimal vector symbol, ${territory.style.toLowerCase()}, clean geometric construction, no text, light background`,
    imagery: `Composi\xE7\xE3o visual que equilibra ${territory.style.toLowerCase()} e \xE1reas de respiro para aplica\xE7\xF5es digitais e impressas.`,
    voice: territory.voice,
    site: { headline: `${input.brand.name}: uma presen\xE7a que encontra a dire\xE7\xE3o certa.`, description: `${input.brand.description} Uma apresenta\xE7\xE3o clara, consistente e pronta para evoluir com a marca.`, sections: [{ title: "In\xEDcio", purpose: "Apresentar a promessa central da marca." }, { title: "M\xE9todo", purpose: "Explicar como a marca trabalha e gera valor." }, { title: "Solu\xE7\xF5es", purpose: "Organizar ofertas e diferenciais com clareza." }, { title: "Resultados", purpose: "Demonstrar impacto e credibilidade." }, { title: "Contato", purpose: "Converter interesse em conversa." }] }
  }));
}
async function generateBrandDirections(input) {
  if (externalGenerationUnavailable) return createFallbackDirections(input);
  const quizNarrative = getAnswerNarrative(input.answers).join("\n");
  const previousDirections = input.priorDirectionTitles.length > 0 ? `Dire\xE7\xF5es j\xE1 vistas: ${input.priorDirectionTitles.join(", ")}. Evite repeti\xE7\xE3o literal.` : "Esta \xE9 a primeira explora\xE7\xE3o.";
  const parentGuidance = input.parentDirection ? `Esta \xE9 uma explora\xE7\xE3o descendente da dire\xE7\xE3o favorita "${input.parentDirection.title}". Gere cinco interpreta\xE7\xF5es parentes: reconhec\xEDveis como pertencentes ao mesmo territ\xF3rio, mas visualmente distintas entre si.` : "Crie cinco territ\xF3rios amplos e genuinamente diferentes entre si.";
  const refinementGuidance = input.refinementNote?.trim() ? `Feedback da pessoa: "${input.refinementNote.trim()}".` : "N\xE3o h\xE1 observa\xE7\xE3o adicional.";
  const { data: models } = await listPortableLLMModels();
  const model = selectModel(models);
  if (!model) throw new Error("Nenhum modelo de IA est\xE1 dispon\xEDvel para gerar as dire\xE7\xF5es da marca.");
  try {
    const response = await invokePortableLLM({ model, messages: [
      { role: "system", content: "Voc\xEA \xE9 uma diretora criativa brasileira de branding premium. Crie identidades estrat\xE9gicas, aplic\xE1veis e sofisticadas. A jornada \xE9 explorat\xF3ria: a pessoa pode favoritar propostas e aprofundar uma delas v\xE1rias vezes antes da escolha final. Produza somente dados v\xE1lidos segundo o esquema." },
      { role: "user", content: `Desenvolva exatamente cinco dire\xE7\xF5es de identidade visual para a marca.

Marca: ${input.brand.name}
Descri\xE7\xE3o: ${input.brand.description}
Diferenciais: ${input.brand.differentials}

Diagn\xF3stico:
${quizNarrative}

${previousDirections}
${parentGuidance}
${refinementGuidance}

Regras: portugu\xEAs brasileiro; fontes existentes; cores HEX; escala em px; conceito de logo como s\xEDmbolo original; logoPrompt em ingl\xEAs, s\xEDmbolo vetorial minimalista em fundo claro, sem texto, letras ou mockup; site com quatro a seis se\xE7\xF5es.` }
    ], response_format: { type: "json_schema", json_schema: { name: "brand_directions", strict: true, schema: directionSchema } } });
    const content = response.choices[0]?.message.content;
    if (!content || typeof content !== "string") return createFallbackDirections(input);
    try {
      const parsed = JSON.parse(content);
      return parsed.directions;
    } catch {
      return createFallbackDirections(input);
    }
  } catch (error) {
    if (shouldUseFallback(error)) externalGenerationUnavailable = true;
    console.warn("[Brand generation] Structured direction service unavailable; using fallback directions", error);
    return createFallbackDirections(input);
  }
}
function safeHex(color, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(color ?? "") ? color : fallback;
}
function createFallbackLogo(direction, index2 = 0) {
  const background = safeHex(direction.palette?.[0]?.hex, "#24251C");
  const signal = safeHex(direction.palette?.[1]?.hex, "#C4B96D");
  const highlight = safeHex(direction.palette?.[2]?.hex, "#F7F4ED");
  const rotation = index2 * 23 % 90;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="S\xEDmbolo conceitual"><rect width="240" height="240" rx="36" fill="${background}"/><g transform="rotate(${rotation} 120 120)" fill="none" stroke="${highlight}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M120 42C74 42 57 79 57 116c0 46 29 77 63 82"/><path d="M120 67c-29 0-38 25-38 49 0 28 16 49 38 57"/><path d="M120 42c46 0 63 37 63 74 0 46-29 77-63 82"/><path d="M120 67c29 0 38 25 38 49 0 28-16 49-38 57"/><path d="M120 91v107"/></g><circle cx="120" cy="120" r="17" fill="${signal}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
async function generateLogoConcepts(directions) {
  if (externalGenerationUnavailable) return directions.map((direction, index2) => createFallbackLogo(direction, index2));
  return Promise.all(directions.map(async (direction, index2) => {
    try {
      const result = await generatePortableImage({ prompt: `Create a refined conceptual logo symbol for a premium brand. ${direction.logoPrompt} Editorial art direction: ${direction.visualStyle}. Color palette reference: ${direction.palette.map((color) => color.hex).join(", ")}. Single elegant standalone vector-like icon on a calm light background. No words, letters, typography, mockup, stationery or 3D rendering.` });
      return result.url;
    } catch (error) {
      if (shouldUseFallback(error)) externalGenerationUnavailable = true;
      return createFallbackLogo(direction, index2);
    }
  }));
}

// server/db.ts
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull(),
  differentials: text("differentials").notNull(),
  status: mysqlEnum("status", ["draft", "in_progress", "selected"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("brands_owner_idx").on(table.ownerId)]);
var brandSessions = mysqlTable("brandSessions", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  ownerId: int("ownerId").notNull(),
  answers: json("answers").$type().notNull(),
  status: mysqlEnum("status", ["draft", "in_progress", "generating", "selected"]).default("draft").notNull(),
  currentRound: int("currentRound").default(0).notNull(),
  selectedDirectionId: int("selectedDirectionId"),
  refinementNote: text("refinementNote"),
  siteApproved: boolean("siteApproved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
}, (table) => [index("brand_sessions_owner_idx").on(table.ownerId), index("brand_sessions_brand_idx").on(table.brandId)]);
var brandDirections = mysqlTable("brandDirections", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  round: int("round").notNull(),
  optionKey: varchar("optionKey", { length: 1 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  content: json("content").$type().notNull(),
  logoImageUrl: text("logoImageUrl"),
  status: mysqlEnum("status", ["proposed", "rejected", "selected"]).default("proposed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
}, (table) => [index("brand_directions_session_round_idx").on(table.sessionId, table.round)]);

// server/db.ts
var _db = null;
var DIRECTION_META_KEY = "__qriaMeta";
var SOURCE_KEY = "__source";
var EXTERNAL_REF_KEY = "__externalBrandRef";
var memory = {
  userSeq: 1,
  brandSeq: 1,
  sessionSeq: 1,
  directionSeq: 1,
  users: [],
  brands: [],
  sessions: [],
  directions: []
};
var useMemory = () => ENV.dbMode === "memory" || !ENV.databaseUrl;
var now = () => /* @__PURE__ */ new Date();
function readDirectionMeta(content) {
  const candidate = content[DIRECTION_META_KEY];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  return candidate;
}
function mergeDirectionMeta(content, patch) {
  const previous = readDirectionMeta(content);
  return { ...content, [DIRECTION_META_KEY]: { ...previous, ...patch } };
}
function withDirectionMeta(direction) {
  const meta = readDirectionMeta(direction.content ?? {});
  return {
    ...direction,
    isFavorite: meta.favorite === true,
    parentDirectionId: typeof meta.parentDirectionId === "number" ? meta.parentDirectionId : null,
    explorationDepth: typeof meta.explorationDepth === "number" ? meta.explorationDepth : 0
  };
}
function getIntegrationContext(session) {
  const answers = session?.answers ?? {};
  return {
    source: answers[SOURCE_KEY] || "qria",
    externalBrandRef: answers[EXTERNAL_REF_KEY] || null
  };
}
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  if (useMemory()) {
    const existing = memory.users.find((item) => item.openId === user.openId);
    const stamp = now();
    if (existing) {
      if (user.name !== void 0) existing.name = user.name ?? null;
      if (user.email !== void 0) existing.email = user.email ?? null;
      if (user.loginMethod !== void 0) existing.loginMethod = user.loginMethod ?? null;
      if (user.role !== void 0) existing.role = user.role;
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
      lastSignedIn: user.lastSignedIn ?? stamp
    });
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel no momento.");
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  const assignNullable = (field) => {
    const value = user[field];
    if (value === void 0) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  if (useMemory()) return memory.users.find((user) => user.openId === openId);
  const db = await getDb();
  if (!db) return void 0;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}
function getInsertId(result) {
  const metadata = Array.isArray(result) ? result[0] : result;
  const insertId = Number(metadata?.insertId);
  if (!Number.isSafeInteger(insertId) || insertId < 1) throw new Error("N\xE3o foi poss\xEDvel obter o identificador da inser\xE7\xE3o no banco de dados.");
  return insertId;
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indispon\xEDvel no momento.");
  return db;
}
async function createBrandWithSession(ownerId, input) {
  const answers = { [SOURCE_KEY]: input.source?.trim() || "qria" };
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
      updatedAt: stamp
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
      updatedAt: stamp
    });
    return { brandId, sessionId };
  }
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const brandResult = await tx.insert(brands).values({
      name: input.name,
      description: input.description,
      differentials: input.differentials,
      ownerId,
      status: "draft"
    });
    const brandId = getInsertId(brandResult);
    const sessionResult = await tx.insert(brandSessions).values({ brandId, ownerId, answers, status: "draft", currentRound: 0 });
    return { brandId, sessionId: getInsertId(sessionResult) };
  });
}
async function listBrandsByOwner(ownerId) {
  if (useMemory()) return memory.brands.filter((brand) => brand.ownerId === ownerId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const db = await requireDb();
  return db.select().from(brands).where(eq(brands.ownerId, ownerId)).orderBy(desc(brands.updatedAt));
}
async function getOwnedBrand(ownerId, brandId) {
  if (useMemory()) return memory.brands.find((brand) => brand.id === brandId && brand.ownerId === ownerId);
  const db = await requireDb();
  return (await db.select().from(brands).where(and(eq(brands.id, brandId), eq(brands.ownerId, ownerId))).limit(1))[0];
}
async function getOwnedSession(ownerId, sessionId) {
  if (useMemory()) return memory.sessions.find((session) => session.id === sessionId && session.ownerId === ownerId);
  const db = await requireDb();
  return (await db.select().from(brandSessions).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId))).limit(1))[0];
}
async function getSessionByBrand(ownerId, brandId) {
  if (useMemory()) return memory.sessions.filter((session) => session.brandId === brandId && session.ownerId === ownerId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  const db = await requireDb();
  return (await db.select().from(brandSessions).where(and(eq(brandSessions.brandId, brandId), eq(brandSessions.ownerId, ownerId))).orderBy(desc(brandSessions.updatedAt)).limit(1))[0];
}
async function saveSessionAnswer(ownerId, sessionId, questionId, option) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return void 0;
  const answers = { ...session.answers ?? {}, [questionId]: option };
  if (useMemory()) {
    session.answers = answers;
    session.status = "in_progress";
    session.updatedAt = now();
    return { ...session, answers, status: "in_progress" };
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ answers, status: "in_progress" }).where(eq(brandSessions.id, sessionId));
  return { ...session, answers, status: "in_progress" };
}
async function saveRefinementNote(ownerId, sessionId, refinementNote) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return false;
  if (useMemory()) {
    session.refinementNote = refinementNote;
    session.updatedAt = now();
    return true;
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ refinementNote }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
  return true;
}
async function setSiteApproval(ownerId, sessionId) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return false;
  if (useMemory()) {
    session.siteApproved = true;
    session.updatedAt = now();
    return true;
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ siteApproved: true }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
  return true;
}
async function getDirectionsForSession(sessionId) {
  if (useMemory()) return memory.directions.filter((direction) => direction.sessionId === sessionId).sort((a, b) => b.round - a.round || a.optionKey.localeCompare(b.optionKey)).map(withDirectionMeta);
  const db = await requireDb();
  const rows = await db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round), brandDirections.optionKey);
  return rows.map(withDirectionMeta);
}
async function getDirection(ownerId, sessionId, directionId) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return void 0;
  if (useMemory()) {
    const row2 = memory.directions.find((direction) => direction.id === directionId && direction.sessionId === sessionId);
    return row2 ? withDirectionMeta(row2) : void 0;
  }
  const db = await requireDb();
  const row = (await db.select().from(brandDirections).where(and(eq(brandDirections.id, directionId), eq(brandDirections.sessionId, sessionId))).limit(1))[0];
  return row ? withDirectionMeta(row) : void 0;
}
async function getFavoriteDirections(ownerId, sessionId) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return [];
  return (await getDirectionsForSession(sessionId)).filter((direction) => direction.isFavorite);
}
async function setDirectionFavorite(ownerId, sessionId, directionId, favorite) {
  const direction = await getDirection(ownerId, sessionId, directionId);
  if (!direction) return false;
  if (useMemory()) {
    const row = memory.directions.find((item) => item.id === directionId);
    row.content = mergeDirectionMeta(direction.content, { favorite });
    return true;
  }
  const db = await requireDb();
  await db.update(brandDirections).set({ content: mergeDirectionMeta(direction.content, { favorite }) }).where(eq(brandDirections.id, directionId));
  return true;
}
async function getLatestRound(sessionId) {
  if (useMemory()) return memory.directions.filter((direction) => direction.sessionId === sessionId).reduce((max, direction) => Math.max(max, direction.round), 0);
  const db = await requireDb();
  const result = await db.select().from(brandDirections).where(eq(brandDirections.sessionId, sessionId)).orderBy(desc(brandDirections.round)).limit(1);
  return result[0]?.round ?? 0;
}
async function rejectLatestDirectionRound(ownerId, sessionId) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return false;
  const latestRound = await getLatestRound(sessionId);
  if (latestRound === 0) return true;
  const directions = await getDirectionsForSession(sessionId);
  const ids = directions.filter((direction) => direction.round === latestRound && direction.status === "proposed" && !direction.isFavorite).map((direction) => direction.id);
  if (useMemory()) {
    memory.directions.forEach((direction) => {
      if (ids.includes(direction.id)) direction.status = "rejected";
    });
    return true;
  }
  if (ids.length > 0) {
    const db = await requireDb();
    await db.update(brandDirections).set({ status: "rejected" }).where(inArray(brandDirections.id, ids));
  }
  return true;
}
async function reopenSelectedBrandSession(ownerId, sessionId) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return false;
  const directions = await getDirectionsForSession(sessionId);
  const ids = directions.filter((direction) => direction.round === session.currentRound && (direction.status === "proposed" || direction.status === "selected") && !direction.isFavorite).map((direction) => direction.id);
  if (useMemory()) {
    memory.directions.forEach((direction) => {
      if (ids.includes(direction.id)) direction.status = "rejected";
    });
    session.status = "in_progress";
    session.selectedDirectionId = null;
    session.updatedAt = now();
    const brand = memory.brands.find((item) => item.id === session.brandId);
    if (brand) {
      brand.status = "in_progress";
      brand.updatedAt = now();
    }
    return true;
  }
  const db = await requireDb();
  await db.transaction(async (tx) => {
    if (ids.length > 0) await tx.update(brandDirections).set({ status: "rejected" }).where(inArray(brandDirections.id, ids));
    await tx.update(brandSessions).set({ status: "in_progress", selectedDirectionId: null }).where(eq(brandSessions.id, sessionId));
    await tx.update(brands).set({ status: "in_progress" }).where(eq(brands.id, session.brandId));
  });
  return true;
}
async function setSessionGenerating(ownerId, sessionId, currentRound) {
  if (useMemory()) {
    const session = await getOwnedSession(ownerId, sessionId);
    if (!session) return;
    session.status = "generating";
    session.currentRound = currentRound;
    session.updatedAt = now();
    return;
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ status: "generating", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
}
async function restoreSessionAfterGenerationFailure(ownerId, sessionId, currentRound) {
  if (useMemory()) {
    const session = await getOwnedSession(ownerId, sessionId);
    if (!session) return;
    session.status = "in_progress";
    session.currentRound = currentRound;
    session.updatedAt = now();
    return;
  }
  const db = await requireDb();
  await db.update(brandSessions).set({ status: "in_progress", currentRound }).where(and(eq(brandSessions.id, sessionId), eq(brandSessions.ownerId, ownerId)));
}
async function createDirectionRound(sessionId, round, directions, parentDirectionId, explorationDepth = 0) {
  const optionKeys = ["A", "B", "C", "D", "E"];
  if (useMemory()) {
    const stamp = now();
    directions.forEach((direction, index2) => memory.directions.push({
      id: memory.directionSeq++,
      sessionId,
      round,
      optionKey: optionKeys[index2] ?? "E",
      title: direction.title,
      content: mergeDirectionMeta(direction.content, { favorite: false, parentDirectionId: parentDirectionId ?? null, explorationDepth }),
      logoImageUrl: direction.logoImageUrl,
      status: "proposed",
      createdAt: stamp
    }));
    const session = memory.sessions.find((item) => item.id === sessionId);
    if (session) {
      session.status = "in_progress";
      session.currentRound = round;
      session.updatedAt = stamp;
    }
    return;
  }
  const db = await requireDb();
  await db.insert(brandDirections).values(directions.map((direction, index2) => ({
    sessionId,
    round,
    optionKey: optionKeys[index2] ?? "E",
    title: direction.title,
    content: mergeDirectionMeta(direction.content, { favorite: false, parentDirectionId: parentDirectionId ?? null, explorationDepth }),
    logoImageUrl: direction.logoImageUrl,
    status: "proposed"
  })));
  await db.update(brandSessions).set({ status: "in_progress", currentRound: round }).where(eq(brandSessions.id, sessionId));
}
async function selectDirection(ownerId, sessionId, directionId) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) return false;
  const direction = await getDirection(ownerId, sessionId, directionId);
  if (!direction) return false;
  if (useMemory()) {
    const row = memory.directions.find((item) => item.id === directionId);
    row.status = "selected";
    row.content = mergeDirectionMeta(direction.content, { favorite: true });
    session.status = "selected";
    session.selectedDirectionId = directionId;
    session.updatedAt = now();
    const brand = memory.brands.find((item) => item.id === session.brandId);
    if (brand) {
      brand.status = "selected";
      brand.updatedAt = now();
    }
    return true;
  }
  const db = await requireDb();
  await db.transaction(async (tx) => {
    await tx.update(brandDirections).set({ status: "selected", content: mergeDirectionMeta(direction.content, { favorite: true }) }).where(eq(brandDirections.id, directionId));
    await tx.update(brandSessions).set({ status: "selected", selectedDirectionId: directionId }).where(eq(brandSessions.id, sessionId));
    await tx.update(brands).set({ status: "selected" }).where(eq(brands.id, session.brandId));
  });
  return true;
}
async function getSelectedDirection(ownerId, brandId) {
  const session = await getSessionByBrand(ownerId, brandId);
  if (!session?.selectedDirectionId) return void 0;
  if (useMemory()) {
    const row2 = memory.directions.find((direction) => direction.id === session.selectedDirectionId);
    return row2 ? withDirectionMeta(row2) : void 0;
  }
  const db = await requireDb();
  const row = (await db.select().from(brandDirections).where(eq(brandDirections.id, session.selectedDirectionId)).limit(1))[0];
  return row ? withDirectionMeta(row) : void 0;
}

// server/routers.ts
var brandInput = z2.object({
  name: z2.string().trim().min(2).max(160),
  description: z2.string().trim().min(12).max(2e3),
  differentials: z2.string().trim().min(8).max(2e3),
  source: z2.string().trim().min(2).max(64).optional(),
  externalBrandRef: z2.string().trim().max(191).optional()
});
function completedQuizAnswers(answers) {
  return BRAND_QUIZ.filter((question) => Boolean(answers?.[question.id])).length;
}
async function generateRound(ownerId, sessionId, options = {}) {
  const session = await getOwnedSession(ownerId, sessionId);
  if (!session) throw new TRPCError3({ code: "NOT_FOUND", message: "Sess\xE3o n\xE3o encontrada." });
  const brand = await getOwnedBrand(ownerId, session.brandId);
  if (!brand) throw new TRPCError3({ code: "NOT_FOUND", message: "Marca n\xE3o encontrada." });
  if (completedQuizAnswers(session.answers) < BRAND_QUIZ_TOTAL) throw new TRPCError3({ code: "BAD_REQUEST", message: "Responda todas as perguntas antes de gerar as dire\xE7\xF5es." });
  const existingDirections = await getDirectionsForSession(sessionId);
  const parent = options.parentDirectionId ? await getDirection(ownerId, sessionId, options.parentDirectionId) : void 0;
  if (options.parentDirectionId && !parent) throw new TRPCError3({ code: "NOT_FOUND", message: "Dire\xE7\xE3o-base n\xE3o encontrada." });
  const parentContent = parent?.content;
  const parentGuidance = parent ? `Crie cinco varia\xE7\xF5es claramente descendentes da dire\xE7\xE3o "${parent.title}". Preserve o que a torna reconhec\xEDvel, mas explore cinco solu\xE7\xF5es diferentes de s\xEDmbolo, composi\xE7\xE3o, tipografia e acabamento.` : void 0;
  const requestedNote = options.refinementNote?.trim() || parentGuidance || session.refinementNote || void 0;
  if (options.refinementNote?.trim()) await saveRefinementNote(ownerId, sessionId, options.refinementNote.trim());
  if (options.rejectCurrentRound) {
    const rejected = session.status === "selected" ? await reopenSelectedBrandSession(ownerId, sessionId) : await rejectLatestDirectionRound(ownerId, sessionId);
    if (!rejected) throw new TRPCError3({ code: "NOT_FOUND", message: "Sess\xE3o n\xE3o encontrada." });
  }
  const nextRound = await getLatestRound(sessionId) + 1;
  await setSessionGenerating(ownerId, sessionId, nextRound);
  try {
    const directions = await generateBrandDirections({
      brand: { name: brand.name, description: brand.description, differentials: brand.differentials },
      answers: session.answers ?? {},
      priorDirectionTitles: existingDirections.map((direction) => direction.title),
      refinementNote: requestedNote,
      parentDirection: parent ? { title: parent.title, content: parentContent ?? {} } : void 0
    });
    const logoImageUrls = await generateLogoConcepts(directions);
    await createDirectionRound(sessionId, nextRound, directions.map((direction, index2) => ({ title: direction.title, content: direction, logoImageUrl: logoImageUrls[index2] ?? null })), parent?.id, parent ? parent.explorationDepth + 1 : 0);
  } catch (error) {
    await restoreSessionAfterGenerationFailure(ownerId, sessionId, Math.max(nextRound - 1, 0));
    throw error;
  }
  return getDirectionsForSession(sessionId);
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  brand: router({
    list: protectedProcedure.query(({ ctx }) => listBrandsByOwner(ctx.user.id)),
    start: protectedProcedure.input(brandInput).mutation(({ ctx, input }) => createBrandWithSession(ctx.user.id, input)),
    getWorkspace: protectedProcedure.input(z2.object({ brandId: z2.number().int().positive() })).query(async ({ ctx, input }) => {
      const brand = await getOwnedBrand(ctx.user.id, input.brandId);
      if (!brand) throw new TRPCError3({ code: "NOT_FOUND", message: "Marca n\xE3o encontrada." });
      const session = await getSessionByBrand(ctx.user.id, input.brandId);
      const directions = session ? await getDirectionsForSession(session.id) : [];
      const favorites = session ? await getFavoriteDirections(ctx.user.id, session.id) : [];
      const selectedDirection = await getSelectedDirection(ctx.user.id, input.brandId);
      const integration = getIntegrationContext(session);
      return { brand, session, directions, favorites, selectedDirection, integration };
    }),
    answer: protectedProcedure.input(z2.object({ sessionId: z2.number().int().positive(), questionId: z2.string(), option: z2.enum(["A", "B", "C", "D", "E"]) })).mutation(async ({ ctx, input }) => {
      if (!BRAND_QUIZ.some((question) => question.id === input.questionId)) throw new TRPCError3({ code: "BAD_REQUEST", message: "Pergunta de quiz inv\xE1lida." });
      const updated = await saveSessionAnswer(ctx.user.id, input.sessionId, input.questionId, input.option);
      if (!updated) throw new TRPCError3({ code: "NOT_FOUND", message: "Sess\xE3o n\xE3o encontrada." });
      return updated;
    }),
    generate: protectedProcedure.input(z2.object({ sessionId: z2.number().int().positive() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId)),
    regenerate: protectedProcedure.input(z2.object({ sessionId: z2.number().int().positive(), refinementNote: z2.string().trim().max(2e3).optional() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId, { rejectCurrentRound: true, refinementNote: input.refinementNote })),
    explore: protectedProcedure.input(z2.object({ sessionId: z2.number().int().positive(), directionId: z2.number().int().positive(), refinementNote: z2.string().trim().max(2e3).optional() })).mutation(({ ctx, input }) => generateRound(ctx.user.id, input.sessionId, { parentDirectionId: input.directionId, refinementNote: input.refinementNote })),
    favorite: protectedProcedure.input(z2.object({ sessionId: z2.number().int().positive(), directionId: z2.number().int().positive(), favorite: z2.boolean() })).mutation(async ({ ctx, input }) => {
      const ok = await setDirectionFavorite(ctx.user.id, input.sessionId, input.directionId, input.favorite);
      if (!ok) throw new TRPCError3({ code: "NOT_FOUND", message: "Dire\xE7\xE3o n\xE3o encontrada." });
      return { success: true, favorite: input.favorite };
    }),
    choose: protectedProcedure.input(z2.object({ sessionId: z2.number().int().positive(), directionId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const selected = await selectDirection(ctx.user.id, input.sessionId, input.directionId);
      if (!selected) throw new TRPCError3({ code: "NOT_FOUND", message: "Dire\xE7\xE3o n\xE3o encontrada." });
      return { success: true };
    }),
    approveSite: protectedProcedure.input(z2.object({ sessionId: z2.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const approved = await setSiteApproval(ctx.user.id, input.sessionId);
      if (!approved) throw new TRPCError3({ code: "NOT_FOUND", message: "Sess\xE3o n\xE3o encontrada." });
      return { success: true };
    })
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now2 = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now2,
    updatedAt: now2,
    lastSignedIn: now2,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/context.ts
async function getPortableLocalUser() {
  try {
    let user = await getUserByOpenId(ENV.localUserOpenId);
    if (!user) {
      await upsertUser({
        openId: ENV.localUserOpenId,
        name: ENV.localUserName,
        email: ENV.localUserEmail,
        loginMethod: "local",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      user = await getUserByOpenId(ENV.localUserOpenId);
    }
    return user ?? null;
  } catch (error) {
    console.warn("[Auth] Portable local user unavailable", error);
    return null;
  }
}
async function createContext(opts) {
  let user = null;
  if (ENV.authMode === "local" || ENV.authMode === "none") {
    user = await getPortableLocalUser();
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/app.ts
function createApp() {
  const app2 = express();
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  if (ENV.authMode === "manus") {
    registerOAuthRoutes(app2);
    registerStorageProxy(app2);
  }
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  app2.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      app: "qria",
      authMode: ENV.authMode,
      aiProvider: ENV.aiProvider,
      imageProvider: ENV.imageProvider
    });
  });
  return app2;
}

// api/[...path].ts
var app = createApp();
var path_default = app;
export {
  path_default as default
};
