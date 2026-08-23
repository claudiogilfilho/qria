import { ENV } from "./env";
import { generateImage as generateManusImage, type GenerateImageOptions, type GenerateImageResponse } from "./imageGeneration";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

/**
 * Portable image generation.
 * - manus: preserves the legacy Forge service.
 * - openai/compatible: uses an OpenAI-compatible /images/generations endpoint.
 * Returned base64 data is exposed as a data URL, so S3 is not required.
 */
export async function generatePortableImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (ENV.imageProvider === "manus") return generateManusImage(options);

  if (!ENV.imageApiKey) throw new Error(`Image API key is not configured for provider ${ENV.imageProvider}`);
  const baseUrl = trimSlash(ENV.imageApiBaseUrl || "https://api.openai.com/v1");
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.imageApiKey}`,
    },
    body: JSON.stringify({
      model: options.model || ENV.imageModel,
      prompt: options.prompt,
      quality: options.quality || "medium",
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Image request failed (${response.status}): ${detail}`);
  }
  const result = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = result.data?.[0];
  if (first?.url) return { url: first.url };
  if (first?.b64_json) return { url: `data:image/png;base64,${first.b64_json}` };
  throw new Error("Image provider returned no image data");
}
