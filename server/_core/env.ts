export const ENV = {
  appId: process.env.VITE_APP_ID ?? process.env.APP_ID ?? "qria",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
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
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
