---
name: Binger
description: O acervo local de vídeos como um catálogo de streaming, para ver do sofá numa TV.
colors:
  brand: "oklch(0.62 0.23 25)"
  background: "oklch(0.145 0 0)"
  card: "oklch(0.22 0 0)"
  muted: "oklch(0.26 0 0)"
  secondary: "oklch(0.32 0 0)"
  foreground: "oklch(0.985 0 0)"
  muted-foreground: "oklch(0.76 0 0)"
  border: "oklch(1 0 0 / 0.16)"
  input: "oklch(1 0 0 / 0.3)"
  focus: "oklch(0.985 0 0)"
  focus-foreground: "oklch(0.145 0 0)"
  destructive: "oklch(0.7 0.19 22)"
  video-black: "oklch(0 0 0)"
  subtitle-yellow: "oklch(0.91 0.18 100)"
typography:
  display:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "2.375rem"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "tnum"
  body-small:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 550
    lineHeight: 1.2
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
  caption:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.35
  wordmark:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  subtitle:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.4375rem"
    fontWeight: 600
    lineHeight: 1.3
  subtitle-large:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "0.15rem"
  md: "0.2rem"
  lg: "0.25rem"
spacing:
  safe-x: "3rem"
  safe-y: "1.6875rem"
  tile-gap: "0.75rem"
  shelf-gap: "0.875rem"
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0 0.625rem"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0 0.625rem"
  button-outline:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0 0.625rem"
  button-focus:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.focus-foreground}"
  nav-item:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.lg}"
    height: "1.625rem"
    padding: "0 0.625rem"
  nav-item-current:
    textColor: "{colors.foreground}"
  nav-item-focus:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.focus-foreground}"
  tile:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    width: "10rem"
  tile-sticker:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.lg}"
    padding: "0.0625rem 0.375rem"
  row:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem 0.25rem 0.5rem"
  row-focus:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.focus-foreground}"
  pick:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0.3125rem 0.5rem"
  pick-current:
    backgroundColor: "{colors.secondary}"
  pick-focus:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.focus-foreground}"
  toggle-item:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0 0.625rem"
  toggle-item-pressed:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
  toggle-item-focus:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.focus-foreground}"
  input:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0.25rem 0.625rem"
  kbd:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "1.25rem"
    padding: "0 0.25rem"
---

# Design System: Binger

## Overview

**Creative North Star: "Streaming padrão, visto do sofá"**

O Binger tem a cara que os serviços de streaming compartilham, executada sem desvio: fundo quase preto neutro, texto branco, a imagem grande do item em foco se fundindo à página e um único vermelho para a marca e o progresso. A convenção é o compromisso; o usuário viu cinco temas rodando e ficou só com este. Não há segundo mundo visual, tema claro nem ornamento.

Tudo é dimensionado para uma TV vista do sofá, a alguns metros, numa sala pouco iluminada. A interface inteira é um quadro de 60 × 33,75rem que escala com a tela (1rem = 32px em 1080p), então a composição é a mesma em 720p, 1080p, 4K ou numa janela. A navegação é por setas: o foco é foco real do DOM e precisa ser visto de longe, por isso um controle em foco vira um campo branco inteiro e uma capa em foco cresce sob um aro branco.

A densidade é de catálogo, não de gerenciador de arquivos: um palco com um título grande e poucos fatos, prateleiras de capas 16:9, uma legenda de teclas no rodapé. As superfícies são planas e neutras; a única cor vem das imagens dos próprios vídeos e do vermelho da marca.

**Key Characteristics:**
- Só escuro, por cena de uso (TV em sala pouco iluminada). Não existe tema claro.
- Quadro de 60 × 33,75rem que escala inteiro com a tela; nenhum tamanho fluido por elemento.
- Uma família tipográfica, Geist Variable, hospedada no próprio app; hierarquia por tamanho e peso.
- Neutros sem croma e um único vermelho de marca.
- Foco por preenchimento branco nos controles; capa em foco cresce 7% sob aro branco.
- Uma lei de movimento: 180ms com ease-out exponencial, sem ricochete.
- Superfícies planas; profundidade por degraus de tom, não por sombra.

