import type {
  SubtitleJob,
  SubtitleSize,
  SubtitleStyle,
  SubtitleTrack,
} from "@shared/types"

export const SUBTITLE_STYLES: { id: SubtitleStyle; name: string }[] = [
  { id: "classica", name: "Clássica" },
  { id: "amarela", name: "Amarela" },
  { id: "caixa", name: "Caixa" },
  { id: "sombra", name: "Sombra" },
]

export const SUBTITLE_SIZES: { id: SubtitleSize; name: string }[] = [
  { id: "p", name: "Pequena" },
  { id: "m", name: "Média" },
  { id: "g", name: "Grande" },
]

const LANGUAGE_NAMES: Record<string, string> = {
  pt: "português",
  en: "inglês",
  es: "espanhol",
  ja: "japonês",
  fr: "francês",
  it: "italiano",
  de: "alemão",
  ko: "coreano",
}

const SOURCE: Record<SubtitleTrack["kind"], string> = {
  file: "arquivo ao lado do vídeo",
  embedded: "dentro do vídeo",
  auto: "escrita ouvindo o vídeo",
}

export function trackSource(track: SubtitleTrack): string {
  return SOURCE[track.kind]
}

/**
 * Which subtitle to show when a video opens: the viewer's last choice for
 * it, else (when subtitles are on) Portuguese first, files before embedded
 * tracks, and a generated one last.
 */
export function pickTrack(
  tracks: SubtitleTrack[],
  saved: string | undefined,
  enabled: boolean
): string {
  if (saved === "off" || tracks.some((track) => track.id === saved)) {
    return saved!
  }
  if (!enabled) {
    return "off"
  }
  const rank = (track: SubtitleTrack) =>
    (track.language === "pt" ? 0 : 3) +
    (track.kind === "file" ? 0 : track.kind === "embedded" ? 1 : 2)
  return [...tracks].sort((a, b) => rank(a) - rank(b))[0]?.id ?? "off"
}

/** One line saying what the subtitle writer is doing. */
export function jobStatus(job: SubtitleJob): string {
  const percent = `${Math.round(job.progress * 100)}%`
  const language = job.language ? LANGUAGE_NAMES[job.language] ?? job.language : ""
  if (job.status === "downloading") {
    return `Baixando o modelo de fala, só na primeira vez: ${percent}`
  }
  if (job.status === "transcribing") {
    return language
      ? `Ouvindo o vídeo (${language}): ${percent}`
      : `Ouvindo o vídeo: ${percent}`
  }
  if (job.status === "done") {
    return "Legenda pronta"
  }
  if (job.status === "error") {
    if (job.message === "no-audio") {
      return "Este vídeo não tem áudio para ouvir."
    }
    return "Não deu para escrever a legenda. Na primeira vez é preciso internet para baixar o modelo de fala."
  }
  return job.status === "queued" ? "Na fila" : "Preparando o modelo de fala"
}
