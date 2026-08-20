# Validação de desenvolvimento

Em 20 de agosto de 2026, a instância ativa do aplicativo respondeu normalmente em uma porta alternativa de desenvolvimento e apresentou a tela de acesso com a interface em português.

O fluxo autenticado não pôde ser percorrido no navegador de validação porque o provedor de autenticação devolveu uma resposta 403 para a URL temporária da porta alternativa. Além disso, a prévia gerenciada continuou apontando para uma porta anterior que mantinha conexões abertas sem responder. A compilação TypeScript e a suíte Vitest foram executadas com sucesso; a validação visual autenticada precisa ser repetida quando a prévia estiver estabilizada na porta gerenciada.

Com uma exceção de desenvolvimento para a camada de layout, a página inicial interna foi aberta e verificada visualmente em desktop: a composição assimétrica, o painel escuro e o sistema tipográfico foram renderizados. Ao navegar pelo item lateral “Nova marca”, o navegador foi redirecionado novamente ao provedor de autenticação e recebeu 403, impedindo a inspeção das etapas seguintes na porta temporária. A experiência publicada permanece protegida por autenticação.

A rota `/nova-marca` foi então aberta diretamente e verificada visualmente: o formulário apresentou os três campos, a hierarquia do processo e o layout de duas colunas esperados. O retorno pelo item lateral “Acervo” funcionou e restaurou a tela inicial; portanto, as rotas internas renderizam corretamente na instância ativa. A tentativa inicial pelo item “Nova marca” foi afetada pelo estado de autenticação em trânsito no navegador, não por falha de renderização da rota.