## Colors

Uma escada de cinzas sem croma, do quase preto ao quase branco, e um vermelho. Os valores canônicos são OKLCH e vivem em `:root` no `src/index.css`.

### Primary
- **Vermelho da Marca** (`brand`): a marca "Binger" na barra superior, o preenchimento de todo progresso (faixa na capa e na miniatura do episódio, sequência da temporada, trilho do player, contagem do próximo vídeo) e o selo "Novo". Também é a cor do cursor de texto nos campos.

### Neutral
- **Preto de Sala Escura** (`background`): o fundo de toda a interface. Também é o texto sobre um controle em foco (`focus-foreground`).
- **Cinza de Capa** (`card`): o fundo de toda mídia antes da imagem chegar (capa, palco, miniatura) e das superfícies sobrepostas (`popover`, aviso).
- **Cinza Mudo** (`muted`): fundo das teclas da legenda e do esqueleto de carregamento.
- **Cinza de Seleção** (`secondary`, mesmo valor de `accent`): botões primário e secundário em repouso, opção marcada de um grupo, fonte atual em Organizar. Marca "escolhido", nunca "em foco".
- **Branco de Tela** (`foreground`, mesmo valor de `primary`, `ring` e `focus`): texto principal, segmentos vistos da sequência e o preenchimento de foco.
- **Cinza de Apoio** (`muted-foreground`): texto secundário: rótulos dos fatos, metadados, contagens, relógio, legenda de teclas, item de navegação em repouso.
- **Fio Branco 16%** (`border`): divisórias e bordas discretas dos componentes shadcn, e a barra de rolagem fina.
- **Fio Branco 30%** (`input`): borda de botões de contorno, opções de grupo e campos.
- **Preto de Vídeo** (`video-black`): o fundo do player e a base das sombras sobre o vídeo (barra de controles, caixa e contorno da legenda).
- **Vermelho de Erro** (`destructive`): definido no tema; em uso só no ícone de erro do aviso flutuante e nos estados inválidos herdados do shadcn.

### Tertiary
- **Amarelo de Legenda** (`subtitle-yellow`): só o texto da legenda no estilo Amarela. Não é cor de interface.

### Named Rules
**The One Red Rule.** Existe um vermelho, `brand`, e ele significa marca, progresso ou novidade. Onde nada foi assistido, nada fica vermelho. Nunca é fundo de botão, texto corrido nem estado de foco.

**The Focus Is White Rule.** Branco cheio (`focus`) é reservado ao que está em foco, e só a ele: de longe, dois controles brancos na mesma tela deixam em dúvida onde o foco está. Em repouso, até o botão primário é um campo `secondary`; o que está apenas escolhido ou marcado também usa `secondary`.

**The Film Owns Its Colors Rule.** Toda cor cromática fora do vermelho vem do vídeo: as capas, a legenda Amarela e o quadro atrás da amostra de legenda em Ajustes, que é um quadro de verdade tirado da biblioteca (um campo `card` liso quando ela está vazia). A interface não desenha imagem de mentira. A moldura fica neutra.

## Typography

**Display Font:** Geist Variable (com sans-serif genérica)
**Body Font:** Geist Variable (com sans-serif genérica)

**Character:** Uma só família em toda a interface, hospedada no app via `@fontsource-variable/geist`, sem depender de internet. A hierarquia vem do tamanho e de pesos intermediários do eixo variável (550, 650, 750, 800), com entrelinha curta e leve aperto nos títulos. Os números são tabulares em todo lugar.

