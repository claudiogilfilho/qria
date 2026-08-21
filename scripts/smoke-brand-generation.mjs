import { generateBrandDirections, generateLogoConcepts } from "../server/brandGeneration.ts";

const input = {
  brand: {
    name: "QRIA",
    description: "Plataforma que transforma um diagnóstico guiado em direções de identidade visual e uma sugestão de site para pequenas empresas.",
    differentials: "Combina estratégia de marca, quiz de posicionamento, direções comparáveis e refinamento iterativo em uma experiência sofisticada.",
  },
  answers: {
    personalidade: "E",
    posicionamento: "D",
    publico: "D",
    linguagem_visual: "D",
    cor: "E",
    tipografia: "B",
    simbolo: "C",
    diferenciacao: "C",
    experiencia_digital: "E",
    nao_negociavel: "A",
  },
  priorDirectionTitles: [],
};

function assertDirections(directions, label) {
  if (!Array.isArray(directions) || directions.length !== 4) {
    throw new Error(`${label}: esperado conjunto de quatro direções.`);
  }

  for (const direction of directions) {
    if (!direction.title || direction.palette.length < 4 || direction.site.sections.length < 4) {
      throw new Error(`${label}: direção incompleta recebida da geração.`);
    }
  }
}

async function run() {
  console.log("[smoke] rodada 1: gerando quatro direções estruturadas");
  const firstRound = await generateBrandDirections(input);
  assertDirections(firstRound, "rodada 1");
  console.log("[smoke] rodada 1 aprovada:", firstRound.map(direction => direction.title).join(" | "));

  console.log("[smoke] rodada 2: verificando uma alternativa distinta");
  const secondRound = await generateBrandDirections({
    ...input,
    priorDirectionTitles: firstRound.map(direction => direction.title),
  });
  assertDirections(secondRound, "rodada 2");
  console.log("[smoke] rodada 2 aprovada:", secondRound.map(direction => direction.title).join(" | "));

  console.log("[smoke] gerando quatro conceitos visuais para a primeira rodada");
  const logoUrls = await generateLogoConcepts(firstRound);
  const availableLogos = logoUrls.filter(Boolean).length;
  if (availableLogos !== 4) {
    throw new Error(`[smoke] geração visual incompleta: ${availableLogos}/4 conceitos disponíveis.`);
  }
  console.log("[smoke] geração visual aprovada: 4/4 conceitos disponíveis");
}

run().catch(error => {
  console.error("[smoke] falha na geração de identidade:", error);
  process.exitCode = 1;
});
