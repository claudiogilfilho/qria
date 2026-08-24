import fs from 'node:fs';

function edit(path, transform) {
  const original = fs.readFileSync(path, 'utf8');
  const next = transform(original);
  if (next === original) throw new Error(`No changes applied to ${path}`);
  fs.writeFileSync(path, next);
}

edit('client/src/pages/BrandWorkspace.tsx', source => source
  .replace('toast.success("Vamos criar quatro novas direções a partir da sua observação.");', 'toast.success("Vamos criar cinco novas direções realmente diferentes a partir da sua observação.");')
  .replace('activeDirections.length === 4', 'activeDirections.length === 5')
  .replace('Vamos criar quatro territórios de identidade', 'Vamos criar cinco territórios de identidade')
  .replace('Gerar quatro direções', 'Gerar cinco direções')
  .replace('Escolha A, B, C ou D. Se nenhuma fizer sentido, selecione E e nós abriremos quatro novas possibilidades.', 'Escolha A, B, C, D ou E. Se nenhuma fizer sentido, gere uma nova rodada com cinco rotas deliberadamente diferentes das anteriores.')
  .replace('<span className="grid h-9 w-9 place-items-center rounded-full bg-stone-200 text-xs font-semibold text-ink">E</span>', '<span className="grid h-9 w-9 place-items-center rounded-full bg-stone-200 text-xs font-semibold text-ink"><RefreshCw className="h-4 w-4" /></span>')
  .replace('<RefreshCw className="mr-2 h-4 w-4" /> Gerar novas', '<RefreshCw className="mr-2 h-4 w-4" /> Não gostei de nenhuma — gerar outras 5')
);

edit('server/db.ts', source => source
  .replace('const optionKeys = ["A", "B", "C", "D"];', 'const optionKeys = ["A", "B", "C", "D", "E"];')
  .replace('optionKey: optionKeys[index] ?? "D",', 'optionKey: optionKeys[index] ?? "E",')
);

