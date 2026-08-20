import { generateImage } from "./_core/imageGeneration";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { getAnswerNarrative } from "../shared/brandQuiz";

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
};

const directionSchema = {
  type: "object",
  properties: {
    directions: {
      type: "array",
      minItems: 4,
      maxItems: 4,
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

export async function generateBrandDirections(input: GenerationInput): Promise<BrandDirection[]> {
  const quizNarrative = getAnswerNarrative(input.answers).join("\n");
  const previousDirections = input.priorDirectionTitles.length > 0
    ? `As direções anteriores foram: ${input.priorDirectionTitles.join(", ")}. Crie propostas inequivocamente diferentes delas.`
    : "Esta é a primeira rodada de direções.";
  const { data: models } = await listLLMModels();
  const model = selectModel(models);

  if (!model) {
    throw new Error("Nenhum modelo de IA está disponível para gerar as direções da marca.");
  }

  const response = await invokeLLM({
    model,
    messages: [
      {
        role: "system",
        content: "Você é uma diretora criativa brasileira de branding premium. Crie direções de identidade estratégicas, aplicáveis e sofisticadas. Produza somente dados válidos segundo o esquema solicitado, sem explicar o processo. Cada direção deve ter personalidade própria, evitar clichês e poder ser aplicada em uma marca real.",
      },
      {
        role: "user",
        content: `Desenvolva quatro direções de identidade visual para a marca abaixo.\n\nMarca: ${input.brand.name}\nDescrição: ${input.brand.description}\nDiferenciais: ${input.brand.differentials}\n\nRespostas do diagnóstico:\n${quizNarrative}\n\n${previousDirections}\n\nRegras: escreva tudo em português brasileiro; use nomes de fontes existentes ou alternativas genéricas confiáveis; todas as cores devem estar em HEX; a escala precisa usar px; o conceito de logo deve ser um símbolo conceitual, não uma marca registrada; o logoPrompt deve estar em inglês, especificando um símbolo vetorial minimalista em fundo claro, sem texto, sem letras e sem mockup; a sugestão de site deve conter de quatro a seis seções úteis.`,
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

  const content = response.choices[0]?.message.content;
  if (!content || typeof content !== "string") {
    throw new Error("A geração de direções não retornou conteúdo utilizável.");
  }

  const parsed = JSON.parse(content) as { directions: BrandDirection[] };
  return parsed.directions;
}

export async function generateLogoConcepts(directions: BrandDirection[]) {
  return Promise.all(directions.map(async direction => {
    try {
      const result = await generateImage({
        prompt: `Create a refined conceptual logo symbol for a premium brand. ${direction.logoPrompt} Editorial art direction: ${direction.visualStyle}. Color palette reference: ${direction.palette.map(color => color.hex).join(", ")}. The result must be a single elegant standalone vector-like icon on a calm light background. No words, no letters, no typography, no mockup, no stationery, no 3D rendering.`,
      });
      return result.url;
    } catch (error) {
      console.warn("[Brand generation] Logo concept unavailable", error);
      return null;
    }
  }));
}
