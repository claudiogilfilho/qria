# Validação de desenvolvimento

Em 20 de agosto de 2026, a instância ativa do aplicativo respondeu normalmente em uma porta alternativa de desenvolvimento e apresentou a tela de acesso com a interface em português.

O fluxo autenticado não pôde ser percorrido no navegador de validação porque o provedor de autenticação devolveu uma resposta 403 para a URL temporária da porta alternativa. Além disso, a prévia gerenciada continuou apontando para uma porta anterior que mantinha conexões abertas sem responder. A compilação TypeScript e a suíte Vitest foram executadas com sucesso; a validação visual autenticada precisa ser repetida quando a prévia estiver estabilizada na porta gerenciada.

Com uma exceção de desenvolvimento para a camada de layout, a página inicial interna foi aberta e verificada visualmente em desktop: a composição assimétrica, o painel escuro e o sistema tipográfico foram renderizados. Ao navegar pelo item lateral “Nova marca”, o navegador foi redirecionado novamente ao provedor de autenticação e recebeu 403, impedindo a inspeção das etapas seguintes na porta temporária. A experiência publicada permanece protegida por autenticação.

A rota `/nova-marca` foi então aberta diretamente e verificada visualmente: o formulário apresentou os três campos, a hierarquia do processo e o layout de duas colunas esperados. O retorno pelo item lateral “Acervo” funcionou e restaurou a tela inicial; portanto, as rotas internas renderizam corretamente na instância ativa. A tentativa inicial pelo item “Nova marca” foi afetada pelo estado de autenticação em trânsito no navegador, não por falha de renderização da rota.

Após a renomeação, a instância ativa carregou com o título “QRIA — Ateliê de Identidade” e a navegação lateral exibiu “QRIA”. A primeira captura ocorreu antes da pintura completa; uma segunda visualização confirmou que a composição da tela inicial foi renderizada normalmente.

Após o reinício de 20 de agosto de 2026, a URL oficial da prévia voltou a responder na porta gerenciada e exibiu a interface autenticada. Capturas em desktop e na largura de 375 px confirmaram a renderização responsiva da tela inicial e do formulário de criação.

Com o bypass visual removido, novas capturas na URL oficial confirmaram a sessão autenticada, a navegação interna e os layouts desktop e móvel. A instância antiga que respondia na porta 3004 foi encerrada; uma checagem posterior confirmou apenas a porta oficial 3000 ativa e respondendo com HTTP 200.

O diagnóstico de geração identificou que o driver do banco retornava o resultado de inserção em uma tupla, enquanto o QRIA esperava o cabeçalho diretamente. Isso retornava `brandId = 0`, criava a sessão com `brandId = 0` e interrompia o workspace antes do quiz e da geração. A extração do identificador foi corrigida e a sessão QRIA existente foi reparada. A validação real executou duas rodadas estruturadas de IA e confirmou quatro de quatro conceitos visuais disponíveis; o teste integrado também cobre criação, quiz, geração, rejeição, regeneração e escolha final.

Uma validação ponta a ponta com persistência real foi executada em 20 de agosto de 2026. Ela criou uma marca temporária, salvou todas as respostas do quiz, persistiu quatro direções e quatro conceitos visuais, rejeitou a primeira rodada pela opção E, criou uma segunda rodada, selecionou uma direção final e confirmou seu estado no banco. Os dados temporários foram removidos ao término. A suíte final passou com 14 testes em 7 arquivos, além da checagem de tipos.

Uma segunda execução independente da validação ponta a ponta repetiu o fluxo completo e terminou com sucesso. A verificação da sessão sem login confirmou que a interface requisita apenas `auth.me`; a consulta protegida ao acervo não é mais disparada antes da autenticação.

Uma terceira validação passou pela camada tRPC real e registrou a criação de marca e sessão com identificadores positivos, o quiz completo, quatro direções com quatro conceitos visuais, a rejeição pela opção E, uma nova rodada de quatro direções, a escolha final e a remoção dos dados temporários. O log isolado da execução não registrou falha do fluxo.

Como o usuário preferiu não conectar a sessão pessoal do navegador, a validação final foi concluída sem esse acesso. A checagem de tipos e os 14 testes automatizados passaram; a prévia oficial respondeu com HTTP 200; e o fluxo tRPC autenticado real concluiu criação, quiz, geração, regeneração e escolha final sem dados temporários remanescentes.
