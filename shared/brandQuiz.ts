export type QuizOption = {
  id: "A" | "B" | "C" | "D" | "E";
  label: string;
  detail: string;
};

export type QuizQuestion = {
  id: string;
  category: string;
  prompt: string;
  helper: string;
  options: QuizOption[];
};

export const BRAND_QUIZ: QuizQuestion[] = [
  {
    id: "personalidade",
    category: "Essência",
    prompt: "Se a sua marca entrasse em uma sala, como você gostaria que ela fosse percebida?",
    helper: "Escolha a presença que deve orientar a identidade como um todo.",
    options: [
      { id: "A", label: "Sofisticada", detail: "Discreta, segura e atemporal." },
      { id: "B", label: "Contemporânea", detail: "Atual, limpa e inteligente." },
      { id: "C", label: "Ousada", detail: "Expressiva, marcante e confiante." },
      { id: "D", label: "Acolhedora", detail: "Humana, próxima e inspiradora." },
      { id: "E", label: "Visionária", detail: "Inovadora, curiosa e fora do óbvio." },
    ],
  },
  {
    id: "posicionamento",
    category: "Posicionamento",
    prompt: "Qual promessa deve ficar mais clara quando alguém encontra a sua marca?",
    helper: "Priorize a percepção que mais ajuda a marca a ser escolhida.",
    options: [
      { id: "A", label: "Excelência", detail: "Qualidade, cuidado e alto padrão." },
      { id: "B", label: "Praticidade", detail: "Clareza, agilidade e facilidade." },
      { id: "C", label: "Exclusividade", detail: "Seleção, raridade e desejo." },
      { id: "D", label: "Transformação", detail: "Evolução, resultado e impacto." },
      { id: "E", label: "Pertencimento", detail: "Comunidade, proximidade e propósito." },
    ],
  },
  {
    id: "publico",
    category: "Público",
    prompt: "Como o público ideal costuma tomar decisões?",
    helper: "Considere o comportamento, e não apenas idade ou localização.",
    options: [
      { id: "A", label: "Racional", detail: "Compara, pesquisa e valoriza critérios." },
      { id: "B", label: "Aspiracional", detail: "Busca elevar sua imagem e repertório." },
      { id: "C", label: "Sensível", detail: "Valoriza conexão, afeto e confiança." },
      { id: "D", label: "Pioneiro", detail: "Adota novidades e prefere diferenciação." },
      { id: "E", label: "Pragmático", detail: "Quer resolver rápido, sem complexidade." },
    ],
  },
  {
    id: "linguagem_visual",
    category: "Estética",
    prompt: "Qual universo visual mais combina com o futuro da marca?",
    helper: "A resposta orienta forma, composição e grau de minimalismo.",
    options: [
      { id: "A", label: "Editorial", detail: "Refinado, cultural e com respiro." },
      { id: "B", label: "Minimalista", detail: "Essencial, preciso e funcional." },
      { id: "C", label: "Orgânico", detail: "Textural, natural e sensorial." },
      { id: "D", label: "Geométrico", detail: "Estruturado, claro e memorável." },
      { id: "E", label: "Experimental", detail: "Autoral, inesperado e expressivo." },
    ],
  },
  {
    id: "cor",
    category: "Cor",
    prompt: "Qual clima cromático deve liderar a percepção da marca?",
    helper: "Não se trata da cor final, mas da sensação desejada.",
    options: [
      { id: "A", label: "Neutro precioso", detail: "Off-white, grafite e metalizados sutis." },
      { id: "B", label: "Profundo", detail: "Tons densos, elegantes e contrastados." },
      { id: "C", label: "Solar", detail: "Vibrante, otimista e energizante." },
      { id: "D", label: "Natural", detail: "Terroso, mineral e sereno." },
      { id: "E", label: "Digital", detail: "Elétrico, futurista e de alto impacto." },
    ],
  },
  {
    id: "tipografia",
    category: "Tipografia",
    prompt: "Como a voz escrita da marca deve soar?",
    helper: "Pense no equilíbrio entre autoridade, personalidade e legibilidade.",
    options: [
      { id: "A", label: "Clássica", detail: "Serifada, culta e sofisticada." },
      { id: "B", label: "Precisa", detail: "Sans serif, limpa e contemporânea." },
      { id: "C", label: "Expressiva", detail: "Cheia de caráter e assinatura visual." },
      { id: "D", label: "Humana", detail: "Calorosa, fluida e acessível." },
      { id: "E", label: "Técnica", detail: "Racional, modular e digital." },
    ],
  },
  {
    id: "simbolo",
    category: "Logotipo",
    prompt: "Que papel um símbolo deve ter no logotipo da marca?",
    helper: "Isso define se a marca deve ser mais verbal, icônica ou abstrata.",
    options: [
      { id: "A", label: "Monograma", detail: "Iniciais como assinatura reconhecível." },
      { id: "B", label: "Ícone essencial", detail: "Símbolo simples com leitura imediata." },
      { id: "C", label: "Abstração", detail: "Forma autoral que sugere uma ideia." },
      { id: "D", label: "Wordmark", detail: "Nome como protagonista absoluto." },
      { id: "E", label: "Sistema flexível", detail: "Marca que muda sem perder coerência." },
    ],
  },
  {
    id: "diferenciacao",
    category: "Expressão",
    prompt: "Qual contraste melhor traduz o diferencial da sua marca?",
    helper: "Escolha a tensão criativa que deve guiar a direção visual.",
    options: [
      { id: "A", label: "Tradição + inovação", detail: "Legado com uma leitura atual." },
      { id: "B", label: "Luxo + simplicidade", detail: "Alto padrão sem excesso." },
      { id: "C", label: "Tecnologia + humanidade", detail: "Precisão com proximidade." },
      { id: "D", label: "Arte + estratégia", detail: "Originalidade com intencionalidade." },
      { id: "E", label: "Impacto + leveza", detail: "Presença forte, mas descomplicada." },
    ],
  },
  {
    id: "experiencia_digital",
    category: "Site",
    prompt: "Qual sensação o site da marca precisa deixar na primeira visita?",
    helper: "A resposta vai orientar o ritmo da sugestão digital.",
    options: [
      { id: "A", label: "Imersão", detail: "Narrativa visual e descoberta gradual." },
      { id: "B", label: "Confiança", detail: "Clareza, prova e decisão segura." },
      { id: "C", label: "Desejo", detail: "Atmosfera, curadoria e conversão suave." },
      { id: "D", label: "Agilidade", detail: "Direto ao ponto, funcional e objetivo." },
      { id: "E", label: "Inspiração", detail: "Repertório, ideias e visão de futuro." },
    ],
  },
  {
    id: "nao_negociavel",
    category: "Direção",
    prompt: "O que a marca jamais pode parecer?",
    helper: "Use esta resposta como filtro para evitar uma identidade fora de contexto.",
    options: [
      { id: "A", label: "Genérica", detail: "Sem personalidade ou distinção." },
      { id: "B", label: "Fria", detail: "Distante, rígida ou impessoal." },
      { id: "C", label: "Exagerada", detail: "Barulhenta, confusa ou excessiva." },
      { id: "D", label: "Conservadora", detail: "Previsível, datada ou pouco ambiciosa." },
      { id: "E", label: "Complexa", detail: "Difícil de entender ou de aplicar." },
    ],
  },
];

export const BRAND_QUIZ_TOTAL = BRAND_QUIZ.length;

export function getAnswerNarrative(answers: Record<string, string>) {
  return BRAND_QUIZ.map(question => {
    const selected = question.options.find(option => option.id === answers[question.id]);
    return selected ? `${question.category}: ${selected.label} — ${selected.detail}` : null;
  }).filter((value): value is string => Boolean(value));
}
