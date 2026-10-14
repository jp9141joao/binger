// Finds, reads and writes subtitles: files sitting beside the video, tracks
// stored inside it (pulled out with ffmpeg), and ones written by listening to
// the audio with a speech model.

import { execFile, fork, type ChildProcess } from "node:child_process"
import { readdir, readFile, stat } from "node:fs/promises"
import { cpus } from "node:os"
import { basename, dirname, extname, join } from "node:path"
import type { Cue, SubtitleJob, SubtitleList, SubtitleTrack } from "../shared/types.ts"
import { stem } from "./library.ts"

const SIDECAR_EXT = new Set([".srt", ".vtt", ".ass", ".ssa"])
/** Embedded formats that hold text; the others are pictures of text. */
const TEXT_CODECS = new Set(["subrip", "srt", "ass", "ssa", "mov_text", "webvtt", "text"])
const MODEL = "onnx-community/whisper-large-v3-turbo_timestamped"
const LANGUAGE_NAMES: Record<string, string> = {
  pt: "Português",
  por: "Português",
  pob: "Português",
  "pt-br": "Português",
  en: "Inglês",
  eng: "Inglês",
  es: "Espanhol",
  spa: "Espanhol",
  ja: "Japonês",
  jpn: "Japonês",
  fr: "Francês",
  fre: "Francês",
  fra: "Francês",
  it: "Italiano",
  ita: "Italiano",
  de: "Alemão",
  ger: "Alemão",
  deu: "Alemão",
  ko: "Coreano",
  kor: "Coreano",
}
const LANGUAGE_CODES: Record<string, string> = {
  por: "pt",
  pob: "pt",
  "pt-br": "pt",
  eng: "en",
  spa: "es",
  jpn: "ja",
  fre: "fr",
  fra: "fr",
  ita: "it",
  ger: "de",
  deu: "de",
  kor: "ko",
}

function languageOf(tag: string | undefined): { language?: string; name?: string } {
  const key = tag?.toLowerCase()
  if (!key || !LANGUAGE_NAMES[key]) {
    return {}
  }
  return { language: LANGUAGE_CODES[key] ?? key, name: LANGUAGE_NAMES[key] }
}

// ---------- Parsing ----------

function seconds(stamp: string): number {
  const parts = stamp.replace(",", ".").split(":").map(Number)
  return parts.reduce((total, part) => total * 60 + part, 0)
}

/** Drops markup, keeps the words and the line breaks. */
function plain(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\\[Nn]/g, "\n")
    .replace(/\\h/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
}

/** SRT and WebVTT share their cue shape: a time line, then text. */
function parseTimed(source: string): Cue[] {
  const cues: Cue[] = []
  const stamp = /(\d+:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d+:\d{2}(?::\d{2})?[.,]\d{1,3})/
  for (const block of source.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block.split("\n")
    const at = lines.findIndex((line) => stamp.test(line))
    if (at < 0) {
      continue
    }
    const match = stamp.exec(lines[at])!
    const text = plain(lines.slice(at + 1).join("\n"))
    if (text) {
      cues.push({ start: seconds(match[1]), end: seconds(match[2]), text })
    }
  }
  return cues
}

function parseAss(source: string): Cue[] {
  const cues: Cue[] = []
  let fields: string[] = []
  for (const line of source.replace(/\r/g, "").split("\n")) {
    if (line.startsWith("Format:") && fields.length === 0 && /Text/i.test(line)) {
      fields = line
        .slice(7)
        .split(",")
        .map((field) => field.trim().toLowerCase())
    } else if (line.startsWith("Dialogue:") && fields.length > 0) {
      // The text is the last field and may itself contain commas.
      const values = line.slice(9).split(",")
      const head = values.slice(0, fields.length - 1).map((value) => value.trim())
      const text = plain(values.slice(fields.length - 1).join(","))
      const start = head[fields.indexOf("start")]
      const end = head[fields.indexOf("end")]
      if (text && start && end) {
        cues.push({ start: seconds(start), end: seconds(end), text })
      }
    }
  }
  return cues.sort((a, b) => a.start - b.start)
}

/** Older subtitle files are rarely UTF-8; Brazilian ones are usually Latin-1. */
function decode(bytes: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder("windows-1252").decode(bytes)
  }
}

