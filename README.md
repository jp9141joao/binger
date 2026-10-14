# Binger

Um aplicativo de desktop para assistir, **no estilo de um serviço de streaming**, aos filmes, séries e vídeos que você já tem guardados no seu computador, inclusive vídeos que você baixou do YouTube ou de qualquer outra fonte e salvou em pastas.

Você joga seus vídeos para dentro do app, ele monta um catálogo com cara de streaming e você maratona: quando um episódio termina, o próximo da mesma pasta começa sozinho, com contagem regressiva. Tudo funciona **offline**, sem conta e sem enviar nada para a internet.

> O Binger toca apenas **arquivos locais**. Ela não reproduz conteúdo direto do YouTube nem de qualquer serviço online.

## Funcionalidades

- **Catálogo estilo streaming**: seus vídeos viram um catálogo com capas, séries e filmes, em tema escuro com destaque em vermelho.
- **Adicione vídeos do computador**: escolha arquivos ou pastas; a própria pasta define a sequência.
- **Maratona automática**: ao terminar um vídeo, o próximo da pasta entra com contagem regressiva ("próximo episódio"). Uma série não emenda em outra coisa.
- **"Você ainda está assistindo?"**: aparece depois de três vídeos seguidos sem nenhuma interação.
- **Pular intro**: marque o início e o fim da abertura de uma série (tecla `I`) e ela é pulada em todos os episódios.
- **Controle de episódios vistos**: marque episódio por episódio (tecla `V` na lista) ou use "Marcar todos".
- **Continuar de onde parou**: escolha "Continuar" ou "Do início" na ficha do item.
- **Legendas**: usa a legenda do próprio vídeo (arquivo ao lado ou faixa embutida) e, se não houver, gera uma por reconhecimento de fala **no seu próprio computador**. Quatro estilos (Clássica, Amarela, Caixa, Sombra) e três tamanhos. A legenda gerada transcreve no idioma falado; não traduz.
- **Séries montadas à mão ou automáticas**: o app separa séries de uma pasta pelo nome dos arquivos, e você pode organizá-las manualmente.
- **Capas**: um quadro tirado do próprio vídeo ou uma imagem que você escolher.
- **Feito para a TV**: navegação completa pelas setas do teclado ou por um controle, com tudo dimensionado para assistir do sofá, em tela cheia.

## Atalhos no player

| Tecla | Ação |
| --- | --- |
| `Espaço` / `Enter` / `K` | Pausar e continuar |
| `←` / `→` | Voltar / avançar 10 segundos |
| `N` | Pular para o próximo vídeo |
| `L` | Escolher legenda |
| `I` | Marcar a intro da série |
| `F` | Tela cheia |
| `O` | Abrir o arquivo no programa padrão do sistema |
| `Esc` / `Backspace` | Sair do player |

## Formatos

Toca `.mp4`, `.m4v`, `.mov`, `.webm`, `.mkv`, `.ogv` e `.3gp`. O player usa o decodificador do Chromium, então alguns arquivos (por exemplo `.mkv` com áudio AC3 ou DTS) podem ficar sem som; nesses casos use `O` para abrir no programa padrão.

## Como rodar

Requisitos: [Node.js](https://nodejs.org/) 20 ou mais recente.

```bash
git clone https://github.com/jp9141joao/binger.git
cd binger
npm install
npm run dev
```

Outros comandos:

```bash
npm run build      # checa os tipos e gera o build
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Tecnologias

Electron, Vite, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, FFmpeg e Whisper (via `@huggingface/transformers`) para as legendas geradas localmente.

## Aviso

Projeto pessoal, sem vínculo com nenhum serviço de streaming ou empresa. O app não inclui nem distribui nenhum conteúdo: ele apenas organiza e toca os arquivos que você já tem. Use somente conteúdo que você tem direito de assistir.

## Licença

[MIT](LICENSE)