### Hierarchy
- **Display** (750, 2.375rem, entrelinha 1.05, -0.025em): o título do item no palco e na ficha. No máximo duas linhas, com quebra equilibrada.
- **Headline** (750, 1.75rem, entrelinha 1.1, -0.02em): o título de tela ("Organizar", "Ajustes") e o das telas vazias.
- **Title** (650, 1.0625rem, entrelinha 1.2): nome de prateleira. Também o título do painel de legendas e o do cartão de fim de vídeo. No player, o título do vídeo usa 1.125rem, no mesmo peso.
- **Body** (400, 0.875rem, entrelinha 1.35): texto base, rótulos de botão (em peso 600), linhas de lista, navegação (500 em repouso, 650 na seção atual).
- **Body small** (550, 0.8125rem, entrelinha 1.2): nome sob a capa; fatos do palco (rótulo em 400 e cinza de apoio, valor em 600); linhas do painel do player.
- **Label** (400 a 600, 0.75rem): metadados de linha, contagem da prateleira, cabeçalho de grupo em listas (temporada, "Pastas", "Catálogos", em 600 e cinza de apoio), textos de ajuda, teclas.
- **Caption** (400, 0.6875rem): legenda de teclas do rodapé, linha de metadados sob a capa, selo "Novo" (em 700). É o menor texto em uso.
- **Wordmark** (800, 1.125rem, -0.01em): a palavra "Binger" em vermelho. Não há logo.
- **Subtitle** (600, entrelinha 1.3, centralizado): a legenda do vídeo, em três tamanhos: P 1.125rem, M 1.4375rem, G 1.875rem.

### Named Rules
**The Canvas Scale Rule.** Todo tamanho de texto é um valor fixo em `rem`. Quem responde à tela é só o `font-size` do `html`, `min(100vw / 60, 100vh / 33.75)`. Isso é escala de quadro para leitura a três metros, não tipografia fluida.

**The 22 Pixel Floor Rule.** Nenhum texto fica abaixo de 0.6875rem, que são 22px numa tela 1080p.

**The One Family Rule.** Só Geist Variable. A regra `overused-font` do detector do Impeccable está ignorada para Geist em `.impeccable/config.json`, porque o usuário aprovou este visual como foi mostrado.

## Layout

O quadro tem 60 × 33,75rem e ocupa a janela inteira, sem rolagem de página (`body` com `overflow: hidden`). O aplicativo é uma grade de três linhas: barra superior, a tela atual e a legenda de teclas. Não há breakpoints: em qualquer resolução 16:9 a composição é idêntica; em outra proporção o quadro escala pelo lado mais apertado.

- **Margem segura:** 3rem nas laterais (`safe-x`) e 1.6875rem em cima e embaixo (`safe-y`), 5% do quadro em cada eixo. Todo conteúdo se alinha a `safe-x`; os trilhos de capas rolam por baixo dela usando `scroll-padding`.
- **Início:** palco de 10rem de altura (`--stage-h`) sobre a lista de prateleiras. O texto do palco ocupa até 30rem à esquerda; a imagem 16:9 do item em foco fica presa à direita, começa no topo da tela por trás da barra superior, desce 1.5rem além do palco e se desfaz na página por três máscaras: para a esquerda, para baixo e, em cima, contida a 10 a 20% atrás da barra para o relógio ser lido sobre qualquer quadro.
- **Prateleira:** título e contagem na linha de base, depois um trilho horizontal de capas de 10rem de largura (`--tile-w`, 320px em 1080p) com 0.75rem entre elas (`tile-gap`) e 0.875rem acima de cada prateleira (`shelf-gap`). A prateleira em foco sobe para o topo da lista; da seguinte aparece cerca de metade das capas, sumindo nos últimos 2.5rem.
- **Ficha:** duas colunas, 20rem para a capa e as ações sobre o arquivo (capa, legendas, abrir fora, mostrar na pasta), o resto para título, fatos, as duas ações de assistir ("Assistir" e "Marcar como visto") e episódios, com 2rem entre elas. Só a lista de episódios cede quando falta altura.
- **Organizar:** 15rem para pastas e catálogos, o resto para os vídeos, com 2rem entre as colunas.
- **Ajustes e textos:** colunas de leitura limitadas a 34rem (36rem no texto de ajuda de Organizar).
- **Ritmo:** passos curtos e repetidos: 0.125rem entre linhas de lista, 0.375 a 0.5rem dentro de um grupo, 0.75rem entre blocos de uma coluna, 1.25rem entre itens da barra superior e da legenda, 1.5 a 2rem entre seções e colunas.
- **Rolagem:** suave e sem barras em lugar nenhum. Toda lista que rola se desfaz nas bordas por máscara de 2rem. A de baixo é fixa; a de cima só aparece depois que a lista andou (um comprimento registrado, `--fade-top`, animado pela própria rolagem), de modo que em repouso a primeira linha fica inteira. Com `scroll-padding` de 2.25rem, nada aparece cortado no meio de uma letra e a linha em foco nunca fica dentro do esmaecido.

