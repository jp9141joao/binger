// Builds covers offline: opens each video off-screen, reads its length and
// size, and saves one frame as the cover.

import type { Probe } from "@shared/types"

type Job = { fileId: string; url: string }
type Result = { jpeg: ArrayBuffer | null; probe: Probe }

const MAX_WIDTH = 1280
const TIMEOUT_MS = 20_000
/** Points in the video to try, moving on when a frame is nearly black. */
const OFFSETS = [0.18, 0.4, 0.62]
const DARK_LUMA = 22

const queue: Job[] = []
const requested = new Set<string>()
let running = false
let paused = false

function isDark(source: HTMLCanvasElement): boolean {
  const probe = document.createElement("canvas")
  probe.width = 16
  probe.height = 9
  const context = probe.getContext("2d")
  if (!context) {
    return false
  }
  context.drawImage(source, 0, 0, 16, 9)
  const { data } = context.getImageData(0, 0, 16, 9)
  let luma = 0
  for (let i = 0; i < data.length; i += 4) {
    luma += data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722
  }
  return luma / (data.length / 4) < DARK_LUMA
}

function extract(url: string): Promise<Result> {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    const probe: Probe = {}
    let attempt = 0
    let settled = false

    const finish = (jpeg: ArrayBuffer | null) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      // Releases the decoder.
      video.removeAttribute("src")
      video.load()
      resolve({ jpeg, probe })
    }
    const timer = setTimeout(() => finish(null), TIMEOUT_MS)

    const seek = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      video.currentTime = Math.max(0.1, duration * OFFSETS[attempt])
    }

    video.muted = true
    video.preload = "auto"
    video.crossOrigin = "anonymous"
    video.addEventListener("error", () => finish(null))
    video.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(video.duration)) {
        probe.duration = video.duration
      }
      probe.width = video.videoWidth
      probe.height = video.videoHeight
      if (video.videoWidth === 0) {
        finish(null)
      } else {
        seek()
      }
    })
    video.addEventListener("seeked", () => {
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      const context = canvas.getContext("2d")
      if (!context) {
        finish(null)
        return
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      if (isDark(canvas) && attempt < OFFSETS.length - 1) {
        attempt += 1
        seek()
        return
      }
      canvas.toBlob(
        (blob) => {
          if (blob) {
            void blob.arrayBuffer().then(finish)
          } else {
            finish(null)
          }
        },
        "image/jpeg",
        0.82
      )
    })
    video.src = url
  })
}

async function run(): Promise<void> {
  if (running) {
    return
  }
  running = true
  while (queue.length > 0 && !paused) {
    const job = queue.shift()!
    const result = await extract(job.url).catch(() => ({ jpeg: null, probe: {} }))
    await window.binger.saveFrame(job.fileId, result.jpeg, result.probe)
  }
  running = false
}

export function requestFrames(jobs: Job[]): void {
  for (const job of jobs) {
    if (!requested.has(job.fileId)) {
      requested.add(job.fileId)
      queue.push(job)
    }
  }
  void run()
}

/** Playback takes the decoder; cover building waits for it. */
export function pauseFrames(value: boolean): void {
  paused = value
  if (!paused) {
    void run()
  }
}
