import { generateImage } from "./_core/imageGeneration";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { getAnswerNarrative } from "../shared/brandQuiz";

let externalGenerationUnavailable = false;

function shouldUseFallback(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /precondition|exhausted|rate limit|temporarily unavailable/i.test(message);
}

export type PaletteColor = {
  name: string;
  hex: string;
  use: string;
};

export type BrandDirection = {
  title: string;
  essence: string;
  visualStyle: string;
  palette: PaletteColor[];
  typography: {
    display: string;
    body: string;
    scale: {
      h1: string;
      h2: string;
      body: string;
      label: string;
    };
  };
  logoConcept: string;
  logoPrompt: string;
  imagery: string;
  voice: string;
  site: {
    headline: string;
    description: string;
    sections: Array<{
      title: string;
      purpose: string;
    }>;
  };
};

type GenerationInput = {
  brand: {
    name: string;
    description: string;
    differentials: string;
  };
  answers: Record<string, string>;
  priorDirectionTitles: string[];
  refinementNote?: string;
};

const directionSchema = {
  type: "object",
  properties: {
    directions: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          essence: { type: "string" },
          visualStyle: { type: "string" },
          palette: {
            type: "array",
            minItems: 4,
            maxItems: 5,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                hex: { type: "string" },
                use: { type: "string" },
              },
              required: ["name", "hex", "use"],
              additionalProperties: false,
            },
          },
          typography: {
            type: "object",
            properties: {
              display: { type: "string" },
              body: { type: "string" },
              scale: {
                type: "object",
                properties: {
                  h1: { type: "string" },
                  h2: { type: "string" },
                  body: { type: "string" },
                  label: { type: "string" },
                },
                required: ["h1", "h2", "body", "label"],
                additionalProperties: false,
              },
            },
            required: ["display", "body", "scale"],
            additionalProperties: false,
          },
          logoConcept: { type: "string" },
          logoPrompt: { type: "string" },
          imagery: { type: "string" },
          voice: { type: "string" },
          site: {
            type: "object",
            properties: {
              headline: { type: "string" },
              description: { type: "string" },
              sections: {
                type: "array",
                minItems: 4,
                maxItems: 6,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    purpose: { type: "string" },
                  },
                  required: ["title", "purpose"],
                  additionalProperties: false,
                },
              },
            },
            required: ["headline", "description", "sections"],
            additionalProperties: false,
          },
        },
        required: [
          "title",
          "essence",
          "visualStyle",
          "palette",
          "typography",
          "logoConcept",
          "logoPrompt",
          "imagery",
          "voice",
          "site",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["directions"],
  additionalProperties: false,
} as const;

function selectModel(models: Array<{ id: string }>) {
  return models.find(model => model.id === "gpt-5")?.id
    ?? models.find(model => model.id === "claude-sonnet-4-6")?.id
    ?? models.find(model => model.id === "gpt-5-mini")?.id
    ?? models[0]?.id;
}

