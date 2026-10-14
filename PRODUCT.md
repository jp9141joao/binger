# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Aplicativo de desktop instalável: Electron + Vite + React, com interface em Tailwind CSS + shadcn/ui. Confirmado pelo usuário em 2026-10-05.

A plataforma fica registrada como `web` porque a interface é feita com tecnologia web dentro do Electron; não há interface nativa de sistema operacional.

Escolhas do agente, não perguntadas ao usuário: TypeScript e o preset padrão do CLI do shadcn (primitivos Base UI, estilo Nova, cor base neutra). O visual desse preset é só ponto de partida; o tema continua em aberto (ver Capabilities and Constraints).

## Users

Usuário principal: o próprio autor do projeto. Ele guarda filmes e séries como arquivos de vídeo no computador e quer assistir a esse acervo offline, com o conforto de um serviço de streaming.

Ele quer que seja um programa de verdade, que possa ficar em tela cheia.

Nenhum outro público foi confirmado. O autor descreveu o uso em termos de "a pessoa", então outras pessoas com acervo próprio são um público possível, não um requisito.

## Product Purpose

O Binger transforma os vídeos que a pessoa já tem no computador em um catálogo com cara de streaming, que funciona offline. A pessoa adiciona seus vídeos e assiste; quando um vídeo termina, o próximo da mesma pasta entra em sequência, com contagem regressiva, como o "próximo episódio" dos serviços de streaming.

Existe para dar ao acervo local o conforto de um streaming, sem depender de internet.

Critério de sucesso: não definido pelo usuário. Hipótese a confirmar: assistir uma pasta inteira (por exemplo, uma temporada) em sequência, sem voltar ao gerenciador de arquivos para escolher o próximo vídeo.

## Positioning

Streaming sem serviço online: tudo roda sobre os arquivos que já estão no computador da pessoa, e a própria pasta define a sequência (o próximo vídeo é o próximo arquivo da mesma pasta).

O usuário não comparou o Binger com outros produtos; não há alegação competitiva confirmada.

## Operating Context

- Programa de desktop no computador do próprio usuário. A máquina de desenvolvimento é Windows 11.
- Uso offline.
- Material de trabalho: os arquivos de vídeo e as pastas do usuário, e arquivos de legenda. As pastas organizam a sequência.
- Rituais: jogar vídeos do computador para dentro do app; assistir a vários vídeos da mesma pasta em sequência; assistir em tela cheia.
- O PC fica ligado na TV: o usuário assiste de longe, do sofá, e navega pelas setas do teclado ou por um controle. Confirmado pelo usuário em 2026-10-05. Tudo na tela é dimensionado para essa distância.

## Capabilities and Constraints

Funcionalidades confirmadas:

- Catálogo, no estilo streaming, dos vídeos locais da pessoa.
- Adicionar vídeos a partir do computador.
- Reprodução de vídeo, com tela cheia.
- Sequência automática: ao terminar um vídeo, o próximo vídeo da mesma pasta começa após uma contagem regressiva. Numa série é o próximo episódio; depois de um filme solto, o próximo filme solto da mesma pasta. Uma série não emenda em outra coisa.
- Aviso "Você ainda está assistindo?".
- Preferências que ficam salvas (pedido em 2026-10-08): ligar ou desligar a legenda no player vale também para os próximos vídeos; "Pular intro" é por série, com início e fim marcados pelo usuário (tecla I no player), e pula a abertura de todos os episódios uma vez por vídeo; marcar como visto funciona episódio por episódio (tecla V na lista, ou clique na marca da linha), além de "Marcar todos".
- Legendas, pedidas em 2026-10-06 nesta ordem: usar a legenda do próprio vídeo (arquivo ao lado ou faixa embutida); se não houver, escrever uma fiel ao áudio, por reconhecimento de fala no próprio computador. Com estilos à escolha (Clássica, Amarela, Caixa, Sombra) e três tamanhos.
- Catálogos: séries montadas à mão, porque uma pasta pode misturar vídeos de várias séries. O app também separa sozinho as séries de uma pasta pelo nome dos arquivos.
- Funcionamento offline.