## Elevation & Depth

O sistema é plano. A profundidade vem de degraus de tom na escada neutra (`background`, `card`, `muted`, `secondary`), nunca de sombra projetada nas superfícies desenhadas para o Binger. A imagem do palco não flutua sobre a página: ela se funde ao fundo por máscara. Sobre o vídeo, a legibilidade vem de um degradê preto que sobe do rodapé (de 85% a 0%) atrás dos controles, e de painéis quase opacos em preto neutro.

A ordem de empilhamento é curta: a barra superior fica acima da imagem do palco; a capa em foco sobe um nível para crescer sobre as vizinhas; no player, a legenda fica acima da barra de controles e o painel de legendas acima de tudo.

### Named Rules
**The Tone Not Shadow Rule.** Uma superfície se destaca da outra por ser um degrau mais clara. O único contorno escuro projetado no produto pertence à legenda do vídeo (estilos Clássica, Amarela e Sombra), onde ele existe para o texto vencer qualquer quadro do filme.

## Shapes

Cantos discretos e iguais em quase tudo: 0.25rem (`lg`, 8px em 1080p) em capas, botões, linhas de lista, itens de navegação, selo, avisos e painéis. A caixa de marcar e as miniaturas usam o mesmo canto. As teclas usam `sm`. O interruptor é a única forma em pílula.

Toda mídia é 16:9 com `object-fit: cover`. A imagem do palco não tem canto nem borda: suas bordas são a própria máscara. Os segmentos da sequência de episódios e os trilhos de progresso são retos, sem arredondamento. Bordas são fios finos e translúcidos (`border`, `input`) de 0.0625rem, inclusive em botões e campos, para escalarem com a tela.

## Components

Os primitivos são shadcn/ui sobre Base UI, tematizados pelos tokens; as peças próprias do catálogo são regras em `src/index.css` chaveadas por `data-slot`. Todo controle acionável leva `data-nav`, que o inscreve no motor de foco direcional (`src/lib/nav.ts`): as setas movem o foco real do DOM para o controle mais próximo naquela direção, mantendo a linha nos movimentos laterais e a coluna nos verticais. Cada tela declara onde o foco pousa ao abrir (`data-nav-default`). Com o teclado em uso o ponteiro some; um movimento real do ponteiro sobre uma capa dá foco a ela.

### Buttons
- **Shape:** canto discreto (0.25rem), 2rem de altura, 0.625rem de preenchimento lateral, rótulo em 0.875rem peso 600, ícone Lucide de 1rem antes do texto.
- **Primary:** em repouso, fundo `secondary` e texto `foreground`, como a secundária; é a que vem primeiro no grupo e a que recebe o foco quando a tela abre. Uma por grupo de ações: "Assistir", "Adicionar pasta", "Criar catálogo", "Assistir agora".
- **Secondary:** fundo `secondary`, texto `foreground`. A alternativa imediata à primária ("Do início", "Atualizar biblioteca", "Juntar a…").
- **Outline:** fio `input` e um véu branco muito leve. Ações de manutenção ("Trocar capa", "Marcar como visto", "Mostrar na pasta").
- **Focus:** qualquer variante vira um campo `focus` inteiro com texto `focus-foreground`, sem borda e sem anel.
- **Disabled:** 50% de opacidade e fora do percurso do foco.

