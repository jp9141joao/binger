// Writes subtitles for a video by listening to it: ffmpeg decodes the audio,
// a Whisper speech model turns it into timed text. Runs as its own process so
// the heavy work never stalls the app. Not bundled; started with fork().
//
// Usage: node transcribe-worker.mjs '<json config>'
//   { ffmpeg, input, output, model, cacheDir, device, threads, language? }

import { spawn } from "node:child_process"
import { writeFile } from "node:fs/promises"
import { env, pipeline, Tensor } from "@huggingface/transformers"

const config = JSON.parse(process.argv[2])
const emit = (message) =>
  process.send ? process.send(message) : console.log(JSON.stringify(message))

const RATE = 16000
/** Audio is handled in stretches this long, cut at a quiet moment. */
const SEGMENT_SECONDS = 300
/** How far back from the end of a stretch to look for that quiet moment. */
const CUT_SEARCH_SECONDS = 6
/** A caption quieter than this is the model inventing words over silence. */
const SILENCE_RMS = 0.004
const MAX_CUE_CHARS = 84
/** Lines Whisper is known to make up when nobody is speaking. */
const INVENTED = [
  /amara\.org/i,
  /legendas? (pela|por|da) comunidade/i,
  /obrigad[oa] por assistir/i,
  /thanks? for watching/i,
  /subtitles? by/i,
  /inscreva-se/i,
  /^\s*(m[uú]sica|music|aplausos|applause)\s*$/i,
]

env.cacheDir = config.cacheDir

function rms(samples, from, to) {
  let sum = 0
  const start = Math.max(0, Math.floor(from))
  const end = Math.min(samples.length, Math.ceil(to))
  for (let i = start; i < end; i++) {
    sum += samples[i] * samples[i]
  }
  return end > start ? Math.sqrt(sum / (end - start)) : 0
}

/** The quietest point near the end of a stretch, so words are not cut in two. */
function quietCut(samples) {
  const windowSize = RATE * 0.3
  const from = Math.max(0, samples.length - RATE * CUT_SEARCH_SECONDS)
  let best = samples.length
  let bestLevel = Infinity
  for (let i = from; i + windowSize <= samples.length; i += windowSize / 2) {
    const level = rms(samples, i, i + windowSize)
    if (level < bestLevel) {
      bestLevel = level
      best = Math.floor(i + windowSize / 2)
    }
  }
  return best
}

/** A pause this long between words starts a new caption. */
const PAUSE_SECONDS = 0.6
const MAX_CUE_SECONDS = 6
const MIN_CUE_SECONDS = 1

/** Groups timed words into captions: by pauses, sentence ends and length. */
function groupWords(words) {
  const cues = []
  let current = null
  const close = () => {
    if (current) {
      cues.push(current)
      current = null
    }
  }
  for (const word of words) {
    if (current) {
      const gap = word.start - current.end
      const tooLong =
        (current.text + word.text).length > MAX_CUE_CHARS ||
        word.end - current.start > MAX_CUE_SECONDS
      const sentenceEnded = /[.?!…]$/.test(current.text) && current.text.length > 24
      if (gap > PAUSE_SECONDS || tooLong || sentenceEnded) {
        close()
      }
    }
    if (current) {
      current.text += word.text
      current.end = word.end
    } else {
      current = { start: word.start, end: word.end, text: word.text.trimStart() }
    }
  }
  close()
  // A caption stays up long enough to read, but never into the next one.
  for (let i = 0; i < cues.length; i++) {
    const next = cues[i + 1]?.start ?? Infinity
    cues[i].end = Math.min(Math.max(cues[i].end, cues[i].start + MIN_CUE_SECONDS), next)
  }
  return cues
}

function vttTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000))
  const pad = (value, size = 2) => String(value).padStart(size, "0")
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`
}

function toVtt(cues) {
  return (
    "WEBVTT\n\n" +
    cues.map((cue) => `${vttTime(cue.start)} --> ${vttTime(cue.end)}\n${cue.text}\n`).join("\n")
  )
}

/** Mono 16 kHz audio from the video, delivered a stretch at a time. */
async function* audioSegments(onDuration) {
  const ffmpeg = spawn(
    config.ffmpeg,
    ["-nostdin", "-v", "info", "-i", config.input, "-vn", "-ac", "1", "-ar", String(RATE), "-f", "f32le", "pipe:1"],
    { stdio: ["ignore", "pipe", "pipe"] }
  )
  let log = ""
  ffmpeg.stderr.on("data", (data) => {
    if (log.length < 20000) {
      log += data
      const match = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(log)
      if (match) {
        onDuration(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]))
      }
    }
  })

  const target = RATE * SEGMENT_SECONDS
  let pending = new Float32Array(0)
  let leftover = Buffer.alloc(0)
  let offset = 0

  const append = (chunk) => {
    const bytes = leftover.length ? Buffer.concat([leftover, chunk]) : chunk
    const usable = bytes.length - (bytes.length % 4)
    leftover = bytes.subarray(usable)
    const incoming = new Float32Array(usable / 4)
    for (let i = 0; i < incoming.length; i++) {
      incoming[i] = bytes.readFloatLE(i * 4)
    }
    const merged = new Float32Array(pending.length + incoming.length)
    merged.set(pending)
    merged.set(incoming, pending.length)
    pending = merged
  }

  for await (const chunk of ffmpeg.stdout) {
    append(chunk)
    while (pending.length >= target) {
      const cut = quietCut(pending.subarray(0, target))
      yield { samples: pending.slice(0, cut), offset }
      offset += cut / RATE
      pending = pending.slice(cut)
    }
  }
  if (pending.length > RATE * 0.5) {
    yield { samples: pending, offset }
  }
  if (offset === 0 && pending.length <= RATE * 0.5) {
    throw new Error(/does not contain any stream|Output file .* does not contain/i.test(log) ? "no-audio" : "decode-failed")
  }
}

/** Asks the model which language is spoken, from the opening of a stretch. */
async function detectLanguage(transcriber, samples) {
  const { model, processor } = transcriber
  const window = samples.subarray(0, RATE * 30)
  const { input_features } = await processor(window)
  const start = BigInt(model.generation_config.decoder_start_token_id)
  const decoder_input_ids = new Tensor("int64", BigInt64Array.from([start]), [1, 1])
  const { logits } = await model({ input_features, decoder_input_ids })
  const scores = logits.data
  let best = null
  let bestScore = -Infinity
  for (const [token, id] of Object.entries(model.generation_config.lang_to_id)) {
    if (scores[id] > bestScore) {
      bestScore = scores[id]
      best = token.replace(/[<|>]/g, "")
    }
  }
  return best
}

async function main() {
  emit({ type: "status", status: "loading" })
  const files = new Map()
  const transcriber = await pipeline("automatic-speech-recognition", config.model, {
    device: config.device,
    dtype: config.dtype,
    session_options: { intraOpNumThreads: config.threads },
    progress_callback: (progress) => {
      if (progress.status === "progress" && progress.total) {
        files.set(progress.file, [progress.loaded, progress.total])
        let loaded = 0
        let total = 0
        for (const [fileLoaded, fileTotal] of files.values()) {
          loaded += fileLoaded
          total += fileTotal
        }
        emit({ type: "download", loaded, total })
      }
    },
  })

  let duration = 0
  let language = config.language ?? null
  const cues = []

  for await (const { samples, offset } of audioSegments((value) => (duration = value))) {
    // Silence at the start says nothing about the language; wait for sound.
    if (!language && rms(samples, 0, RATE * 30) > SILENCE_RMS) {
      language = await detectLanguage(transcriber, samples)
      emit({ type: "language", language })
    }
    emit({ type: "status", status: "transcribing" })

    const result = await transcriber(samples, {
      language: language ?? "pt",
      task: "transcribe",
      return_timestamps: "word",
      chunk_length_s: 30,
      stride_length_s: 5,
    })

    const words = []
    for (const chunk of result.chunks ?? []) {
      const start = chunk.timestamp[0]
      const end = chunk.timestamp[1] ?? start
      if (chunk.text.trim() && start !== null && end >= start) {
        words.push({ start, end, text: chunk.text })
      }
    }
    const fresh = []
    for (const cue of groupWords(words)) {
      const text = cue.text.replace(/\s+/g, " ").trim()
      if (!text || INVENTED.some((pattern) => pattern.test(text))) {
        continue
      }
      if (rms(samples, cue.start * RATE, cue.end * RATE) < SILENCE_RMS) {
        continue
      }
      fresh.push({ start: cue.start + offset, end: cue.end + offset, text })
    }
    cues.push(...fresh)
    const done = offset + samples.length / RATE
    emit({ type: "cues", cues: fresh, done, duration })
  }

  await writeFile(config.output, toVtt(cues))
  emit({ type: "done", cues: cues.length, language })
  // Unloading the model from the graphics card takes several seconds; the
  // work is saved, so leave now rather than keep the app waiting.
  setTimeout(() => process.exit(0), 250)
}

main().catch((error) => {
  emit({ type: "error", message: String(error?.message ?? error) })
  process.exitCode = 1
})
