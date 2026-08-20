# Project TODO

- [x] Modelar as entidades persistentes para marcas, sessões de quiz, respostas, rodadas de direções visuais e resultados escolhidos.
- [x] Criar procedimentos seguros para iniciar sessões, registrar respostas, gerar direções, selecionar uma direção, rejeitar uma rodada e consultar o histórico.
- [x] Integrar a geração estruturada por IA no servidor para produzir quatro propostas coerentes de identidade visual por rodada.
- [x] Implementar a rejeição explícita da rodada atual ao usar a opção E, marcando as quatro direções anteriores como rejeitadas e preservando esse estado no histórico.
- [x] Corrigir o fluxo de rejeição e regeneração para que uma falha de IA restaure uma sessão recuperável sem comprometer o histórico.
- [x] Adicionar testes Vitest para a rejeição de rodada e a recuperação após falha de geração.
- [x] Construir o formulário inicial com nome, descrição e diferenciais da marca, incluindo validação e retomada de sessão.
- [x] Construir quiz guiado com perguntas A–E sobre personalidade, posicionamento, público, estilo visual, cor, tipografia e expressão de marca.
- [x] Implementar a tela de quatro direções de identidade visual com escolha A–D e rejeição total pela opção E, sem limite de novas rodadas.
- [x] Exibir o brand book resumido da direção escolhida com logotipo conceitual, paleta, tipografia, escala tipográfica e diretrizes visuais.
- [x] Gerar uma sugestão simples de site alinhada à identidade escolhida, com seções, mensagens, cores e tipografia aplicadas.
- [x] Projetar a experiência visual com linguagem sofisticada, hierarquia clara, microinterações discretas, responsividade e acessibilidade.
- [x] Aplicar explicitamente as fontes de destaque e texto da direção escolhida na prévia da sugestão de site.
- [ ] Validar e corrigir a experiência visual real em desktop e mobile, incluindo os estados autenticados e responsivos da interface.
- [x] Criar testes Vitest para regras de quiz, validação dos dados e fluxos críticos do servidor.
- [x] Adicionar testes Vitest para validação dos procedimentos de início de marca e registro de respostas inválidas.
- [x] Adicionar testes Vitest para criação de marca e sessão, seleção final da direção e leitura do workspace persistido.
- [ ] Validar a experiência ponta a ponta no navegador, corrigir eventuais falhas e salvar uma versão de entrega do MVP.