Terminologia usada pelo usuário: "próximo episódio" ("próximo ep"), "você ainda está assistindo?".

Restrições:

- Projeto pessoal ou de portfólio, sem empresa por trás.
- Nota técnica do agente, não decisão do usuário: o player embutido do Electron toca o que o Chromium decodifica. Formatos fora disso (por exemplo áudio AC3 ou DTS, comum em arquivos MKV) e legendas embutidas no arquivo de vídeo exigiriam ferramenta extra, como o ffmpeg.

Decisões em aberto:

- Fonte dos vídeos: só os arquivos do computador. O usuário decidiu ficar só com arquivos locais (sem API de streaming nem busca online). A seção Procurar, que existiu por um tempo, foi removida em 2026-10-13 a pedido dele. Não reabrir sem pedido dele.
- Idioma da interface: português do Brasil. Assumido pelo agente e avisado ao usuário em 2026-10-05; ele não contestou.
- Capas: quadro tirado do próprio vídeo, offline, ou imagem escolhida à mão. A busca online de pôster (TMDB) foi dispensada pelo usuário em 2026-10-06. Os títulos sempre vêm do nome do arquivo ou da pasta.
- Formatos de vídeo e de legenda que precisam funcionar.
- Regras da sequência automática, escolhidas pelo agente em 2026-10-06 e ainda não comentadas pelo usuário: a contagem de 10 segundos começa quando os créditos começam, o que o app adivinha como os últimos 2 minutos do vídeo (ou o último quinto, em vídeos curtos), porque o arquivo não traz marcação; o vídeo continua rodando por trás e o botão "Ver créditos" adia o cartão até o fim de verdade; o aviso "Você ainda está assistindo?" aparece no lugar da contagem quando três vídeos seguidos terminam sem nenhuma tecla ou movimento do ponteiro, e espera resposta; a tecla N pula para o próximo durante o vídeo.
- Retomar o vídeo de onde parou: sugerido pelo agente, não pedido pelo usuário. Já existe como escolha explícita na ficha do item ("Continuar" ou "Do início"); o usuário ainda não opinou.
- Player: toca, pausa, avança e volta 10 segundos, mostra legendas, emenda no próximo vídeo com contagem e pergunta "Você ainda está assistindo?". Não há como desligar a sequência automática; Esc durante a contagem sai.
- Legenda escrita por fala: transcreve no idioma falado; não traduz. Se o usuário quiser legenda em português para áudio em outro idioma, é um recurso novo.
- Distribuição para outras pessoas (instalador, sistemas além do Windows).

## Brand Commitments

- Nome: Binger.
- Identidade visual: o padrão dos serviços de streaming, escolhido pelo usuário em 2026-10-06 entre cinco temas que viu rodando ("deixe somente o design do streaming"). Fundo quase preto, texto branco, imagem grande do item em foco se fundindo à página, vermelho para a marca e o progresso. É uma preferência firme: executar a convenção com capricho, sem inventar desvios.
- Não existem logo nem tom de voz definidos.

## Evidence on Hand

- A pasta do projeto estava vazia no init (2026-10-05): não há conteúdo, dados, capturas de tela, logo nem outros recursos.
- O conteúdo real do produto são os arquivos de vídeo do próprio usuário, que ficam fora do repositório.
- Não há capas, sinopses nem metadados de filmes disponíveis.
- Trabalhos futuros não devem inventar clientes, depoimentos, preços, números de uso nem alegações comerciais.

## Product Principles

1. Offline em primeiro lugar. Nada essencial pode depender de internet.
2. Os arquivos são da pessoa. O produto organiza e toca o que já está no computador, e a pasta é a fonte da verdade sobre a sequência.
3. Continuidade sem esforço. Assistir em sequência não exige escolher o próximo arquivo: o app propõe o próximo e a pessoa pode interromper.
4. Catálogo, não gerenciador de arquivos. A experiência é a de um streaming, não a de uma lista de arquivos.
5. Ferramenta pessoal. Feita para o próprio autor, sem promessas comerciais.
