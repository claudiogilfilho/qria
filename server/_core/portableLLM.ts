import { ENV } from "./env";
import type { InvokeParams, InvokeResult, ModelsResponse, ResponseFormat } from "./llm";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

function openAiCompatibleBaseUrl() {
  return trimSlash(ENV.aiApiBaseUrl || "https://api.openai.com/v1");
}

function providerConfig() {
  if (ENV.aiProvider === "manus") {
    return {
      baseUrl: trimSlash(ENV.forgeApiUrl || "https://forge.manus.im"),
      apiKey: ENV.forgeApiKey,
      model: ENV.aiModel,
    };
  }
  return {
    baseUrl: openAiCompatibleBaseUrl(),
    apiKey: ENV.aiApiKey,
    model: ENV.aiModel,
  };
}

function normalizeMessage(message: InvokeParams["messages"][number]) {
  if (typeof message.content === "string") return message;
  const parts = Array.isArray(message.content) ? message.content : [message.content];
  return {
    ...message,
    content: parts.map(part => typeof part === "string" ? { type: "text", text: part } : part),
  };
}

function normalizeResponseFormat(params: InvokeParams): ResponseFormat | undefined {
  if (params.response_format) return params.response_format;
  if (params.responseFormat) return params.responseFormat;
  const schema = params.output_schema ?? params.outputSchema;
  if (!schema) return undefined;
  return { type: "json_schema", json_schema: schema };
}

export async function invokePortableLLM(params: InvokeParams): Promise<InvokeResult> {
  const { baseUrl, apiKey, model } = providerConfig();
  if (!apiKey) throw new Error(`AI API key is not configured for provider ${ENV.aiProvider}`);

  const payload: Record<string, unknown> = {
    model: params.model || model,
    messages: params.messages.map(normalizeMessage),
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
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }
  return await response.json() as InvokeResult;
}

export async function listPortableLLMModels(): Promise<ModelsResponse> {
  const { baseUrl, apiKey, model } = providerConfig();
  if (!apiKey) {
    return { object: "list", data: [{ id: model, object: "model", created: 0, owned_by: ENV.aiProvider }] };
  }
  try {
    const response = await fetch(`${baseUrl}/models`, { headers: { authorization: `Bearer ${apiKey}` } });
    if (!response.ok) throw new Error(String(response.status));
    return await response.json() as ModelsResponse;
  } catch {
    return { object: "list", data: [{ id: model, object: "model", created: 0, owned_by: ENV.aiProvider }] };
  }
}