export function createFallbackDirections(input: GenerationInput): BrandDirection[] {
  const round = Math.floor(input.priorDirectionTitles.length / 5) + 1;
  const refinement = input.refinementNote?.trim()
    ? `A proposta responde ao pedido de refinamento: ${input.refinementNote.trim()}`
    : "A proposta traduz as escolhas feitas no diagnóstico de marca.";
  const territories = [
    { title: "Rota Essencial", style: "Clareza estratégica", palette: [["Carvão", "#24251C", "Base institucional"], ["Marfim", "#F7F4ED", "Fundo"], ["Champanhe", "#C4B96D", "Sinal"], ["Oliva", "#6B6C4E", "Apoio"]], voice: "Direta, segura e orientada ao essencial." },
    { title: "Pulso Preciso", style: "Impacto contemporâneo", palette: [["Azul elétrico", "#2466FF", "Base de impacto"], ["Lima", "#C8FF00", "Acento"], ["Preto profundo", "#141512", "Texto"], ["Nuvem", "#F2F4F8", "Contraste"]], voice: "Ágil, nítida e tecnicamente confiante." },
    { title: "Matéria Humana", style: "Proximidade autoral", palette: [["Terracota", "#B95E46", "Base expressiva"], ["Areia", "#EDE1CF", "Fundo"], ["Cacau", "#3C2B25", "Texto"], ["Névoa", "#FFF9F1", "Contraste"]], voice: "Humana, calorosa e precisa sem perder autoridade." },
    { title: "Campo Editorial", style: "Elegância cultural", palette: [["Vinho", "#54222D", "Base editorial"], ["Rosa mineral", "#E9BEC6", "Acento"], ["Grafite", "#252329", "Texto"], ["Papel", "#FAF8F4", "Contraste"]], voice: "Culta, marcante e intencional." },
    { title: "Choque Vivo", style: "Experimental pop", palette: [["Violeta vivo", "#7C3CFF", "Base de alto impacto"], ["Coral neon", "#FF5A5F", "Acento emocional"], ["Ciano elétrico", "#00D8FF", "Contraponto"], ["Amarelo ácido", "#F5FF3B", "Sinal"], ["Preto", "#121212", "Texto e estrutura"]], voice: "Provocadora, energética e impossível de confundir." },
  ];
  return territories.map((territory, index) => ({
    title: `${territory.title} ${round}`,
    essence: `${refinement} Uma direção construída para dar a ${input.brand.name} uma presença ${territory.style.toLowerCase()}.`,
    visualStyle: territory.style,
    palette: territory.palette.map(([name, hex, use]) => ({ name, hex, use })),
    typography: { display: index % 2 === 0 ? "Playfair Display" : "DM Sans", body: "DM Sans", scale: { h1: "64px", h2: "42px", body: "16px", label: "12px" } },
    logoConcept: `Símbolo abstrato inspirado em ${territory.title.toLowerCase()}, criando um ponto de reconhecimento simples e memorável.`,
    logoPrompt: `minimal vector symbol, ${territory.style.toLowerCase()}, clean geometric construction, no text, light background`,
    imagery: `Composição visual que equilibra ${territory.style.toLowerCase()} e áreas de respiro para aplicações digitais e impressas.`,
    voice: territory.voice,
    site: {
      headline: `${input.brand.name}: uma presença que encontra a direção certa.`,
      description: `${input.brand.description} Uma apresentação clara, consistente e pronta para evoluir com a marca.`,
      sections: [{ title: "Início", purpose: "Apresentar a promessa central da marca." }, { title: "Método", purpose: "Explicar como a marca trabalha e gera valor." }, { title: "Soluções", purpose: "Organizar ofertas e diferenciais com clareza." }, { title: "Resultados", purpose: "Demonstrar impacto e credibilidade." }, { title: "Contato", purpose: "Converter interesse em conversa." }],
    },
  }));
}

