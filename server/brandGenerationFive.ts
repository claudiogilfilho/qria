import { createFallbackDirections, generateBrandDirections, generateLogoConcepts, type BrandDirection } from "./brandGeneration";

type GenerationInput = Parameters<typeof generateBrandDirections>[0];

function signature(direction: BrandDirection) {
  return `${direction.title}|${direction.visualStyle}|${direction.palette?.map(c => c.hex).join("-")}`.toLowerCase();
}

function isLegacyFallback(directions: BrandDirection[]) {
  const titles = directions.map(direction => direction.title.toLowerCase()).join(" ");
  return titles.includes("rota essencial") && titles.includes("pulso preciso") && titles.includes("matéria humana") && titles.includes("campo editorial");
}

function vividDirection(input: GenerationInput): BrandDirection {
  return {
    title: "Choque Vivo",
    essence: `${input.brand.name} assume uma presença de alta energia, inesperada e memorável, sem cair no visual genérico de tecnologia.`,
    visualStyle: "Experimental pop de alto contraste",
    palette: [
      { name: "Violeta vivo", hex: "#7C3CFF", use: "Base expressiva" },
      { name: "Coral neon", hex: "#FF5A5F", use: "Acento emocional" },
      { name: "Ciano elétrico", hex: "#00D8FF", use: "Contraponto" },
      { name: "Amarelo ácido", hex: "#F5FF3B", use: "Sinal de atenção" },
      { name: "Preto", hex: "#121212", use: "Estrutura e texto" },
    ],
    typography: { display: "Space Grotesk", body: "Inter", scale: { h1: "72px", h2: "44px", body: "17px", label: "12px" } },
    logoConcept: "Um gesto visual quebrado em tensão com uma linha contínua, criando um símbolo que parece estar em movimento e não se confunde com monogramas ou ícones corporativos comuns.",
    logoPrompt: "bold experimental vector symbol, broken gesture intersecting a continuous line, asymmetric composition, vivid violet coral cyan acid yellow palette, editorial contemporary branding, no text, no letters, no mockup, flat vector",
    imagery: "Recortes, macroformas, contraste cromático e composições assimétricas com muito espaço negativo.",
    voice: "Provocadora, inteligente, energética e curta.",
    site: {
      headline: `${input.brand.name} não nasceu para parecer com todo mundo.`,
      description: `${input.brand.description} Uma presença digital de contraste alto, ritmo rápido e identidade reconhecível em poucos segundos.`,
      sections: [
        { title: "Manifesto", purpose: "Abrir com uma posição clara e memorável." },
        { title: "O que fazemos", purpose: "Traduzir a oferta em linguagem simples." },
        { title: "Provas", purpose: "Mostrar resultados e credibilidade." },
        { title: "Como pensamos", purpose: "Explicar método e diferenciais." },
        { title: "Contato", purpose: "Converter interesse em conversa." },
      ],
    },
  };
}

function legacyFallbackFive(input: GenerationInput) {
  const base = createFallbackDirections(input);
  return [...base, vividDirection(input)];
}

export async function generateBrandDirectionsFive(input: GenerationInput): Promise<BrandDirection[]> {
  const first = await generateBrandDirections(input);
  if (isLegacyFallback(first)) return legacyFallbackFive(input);

  const second = await generateBrandDirections({
    ...input,
    priorDirectionTitles: [...input.priorDirectionTitles, ...first.map(direction => direction.title)],
    refinementNote: [
      input.refinementNote,
      "A nova exploração deve mudar radicalmente símbolo, estrutura, energia, composição e paleta; inclua pelo menos uma rota ousada com cores vívidas e evite qualquer variação cosmética das anteriores.",
    ].filter(Boolean).join(" "),
  });

  const pool = [...first, ...second];
  const chosen: BrandDirection[] = [];
  const seen = new Set<string>();
  for (const direction of pool) {
    const key = signature(direction);
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(direction);
    if (chosen.length === 5) break;
  }
  while (chosen.length < 5) chosen.push(vividDirection(input));
  return chosen.slice(0, 5);
}

function customSvg(direction: BrandDirection, index: number) {
  const colors = direction.palette?.map(color => color.hex) ?? [];
  const bg = colors[0] ?? "#24251C";
  const a = colors[1] ?? "#F7F4ED";
  const b = colors[2] ?? "#C4B96D";
  const c = colors[3] ?? "#FFFFFF";
  const shapes = [
    `<path d="M52 166 120 42l68 124-68 32Z" fill="none" stroke="${a}" stroke-width="12"/><circle cx="120" cy="121" r="19" fill="${b}"/>`,
    `<path d="M42 120c35-64 121-64 156 0-35 64-121 64-156 0Z" fill="${a}"/><path d="M78 120c19-30 65-30 84 0-19 30-65 30-84 0Z" fill="${bg}"/><circle cx="120" cy="120" r="14" fill="${b}"/>`,
    `<path d="M62 178c0-72 22-116 58-116s58 44 58 116" fill="none" stroke="${c}" stroke-width="15" stroke-linecap="round"/><path d="M82 148c24 24 52 24 76 0" fill="none" stroke="${b}" stroke-width="12" stroke-linecap="round"/>`,
    `<rect x="48" y="48" width="144" height="144" rx="20" fill="${a}"/><path d="M76 78h88v28h-58v58H76Z" fill="${bg}"/><circle cx="163" cy="163" r="18" fill="${b}"/>`,
    `<path d="M38 135c27-10 42-59 70-51 27 8 20 53 48 47 18-4 24-22 46-28" fill="none" stroke="${a}" stroke-width="19" stroke-linecap="round"/><path d="M50 181 91 47l35 146 31-113 31 101" fill="none" stroke="${b}" stroke-width="8" stroke-linejoin="round"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" rx="36" fill="${bg}"/>${shapes[index % shapes.length]}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function generateLogoConceptsFive(directions: BrandDirection[]) {
  const urls = await generateLogoConcepts(directions);
  return urls.map((url, index) => url?.startsWith("data:image/svg+xml") ? customSvg(directions[index], index) : url);
}
