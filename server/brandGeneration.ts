import { generatePortableImage as generateImage } from "./_core/portableImageGeneration";
import { invokePortableLLM as invokeLLM, listPortableLLMModels as listLLMModels } from "./_core/portableLLM";
import { getAnswerNarrative } from "../shared/brandQuiz";

let externalGenerationUnavailable = false;
function shouldUseFallback(error: unknown) { const message = error instanceof Error ? error.message : String(error); return /precondition|exhausted|rate limit|temporarily unavailable/i.test(message); }

export type PaletteColor = { name: string; hex: string; use: string };
export type BrandDirection = {
  title: string; essence: string; visualStyle: string; palette: PaletteColor[];
  typography: { display: string; body: string; scale: { h1: string; h2: string; body: string; label: string } };
  logoConcept: string; logoPrompt: string; imagery: string; voice: string;
  site: { headline: string; description: string; sections: Array<{ title: string; purpose: string }> };
};

type GenerationInput = {
  brand: { name: string; description: string; differentials: string };
  answers: Record<string, string>; priorDirectionTitles: string[]; refinementNote?: string;
  parentDirection?: { title: string; content: Record<string, unknown> };
};

const directionItem = {
  type: "object",
  properties: {
    title: { type: "string" }, essence: { type: "string" }, visualStyle: { type: "string" },
    palette: { type: "array", minItems: 4, maxItems: 5, items: { type: "object", properties: { name: { type: "string" }, hex: { type: "string" }, use: { type: "string" } }, required: ["name", "hex", "use"], additionalProperties: false } },
    typography: { type: "object", properties: { display: { type: "string" }, body: { type: "string" }, scale: { type: "object", properties: { h1: { type: "string" }, h2: { type: "string" }, body: { type: "string" }, label: { type: "string" } }, required: ["h1", "h2", "body", "label"], additionalProperties: false } }, required: ["display", "body", "scale"], additionalProperties: false },
    logoConcept: { type: "string" }, logoPrompt: { type: "string" }, imagery: { type: "string" }, voice: { type: "string" },
    site: { type: "object", properties: { headline: { type: "string" }, description: { type: "string" }, sections: { type: "array", minItems: 4, maxItems: 6, items: { type: "object", properties: { title: { type: "string" }, purpose: { type: "string" } }, required: ["title", "purpose"], additionalProperties: false } } }, required: ["headline", "description", "sections"], additionalProperties: false },
  },
  required: ["title", "essence", "visualStyle", "palette", "typography", "logoConcept", "logoPrompt", "imagery", "voice", "site"], additionalProperties: false,
} as const;
const directionSchema = { type: "object", properties: { directions: { type: "array", minItems: 5, maxItems: 5, items: directionItem } }, required: ["directions"], additionalProperties: false } as const;

function selectModel(models: Array<{ id: string }>) { return models.find(model => model.id === "gpt-5.6-terra")?.id ?? models.find(model => model.id === "gpt-5.6-sol")?.id ?? models.find(model => model.id === "gpt-5")?.id ?? models.find(model => model.id === "claude-sonnet-4-6")?.id ?? models[0]?.id; }

export function createFallbackDirections(input: GenerationInput): BrandDirection[] {
  const round = Math.floor(input.priorDirectionTitles.length / 5) + 1;
  const refinement = input.refinementNote?.trim() ? `A proposta responde ao pedido de refinamento: ${input.refinementNote.trim()}` : "A proposta traduz as escolhas feitas no diagnóstico de marca.";
  const territories = [
    { title: "Rota Essencial", style: "Clareza estratégica", palette: [["Carvão", "#24251C", "Base institucional"], ["Marfim", "#F7F4ED", "Fundo"], ["Champanhe", "#C4B96D", "Sinal"], ["Oliva", "#6B6C4E", "Apoio"]], voice: "Direta, segura e orientada ao essencial." },
    { title: "Pulso Preciso", style: "Impacto contemporâneo", palette: [["Azul elétrico", "#2466FF", "Base de impacto"], ["Lima", "#C8FF00", "Acento"], ["Preto profundo", "#141512", "Texto"], ["Nuvem", "#F2F4F8", "Contraste"]], voice: "Ágil, nítida e tecnicamente confiante." },
    { title: "Matéria Humana", style: "Proximidade autoral", palette: [["Terracota", "#B95E46", "Base expressiva"], ["Areia", "#EDE1CF", "Fundo"], ["Cacau", "#3C2B25", "Texto"], ["Névoa", "#FFF9F1", "Contraste"]], voice: "Humana, calorosa e precisa sem perder autoridade." },
    { title: "Campo Editorial", style: "Elegância cultural", palette: [["Vinho", "#54222D", "Base editorial"], ["Rosa mineral", "#E9BEC6", "Acento"], ["Grafite", "#252329", "Texto"], ["Papel", "#FAF8F4", "Contraste"]], voice: "Culta, marcante e intencional." },
    { title: "Sinal Vivo", style: "Expressividade memorável", palette: [["Azul noite", "#18243A", "Base"], ["Coral", "#FF6B5F", "Acento"], ["Creme", "#FFF4DF", "Fundo"], ["Verde mineral", "#5E786C", "Apoio"]], voice: "Expressiva, clara e reconhecível sem excesso." },
  ];
  return territories.map((territory, index) => ({
    title: `${input.parentDirection ? `${input.parentDirection.title} · ` : ""}${territory.title} ${round}`,
    essence: `${refinement} Uma direção construída para dar a ${input.brand.name} uma presença ${territory.style.toLowerCase()}.`, visualStyle: territory.style,
    palette: territory.palette.map(([name, hex, use]) => ({ name, hex, use })), typography: { display: index % 2 === 0 ? "Playfair Display" : "DM Sans", body: "DM Sans", scale: { h1: "64px", h2: "42px", body: "16px", label: "12px" } },
    logoConcept: `Símbolo abstrato inspirado em ${territory.title.toLowerCase()}, simples, memorável e apto a evoluir em sistema de marca.`, logoPrompt: `minimal vector symbol, ${territory.style.toLowerCase()}, clean geometric construction, no text, light background`,
    imagery: `Composição visual que equilibra ${territory.style.toLowerCase()} e áreas de respiro para aplicações digitais e impressas.`, voice: territory.voice,
    site: { headline: `${input.brand.name}: uma presença que encontra a direção certa.`, description: `${input.brand.description} Uma apresentação clara, consistente e pronta para evoluir com a marca.`, sections: [{ title: "Início", purpose: "Apresentar a promessa central da marca." }, { title: "Método", purpose: "Explicar como a marca trabalha e gera valor." }, { title: "Soluções", purpose: "Organizar ofertas e diferenciais com clareza." }, { title: "Resultados", purpose: "Demonstrar impacto e credibilidade." }, { title: "Contato", purpose: "Converter interesse em conversa." }] },
  }));
}