edit('server/brandGeneration.ts', source => {
  let next = source;
  next = next.replace('minItems: 4,\n      maxItems: 4,', 'minItems: 5,\n      maxItems: 5,');
  next = next.replace('const round = Math.floor(input.priorDirectionTitles.length / 4) + 1;', 'const round = Math.floor(input.priorDirectionTitles.length / 5) + 1;');
  next = next.replace(
`    { title: "Campo Editorial", style: "Elegância cultural", palette: [["Vinho", "#54222D", "Base editorial"], ["Rosa mineral", "#E9BEC6", "Acento"], ["Grafite", "#252329", "Texto"], ["Papel", "#FAF8F4", "Contraste"]], voice: "Culta, marcante e intencional." },\n  ];`,
`    { title: "Campo Editorial", style: "Elegância cultural", palette: [["Vinho", "#54222D", "Base editorial"], ["Rosa mineral", "#E9BEC6", "Acento"], ["Grafite", "#252329", "Texto"], ["Papel", "#FAF8F4", "Contraste"]], voice: "Culta, marcante e intencional." },\n    { title: "Choque Vivo", style: "Experimental pop", palette: [["Violeta vivo", "#7C3CFF", "Base de alto impacto"], ["Coral neon", "#FF5A5F", "Acento emocional"], ["Ciano elétrico", "#00D8FF", "Contraponto"], ["Amarelo ácido", "#F5FF3B", "Sinal"], ["Preto", "#121212", "Texto e estrutura"]], voice: "Provocadora, energética e impossível de confundir." },\n  ];`);
  next = next.replace('Desenvolva quatro direções de identidade visual para a marca abaixo.', 'Desenvolva cinco direções de identidade visual para a marca abaixo.');
  next = next.replace(
'Você é uma diretora criativa brasileira de branding premium. Crie direções de identidade estratégicas, aplicáveis e sofisticadas. Produza somente dados válidos segundo o esquema solicitado, sem explicar o processo. Cada direção deve ter personalidade própria, evitar clichês e poder ser aplicada em uma marca real.',
'Você é uma diretora criativa brasileira de branding premium, com repertório de estúdios internacionais e cultura visual contemporânea. Crie cinco direções de identidade estratégicas, aplicáveis e visualmente memoráveis. Produza somente dados válidos segundo o esquema solicitado, sem explicar o processo. As cinco direções precisam ser inequivocamente diferentes entre si em conceito, símbolo, composição, tipografia, energia e paleta. Evite clichês de IA, escudos genéricos, monogramas óbvios, círculos decorativos e a mesma geometria repetida. Pelo menos uma rota deve ser radical/experimental e usar cores vívidas; pelo menos uma deve ser minimalista; pelo menos uma deve ser humana/orgânica; pelo menos uma deve ser editorial sofisticada; e pelo menos uma deve explorar uma lógica de símbolo inesperada, porém reproduzível. Não faça apenas variações cosméticas da mesma ideia.'
  );
  next = next.replace(
'a sugestão de site deve conter de quatro a seis seções úteis.',
'a sugestão de site deve conter de quatro a seis seções úteis. Antes de finalizar, compare mentalmente as cinco propostas e rejeite qualquer par que pareça variação da mesma marca. Os cinco logoPrompt devem pedir estruturas visuais diferentes entre si e evitar repetir forma-base, enquadramento e composição.'
  );

  const start = next.indexOf('export function createFallbackLogo');
  const end = next.indexOf('\nexport async function generateLogoConcepts', start);
  if (start < 0 || end < 0) throw new Error('Could not locate createFallbackLogo');
  const replacement = `export function createFallbackLogo(direction: BrandDirection, index = 0) {\n  const background = safeHex(direction.palette?.[0]?.hex, \"#24251C\");\n  const signal = safeHex(direction.palette?.[1]?.hex, \"#C4B96D\");\n  const highlight = safeHex(direction.palette?.[2]?.hex, \"#F7F4ED\");\n  const dark = safeHex(direction.palette?.[4]?.hex, \"#161616\");\n  const variants = [\n    \`<path d=\"M55 155L120 45l65 110-65 40z\" fill=\"none\" stroke=\"\${highlight}\" stroke-width=\"11\"/><circle cx=\"120\" cy=\"120\" r=\"18\" fill=\"\${signal}\"/>\`,\n    \`<path d=\"M48 120c30-58 114-58 144 0-30 58-114 58-144 0Z\" fill=\"\${signal}\"/><path d=\"M78 120c20-28 64-28 84 0-20 28-64 28-84 0Z\" fill=\"\${background}\"/><circle cx=\"120\" cy=\"120\" r=\"13\" fill=\"\${highlight}\"/>\`,\n    \`<path d=\"M65 175c0-70 20-110 55-110s55 40 55 110\" fill=\"none\" stroke=\"\${highlight}\" stroke-width=\"14\" stroke-linecap=\"round\"/><path d=\"M82 150c22 20 54 20 76 0\" fill=\"none\" stroke=\"\${signal}\" stroke-width=\"12\" stroke-linecap=\"round\"/>\`,\n    \`<rect x=\"48\" y=\"48\" width=\"144\" height=\"144\" rx=\"18\" fill=\"\${highlight}\"/><path d=\"M78 78h84v28H106v56H78z\" fill=\"\${background}\"/><circle cx=\"162\" cy=\"162\" r=\"17\" fill=\"\${signal}\"/>\`,\n    \`<path d=\"M42 132c28-5 38-56 68-51 26 4 20 50 48 46 17-2 24-19 40-25\" fill=\"none\" stroke=\"\${signal}\" stroke-width=\"18\" stroke-linecap=\"round\"/><path d=\"M54 173 92 48l35 144 31-111 28 92\" fill=\"none\" stroke=\"\${highlight}\" stroke-width=\"8\" stroke-linejoin=\"round\"/><circle cx=\"56\" cy=\"69\" r=\"10\" fill=\"\${dark}\"/>\`,\n  ];\n  const art = variants[index % variants.length];\n  const svg = \`<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 240 240\" role=\"img\" aria-label=\"Símbolo conceitual\"><rect width=\"240\" height=\"240\" rx=\"36\" fill=\"\${background}\"/>\${art}</svg>\`;\n  return \`data:image/svg+xml;charset=UTF-8,\${encodeURIComponent(svg)}\`;\n}\n`;
  next = next.slice(0, start) + replacement + next.slice(end);
  return next;
});

for (const path of ['server/brandGeneration.test.ts', 'server/brandRegeneration.test.ts', 'server/brandFlow.integration.test.ts']) {
  if (!fs.existsSync(path)) continue;
  const source = fs.readFileSync(path, 'utf8');
  const next = source
    .replaceAll('toHaveLength(4)', 'toHaveLength(5)')
    .replaceAll('["A", "B", "C", "D"]', '["A", "B", "C", "D", "E"]')
    .replaceAll('Array.from({ length: 4 }', 'Array.from({ length: 5 }');
  if (next !== source) fs.writeFileSync(path, next);
}