export function parseSubtitle(bytes: Buffer, ext: string): Cue[] {
  const source = decode(bytes)
  return ext === ".ass" || ext === ".ssa" ? parseAss(source) : parseTimed(source)
}

// ---------- Tracks ----------

export type Subtitles = {
  list(fileId: string): Promise<SubtitleList>
  load(fileId: string, trackId: string): Promise<Cue[]>
  generate(fileIds: string[]): void
  cancel(): void
  job(): SubtitleJob | null
}

type Options = {
  ffmpeg: string
  /** Where extracted and generated subtitles are kept. */
  dir: string
  modelDir: string
  workerPath: string
  pathOf(fileId: string): string | undefined
  onJob(job: SubtitleJob | null): void
  onCues(fileId: string, cues: Cue[]): void
  onDone(fileId: string): void
}

function run(file: string, args: string[]): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (_error, stdout, stderr) => resolve({ stdout, stderr: stderr.toString() })
    )
  })
}

export function createSubtitles(options: Options): Subtitles {
  const autoPath = (fileId: string) => join(options.dir, `${fileId}.auto.vtt`)
  const queue: string[] = []
  /** Captions heard so far for the video being worked on. */
  const partial = new Map<string, Cue[]>()
  let current: SubtitleJob | null = null
  let worker: ChildProcess | null = null

  async function sidecars(path: string): Promise<SubtitleTrack[]> {
    const base = stem(basename(path)).toLowerCase()
    const names = await readdir(dirname(path)).catch(() => [])
    const tracks: SubtitleTrack[] = []
    for (const name of names) {
      const ext = extname(name).toLowerCase()
      const lower = name.toLowerCase()
      if (!SIDECAR_EXT.has(ext) || !lower.startsWith(base)) {
        continue
      }
      // "Filme.pt-BR.srt" carries its language between the name and the type.
      const tag = stem(lower).slice(base.length).replace(/^[.\-_ ]+/, "")
      const { language, name: languageName } = languageOf(tag)
      tracks.push({
        id: `file:${name}`,
        kind: "file",
        label: languageName ?? (tag ? tag.toUpperCase() : "Arquivo de legenda"),
        language,
      })
    }
    return tracks
  }

  async function embedded(
    path: string
  ): Promise<{ tracks: SubtitleTrack[]; pictureTracks: number }> {
    const { stderr } = await run(options.ffmpeg, ["-hide_banner", "-i", path])
    const tracks: SubtitleTrack[] = []
    let pictureTracks = 0
    let index = -1
    const lines = stderr.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const match = /Stream #\d+:\d+(?:\[[^\]]+\])?(?:\((\w+)\))?: Subtitle: (\w+)/.exec(lines[i])
      if (!match) {
        continue
      }
      index += 1
      if (!TEXT_CODECS.has(match[2])) {
        pictureTracks += 1
        continue
      }
      // The track's own title, when the file gives one, is in the metadata
      // lines that follow, before the next stream starts.
      let title: string | undefined
      for (let j = i + 1; j < lines.length && !/Stream #/.test(lines[j]); j++) {
        const found = /^\s+title\s*:\s*(.+)$/i.exec(lines[j])
        if (found) {
          title = found[1].trim()
          break
        }
      }
      const { language, name } = languageOf(match[1])
      tracks.push({
        id: `embedded:${index}`,
        kind: "embedded",
        label: title || name || `Faixa ${index + 1}`,
        language,
      })
    }
    return { tracks, pictureTracks }
  }

  async function list(fileId: string): Promise<SubtitleList> {
    const path = options.pathOf(fileId)
    if (!path) {
      return { tracks: [], pictureTracks: 0 }
    }
    const [beside, inside, generated] = await Promise.all([
      sidecars(path),
      embedded(path),
      stat(autoPath(fileId)).catch(() => null),
    ])
    const tracks = [...beside, ...inside.tracks]
    if (generated || partial.has(fileId)) {
      tracks.push({ id: "auto", kind: "auto", label: "Gerada pelo Binger" })
    }
    return { tracks, pictureTracks: inside.pictureTracks }
  }

  async function load(fileId: string, trackId: string): Promise<Cue[]> {
    const path = options.pathOf(fileId)
    if (!path) {
      return []
    }
    if (trackId === "auto") {
      const inProgress = partial.get(fileId)
      if (inProgress) {
        return inProgress
      }
      const bytes = await readFile(autoPath(fileId)).catch(() => null)
      return bytes ? parseSubtitle(bytes, ".vtt") : []
    }
    if (trackId.startsWith("file:")) {
      const name = basename(trackId.slice(5))
      const bytes = await readFile(join(dirname(path), name)).catch(() => null)
      return bytes ? parseSubtitle(bytes, extname(name).toLowerCase()) : []
    }
    if (trackId.startsWith("embedded:")) {
      const index = Number(trackId.slice(9))
      const { stdout } = await run(options.ffmpeg, [
        "-v", "error", "-i", path, "-map", `0:s:${index}`, "-f", "webvtt", "pipe:1",
      ])
      return parseSubtitle(stdout, ".vtt")
    }
    return []
  }

  function publish(job: SubtitleJob | null): void {
    current = job
    options.onJob(job)
  }

  function next(): void {
    const fileId = queue.shift()
    const input = fileId ? options.pathOf(fileId) : undefined
    if (!fileId) {
      publish(null)
      return
    }
    if (!input) {
      next()
      return
    }

    partial.set(fileId, [])
    const job: SubtitleJob = { fileId, status: "loading", progress: 0, waiting: queue.length }
    publish(job)
    const update = (changes: Partial<SubtitleJob>) => {
      Object.assign(job, changes, { waiting: queue.length })
      publish({ ...job })
    }

    const start = (device: "dml" | "cpu") => {
      let failed = false
      const config = {
        ffmpeg: options.ffmpeg,
        input,
        output: autoPath(fileId),
        model: MODEL,
        cacheDir: options.modelDir,
        device,
        // Half precision suits the graphics card; 8-bit weights suit the processor.
        dtype:
          device === "dml"
            ? { encoder_model: "fp16", decoder_model_merged: "fp16" }
            : { encoder_model: "q8", decoder_model_merged: "q8" },
        threads: Math.max(2, Math.floor(cpus().length / 2)),
      }
      // Under Electron, fork() starts the worker as plain Node.
      worker = fork(options.workerPath, [JSON.stringify(config)], { stdio: "ignore" })
      worker.on("message", (message: Record<string, unknown>) => {
        if (message.type === "download") {
          const share = (message.loaded as number) / (message.total as number)
          update({ status: "downloading", progress: share })
        } else if (message.type === "language") {
          update({ language: message.language as string })
        } else if (message.type === "status" && message.status === "transcribing") {
          if (job.status !== "transcribing") {
            update({ status: "transcribing", progress: 0 })
          }
        } else if (message.type === "cues") {
          const cues = message.cues as Cue[]
          partial.get(fileId)?.push(...cues)
          options.onCues(fileId, cues)
          const duration = message.duration as number
          update({ progress: duration > 0 ? Math.min(1, (message.done as number) / duration) : 0 })
        } else if (message.type === "error") {
          failed = true
          job.message = message.message as string
        }
      })
      worker.on("exit", (code) => {
        worker = null
        if (code === null) {
          // Cancelled.
          partial.delete(fileId)
          return
        }
        if (code !== 0 || failed) {
          // The graphics card path can fail on some drivers; the processor
          // always works, only slower. No point retrying a silent video.
          if (device === "dml" && job.message !== "no-audio") {
            partial.set(fileId, [])
            job.message = undefined
            update({ status: "loading", progress: 0 })
            start("cpu")
            return
          }
          partial.delete(fileId)
          update({ status: "error", progress: 0 })
          setTimeout(next, 4000)
          return
        }
        partial.delete(fileId)
        update({ status: "done", progress: 1 })
        options.onDone(fileId)
        setTimeout(next, 1500)
      })
    }
    start("dml")
  }

  return {
    list,
    load,
    job: () => current,
    generate(fileIds) {
      for (const fileId of fileIds) {
        if (!queue.includes(fileId) && current?.fileId !== fileId) {
          queue.push(fileId)
        }
      }
      if (!worker && (!current || current.status === "done" || current.status === "error")) {
        next()
      } else if (current) {
        publish({ ...current, waiting: queue.length })
      }
    },
    cancel() {
      queue.length = 0
      worker?.kill()
      publish(null)
    },
  }
}