export async function generateBrandDirections(input: GenerationInput): Promise<BrandDirection[]> {
  if (externalGenerationUnavailable) return createFallbackDirections(input);
  const quizNarrative = getAnswerNarrative(input.answers).join("\n");
  const previousDirections = input.priorDirectionTitles.length > 0 ? `Direções já vistas: ${input.priorDirectionTitles.join(", ")}. Evite repetição literal.` : "Esta é a primeira exploração.";
  const parentGuidance = input.parentDirection ? `Esta é uma exploração descendente da direção favorita \"${input.parentDirection.title}\". Gere cinco interpretações parentes: reconhecíveis como pertencentes ao mesmo território, mas visualmente distintas entre si.` : "Crie cinco territórios amplos e genuinamente diferentes entre si.";
  const refinementGuidance = input.refinementNote?.trim() ? `Feedback da pessoa: "${input.refinementNote.trim()}".` : "Não há observação adicional.";
  const { data: models } = await listLLMModels(); const model = selectModel(models); if (!model) throw new Error("Nenhum modelo de IA está disponível para gerar as direções da marca.");
  try {
    const response = await invokeLLM({ model, messages: [
      { role: "system", content: "Você é uma diretora criativa brasileira de branding premium. Crie identidades estratégicas, aplicáveis e sofisticadas. A jornada é exploratória: a pessoa pode favoritar propostas e aprofundar uma delas várias vezes antes da escolha final. Produza somente dados válidos segundo o esquema." },
      { role: "user", content: `Desenvolva exatamente cinco direções de identidade visual para a marca.\n\nMarca: ${input.brand.name}\nDescrição: ${input.brand.description}\nDiferenciais: ${input.brand.differentials}\n\nDiagnóstico:\n${quizNarrative}\n\n${previousDirections}\n${parentGuidance}\n${refinementGuidance}\n\nRegras: português brasileiro; fontes existentes; cores HEX; escala em px; conceito de logo como símbolo original; logoPrompt em inglês, símbolo vetorial minimalista em fundo claro, sem texto, letras ou mockup; site com quatro a seis seções.` },
    ], response_format: { type: "json_schema", json_schema: { name: "brand_directions", strict: true, schema: directionSchema } } });
    const content = response.choices[0]?.message.content; if (!content || typeof content !== "string") return createFallbackDirections(input);
    try { const parsed = JSON.parse(content) as { directions: BrandDirection[] }; return parsed.directions; } catch { return createFallbackDirections(input); }
  } catch (error) { if (shouldUseFallback(error)) externalGenerationUnavailable = true; console.warn("[Brand generation] Structured direction service unavailable; using fallback directions", error); return createFallbackDirections(input); }
}

function safeHex(color: string | undefined, fallback: string) { return /^#[0-9a-fA-F]{6}$/.test(color ?? "") ? color! : fallback; }
export function createFallbackLogo(direction: BrandDirection, index = 0) { const background = safeHex(direction.palette?.[0]?.hex, "#24251C"); const signal = safeHex(direction.palette?.[1]?.hex, "#C4B96D"); const highlight = safeHex(direction.palette?.[2]?.hex, "#F7F4ED"); const rotation = (index * 23) % 90; const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Símbolo conceitual"><rect width="240" height="240" rx="36" fill="${background}"/><g transform="rotate(${rotation} 120 120)" fill="none" stroke="${highlight}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M120 42C74 42 57 79 57 116c0 46 29 77 63 82"/><path d="M120 67c-29 0-38 25-38 49 0 28 16 49 38 57"/><path d="M120 42c46 0 63 37 63 74 0 46-29 77-63 82"/><path d="M120 67c29 0 38 25 38 49 0 28-16 49-38 57"/><path d="M120 91v107"/></g><circle cx="120" cy="120" r="17" fill="${signal}"/></svg>`; return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`; }
export async function generateLogoConcepts(directions: BrandDirection[]) { if (externalGenerationUnavailable) return directions.map((direction, index) => createFallbackLogo(direction, index)); return Promise.all(directions.map(async (direction, index) => { try { const result = await generateImage({ prompt: `Create a refined conceptual logo symbol for a premium brand. ${direction.logoPrompt} Editorial art direction: ${direction.visualStyle}. Color palette reference: ${direction.palette.map(color => color.hex).join(", ")}. Single elegant standalone vector-like icon on a calm light background. No words, letters, typography, mockup, stationery or 3D rendering.` }); return result.url; } catch (error) { if (shouldUseFallback(error)) externalGenerationUnavailable = true; return createFallbackLogo(direction, index); } })); }