### Toggle group
- **Style:** opções lado a lado no formato do botão de contorno. Usado para estilo e tamanho da legenda.
- **State:** a opção escolhida tem fundo `secondary` e borda `foreground`; a opção em foco é preenchida com `focus`, esteja escolhida ou não.

### Cards / Containers
- **Capa (tile):** 10rem de largura. Imagem 16:9 sobre `card`, canto 0.25rem; abaixo, o nome em uma linha (0.8125rem, 550) e uma linha de metadados (0.6875rem, cinza de apoio), com o sinal de "visto" à direita.
- **Sem imagem:** a capa mostra o próprio título centralizado (0.875rem, 650, até três linhas; 1.75rem no palco e na ficha) sobre um campo `card` liso, e o nome de baixo é omitido.
- **Estados:** "Novo" é um selo vermelho no canto superior esquerdo; "em andamento" é uma faixa de 0.1875rem na base da imagem, preenchida em vermelho até onde parou; "visto" é um ícone de marca ao lado do nome.
- **Focus:** a capa cresce para 1.07 e a imagem ganha um aro `focus` de 0.125rem afastado 0.09375rem, em 180ms. A imagem e os fatos do item tomam o palco.
- **Shadow Strategy:** nenhuma; ver Elevation & Depth.

### Inputs / Fields
- **Style:** 2rem de altura, canto 0.25rem, fio `input`, fundo quase transparente, texto em 0.875rem. O cursor de texto é vermelho.
- **Focus:** aro `focus` de 0.125rem afastado 0.125rem, porque o campo precisa continuar legível enquanto se digita. O interruptor usa o mesmo aro.
- **Switch:** pílula; ligado tem trilho `foreground`, desligado tem trilho `input`.

### Navigation
- **Barra superior:** a marca em vermelho, depois "Início", "Organizar" e "Ajustes", e o relógio à direita em cinza de apoio. Cada item tem 1.625rem de altura, canto 0.25rem, texto em cinza de apoio e peso 500; a seção atual fica em `foreground` e peso 650; o item em foco é preenchido com `focus`.
- **Legenda de teclas:** o rodapé de toda tela lista as teclas que valem ali, em 0.6875rem e cinza de apoio; cada tecla é uma pastilha `muted` de 1.25rem.

### Linhas de lista
- **Episódio:** grade de número, miniatura 16:9 de 5rem, título em uma linha, duração ou "parou em", e o sinal de visto. Sem fundo em repouso; preenchida com `focus` quando em foco. O título de um episódio visto fica em cinza de apoio.
- **Escolha (Organizar):** ícone ou caixa de marcar, nome e contagem. A fonte atual tem fundo `secondary`; a caixa marcada inverte para `foreground`; a linha em foco é preenchida com `focus`.

### Sequência de episódios
A temporada inteira em uma faixa de 0.25rem de altura e até 28rem de largura: um segmento por episódio, com largura proporcional à duração. Cada segmento é um trilho liso (`input`) preenchido em vermelho até onde aquele episódio foi assistido: cheio se visto, pela metade se parou no meio, vazio se ainda não começou. É o mesmo desenho do trilho do player. Aparece no palco e na ficha das séries; na lista, o episódio em andamento repete a faixa vermelha na base da miniatura.

### Player
Vídeo em tela inteira sobre preto puro. Os controles são uma barra presa à base, sobre um degradê preto: título, trilho de 0.25rem com preenchimento vermelho, tempo e teclas. Ela some em 180ms quando o vídeo toca sem interação. Avisos ficam no canto superior esquerdo e o painel de legendas no superior direito, ambos em preto neutro quase opaco com canto 0.25rem. No painel, a linha ativa é preenchida com `focus` e as setas a movem por estado da tela, não por foco do DOM: é a única exceção ao motor de foco.