export async function generateBrandDirections(input: GenerationInput): Promise<BrandDirection[]> {
  if (externalGenerationUnavailable) return createFallbackDirections(input);
  const quizNarrative = getAnswerNarrative(input.answers).join("\n");
  const previousDirections = input.priorDirectionTitles.length > 0
    ? `As direções anteriores foram: ${input.priorDirectionTitles.join(", ")}. Crie propostas inequivocamente diferentes delas.`
    : "Esta é a primeira rodada de direções.";
  const refinementGuidance = input.refinementNote?.trim()
    ? `A pessoa responsável pediu este refinamento para a próxima rodada: "${input.refinementNote.trim()}". Incorpore a intenção do pedido sem repetir literalmente as direções anteriores.`
    : "Não há observação adicional para esta rodada.";
  const { data: models } = await listLLMModels();
  const model = selectModel(models);

  if (!model) {
    throw new Error("Nenhum modelo de IA está disponível para gerar as direções da marca.");
  }

  let response;
  try {
    response = await invokeLLM({
    model,
    messages: [
      {
        role: "system",
        content: "Você é uma diretora criativa brasileira de branding premium, com repertório de estúdios internacionais e cultura visual contemporânea. Crie cinco direções de identidade estratégicas, aplicáveis e visualmente memoráveis. Produza somente dados válidos segundo o esquema solicitado, sem explicar o processo. As cinco direções precisam ser inequivocamente diferentes entre si em conceito, símbolo, composição, tipografia, energia e paleta. Evite clichês de IA, escudos genéricos, monogramas óbvios, círculos decorativos e a mesma geometria repetida. Pelo menos uma rota deve ser radical/experimental e usar cores vívidas; pelo menos uma deve ser minimalista; pelo menos uma deve ser humana/orgânica; pelo menos uma deve ser editorial sofisticada; e pelo menos uma deve explorar uma lógica de símbolo inesperada, porém reproduzível. Não faça apenas variações cosméticas da mesma ideia.",
      },
      {
        role: "user",
        content: `Desenvolva cinco direções de identidade visual para a marca abaixo.\n\nMarca: ${input.brand.name}\nDescrição: ${input.brand.description}\nDiferenciais: ${input.brand.differentials}\n\nRespostas do diagnóstico:\n${quizNarrative}\n\n${previousDirections}\n\n${refinementGuidance}\n\nRegras: escreva tudo em português brasileiro; use nomes de fontes existentes ou alternativas genéricas confiáveis; todas as cores devem estar em HEX; a escala precisa usar px; o conceito de logo deve ser um símbolo conceitual, não uma marca registrada; o logoPrompt deve estar em inglês, especificando um símbolo vetorial minimalista em fundo claro, sem texto, sem letras e sem mockup; a sugestão de site deve conter de quatro a seis seções úteis. Antes de finalizar, compare mentalmente as cinco propostas e rejeite qualquer par que pareça variação da mesma marca. Os cinco logoPrompt devem pedir estruturas visuais diferentes entre si e evitar repetir forma-base, enquadramento e composição.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "brand_directions",
        strict: true,
        schema: directionSchema,
      },
    },
    });
  } catch (error) {
    if (shouldUseFallback(error)) externalGenerationUnavailable = true;
    console.warn("[Brand generation] Structured direction service unavailable; using fallback directions", error);
    return createFallbackDirections(input);
  }

  const content = response.choices[0]?.message.content;
  if (!content || typeof content !== "string") return createFallbackDirections(input);

  try {
    const parsed = JSON.parse(content) as { directions: BrandDirection[] };
    return parsed.directions;
  } catch {
    return createFallbackDirections(input);
  }
}

function safeHex(color: string | undefined, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color ?? "") ? color! : fallback;
}

export function createFallbackLogo(direction: BrandDirection, index = 0) {
  const background = safeHex(direction.palette?.[0]?.hex, "#24251C");
  const signal = safeHex(direction.palette?.[1]?.hex, "#C4B96D");
  const highlight = safeHex(direction.palette?.[2]?.hex, "#F7F4ED");
  const dark = safeHex(direction.palette?.[4]?.hex, "#161616");
  const variants = [
    `<path d="M55 155L120 45l65 110-65 40z" fill="none" stroke="${highlight}" stroke-width="11"/><circle cx="120" cy="120" r="18" fill="${signal}"/>`,
    `<path d="M48 120c30-58 114-58 144 0-30 58-114 58-144 0Z" fill="${signal}"/><path d="M78 120c20-28 64-28 84 0-20 28-64 28-84 0Z" fill="${background}"/><circle cx="120" cy="120" r="13" fill="${highlight}"/>`,
    `<path d="M65 175c0-70 20-110 55-110s55 40 55 110" fill="none" stroke="${highlight}" stroke-width="14" stroke-linecap="round"/><path d="M82 150c22 20 54 20 76 0" fill="none" stroke="${signal}" stroke-width="12" stroke-linecap="round"/>`,
    `<rect x="48" y="48" width="144" height="144" rx="18" fill="${highlight}"/><path d="M78 78h84v28H106v56H78z" fill="${background}"/><circle cx="162" cy="162" r="17" fill="${signal}"/>`,
    `<path d="M42 132c28-5 38-56 68-51 26 4 20 50 48 46 17-2 24-19 40-25" fill="none" stroke="${signal}" stroke-width="18" stroke-linecap="round"/><path d="M54 173 92 48l35 144 31-111 28 92" fill="none" stroke="${highlight}" stroke-width="8" stroke-linejoin="round"/><circle cx="56" cy="69" r="10" fill="${dark}"/>`,
  ];
  const art = variants[index % variants.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="Símbolo conceitual"><rect width="240" height="240" rx="36" fill="${background}"/>${art}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function generateLogoConcepts(directions: BrandDirection[]) {
  if (externalGenerationUnavailable) return directions.map((direction, index) => createFallbackLogo(direction, index));
  return Promise.all(directions.map(async (direction, index) => {
    try {
      const result = await generateImage({
        prompt: `Create a refined conceptual logo symbol for a premium brand. ${direction.logoPrompt} Editorial art direction: ${direction.visualStyle}. Color palette reference: ${direction.palette.map(color => color.hex).join(", ")}. The result must be a single elegant standalone vector-like icon on a calm light background. No words, no letters, no typography, no mockup, no stationery, no 3D rendering.`,
      });
      return result.url;
    } catch (error) {
      if (shouldUseFallback(error)) externalGenerationUnavailable = true;
      console.warn("[Brand generation] Logo concept unavailable", error);
      return createFallbackLogo(direction, index);
    }
  }));
}