### Fim do vídeo
Nos últimos 2 minutos de um vídeo (ou no último quinto, nos curtos) que tem outro depois dele na mesma pasta (os créditos, por palpite), o cartão abaixo já aparece com o vídeo ainda rodando: só o canto inferior fica sombreado, e há um terceiro botão, "Ver créditos", que o tira até o fim de verdade. Quando o vídeo termina, o último quadro escurece (preto a 75%) e um cartão ocupa o canto inferior direito, dentro das margens seguras: a miniatura 16:9 do próximo vídeo, de 13rem, e ao lado o título ("Próximo episódio em 8 s"), o nome do que vem e dois botões, "Assistir agora" e "Sair". Uma linha vermelha de 0.25rem enche a base da miniatura em 10 segundos; quando chega ao fim, o próximo começa. Aqui o foco é foco real do DOM, com "Assistir agora" em foco ao abrir. Depois de três vídeos seguidos sem nenhuma tecla ou movimento, o mesmo cartão pergunta "Você ainda está assistindo?", sem contagem, e espera.

### Legendas
A legenda pertence ao filme, não à interface: Geist 600 centralizada, com quatro estilos e três tamanhos escolhidos pelo usuário, independentes do resto do sistema.
- **Clássica:** branco com contorno preto de 0.16em.
- **Amarela:** `subtitle-yellow` com o mesmo contorno.
- **Caixa:** branco sobre uma caixa preta a 80% por linha.
- **Sombra:** branco com duas sombras pretas curtas, sem contorno.
- **Posição:** 10% de margem lateral, logo acima da margem segura; sobe para 6.25rem quando os controles aparecem, para nunca ficar atrás deles.

## Do's and Don'ts

### Do:
- **Do** dimensionar tudo em `rem` sobre o quadro de 60 × 33,75rem; o `font-size` do `html` é a única coisa que responde à tela.
- **Do** manter todo texto em 0.6875rem ou mais (22px em 1080p).
- **Do** dar a todo controle acionável `data-nav` e um estado `:focus` visível de longe: preenchimento `focus` para controles com rótulo, aro `focus` de 0.125rem para capa, interruptor e campo de texto.
- **Do** usar `brand` só para a marca, o progresso e o selo "Novo".
- **Do** fechar um aviso flutuante quando a tela muda: ele pertence à tela que o abriu.
- **Do** mover com `--dur` (180ms) e `--ease` (`cubic-bezier(0.16, 1, 0.3, 1)`), e respeitar `prefers-reduced-motion`.
- **Do** manter toda mídia em 16:9 com `object-fit: cover` sobre `card`, com canto de 0.25rem.
- **Do** separar superfícies por um degrau de tom da escada neutra.
- **Do** escrever a interface em português do Brasil, com números tabulares.

### Don't:
- **Don't** criar tema claro: o produto é só escuro, pela cena de uso.
- **Don't** acrescentar uma segunda família tipográfica; a hierarquia é tamanho e peso de Geist.
- **Don't** usar um anel fino como único sinal de foco em um controle com rótulo; de longe ele não basta.
- **Don't** usar o vermelho como fundo de botão, cor de texto corrido ou estado de foco.
- **Don't** introduzir outra cor cromática na moldura da interface; as que existem (legenda Amarela, quadros dos vídeos) pertencem ao filme.
- **Don't** desenhar textura, hachura ou degradê decorativo; o mundo é liso.
- **Don't** deixar conteúdo cortado a seco na borda de uma área que rola, nem mostrar barra de rolagem.
- **Don't** aplicar tamanho fluido por elemento (`clamp`, `vw`) nem breakpoints em regras novas; a escala é do quadro inteiro.
- **Don't** dar sombra projetada a superfícies; a profundidade é por tom.
- **Don't** aplicar os estilos de legenda ao texto da interface, nem os tokens da interface à legenda.
- **Don't** depender de hover para revelar ou explicar algo: quem usa está no sofá, com as setas.
