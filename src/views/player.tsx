import * as React from "react"
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PlayIcon } from "lucide-react"
import type { Cue, IntroSkip, Settings, SubtitleTrack } from "@shared/types"
import { Subtitle } from "@/components/subtitle"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { formatClock } from "@/lib/format"
import { pauseFrames } from "@/lib/frames"
import { focusFirst, moveFocus } from "@/lib/nav"
import {
  jobStatus,
  pickTrack,
  SUBTITLE_SIZES,
  SUBTITLE_STYLES,
  trackSource,
} from "@/lib/subtitles"
import { useSubtitleJob } from "@/state/library"

const SEEK_SECONDS = 10
const SAVE_EVERY_SECONDS = 5
const CONTROLS_HIDE_MS = 3000
/** How long to play before deciding the file has no audio we can decode. */
const AUDIO_CHECK_SECONDS = 4
/** How long the next video waits on screen before it starts by itself. */
const COUNTDOWN_SECONDS = 10
/**
 * The credits are taken to start this long before the end, or at the last
 * fifth of a short video. The file carries no marker, so this is a guess.
 */
const CREDITS_SECONDS = 120
const CREDITS_SHARE = 0.2
/** Videos that may end in a row, untouched, before the player asks if anyone is there. */
const UNATTENDED_LIMIT = 3

type ChromiumVideo = HTMLVideoElement & { webkitAudioDecodedByteCount?: number }
type PanelRow = { id: string; label: string; detail?: string; checked?: boolean }

function cycle<T extends { id: string }>(options: T[], current: string): T {
  const index = options.findIndex((option) => option.id === current)
  return options[(index + 1) % options.length]
}

/** One video of the library, ready to play. */
export type Media = {
  title: string
  src: string
  fileId: string
  /** Where to pick up, when the viewer chose to continue. */
  resumeAt?: number
  savedSubtitle?: string
}

/** The video that follows this one in its folder. */
export type UpNext = { heading: string; title: string; frame?: string }

function KeyButton({
  press,
  onPress,
  children,
}: {
  press: string
  onPress: (key: string) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      data-slot="player-key"
      // Focus stays off it, or Space would press it a second time.
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPress(press)}
    >
      {children}
    </button>
  )
}

export function Player({
  media,
  settings,
  itemId,
  intro: savedIntro,
  next,
  unattended,
  onNext,
  onExit,
}: {
  media: Media
  settings: Settings
  /** Set for episodes of a series: the one that owns the intro setting. */
  itemId?: string
  intro?: IntroSkip
  next?: UpNext
  /** Videos that ended in a row before this one with nobody touching anything. */
  unattended: number
  /** Moves on to the next video, handing back the count to carry forward. */
  onNext: (unattended: number) => void
  onExit: () => void
}) {
  const api = window.binger
  const { fileId, title } = media
  const job = useSubtitleJob()
  const writing =
    job?.fileId === fileId && job.status !== "done" && job.status !== "error" ? job : null
  const written = job?.fileId === fileId && job.status === "done"

  const videoRef = React.useRef<ChromiumVideo>(null)
  const lastSaved = React.useRef(0)
  const hideTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const [time, setTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  const [controls, setControls] = React.useState(true)
  const [silent, setSilent] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  const [tracks, setTracks] = React.useState<SubtitleTrack[]>([])
  const [pictureTracks, setPictureTracks] = React.useState(0)
  const [trackId, setTrackId] = React.useState("off")
  const [cues, setCues] = React.useState<Cue[]>([])
  const [caption, setCaption] = React.useState("")
  const [panel, setPanel] = React.useState(false)
  const [rowIndex, setRowIndex] = React.useState(0)

  // The intro of this series. Edits show at once; the store catches up.
  const [intro, setIntroState] = React.useState<IntroSkip>(
    savedIntro ?? { enabled: false, start: 0, end: 0 }
  )
  const [introPanel, setIntroPanel] = React.useState(false)
  const [introRow, setIntroRow] = React.useState(0)
  // The intro is skipped once per video, so rewinding into it is allowed.
  const skipped = React.useRef(false)
  const [skipNote, setSkipNote] = React.useState(false)

  const changeIntro = (change: Partial<IntroSkip>) => {
    const updated = { ...intro, ...change }
    setIntroState(updated)
    if (itemId) {
      void api.setIntro(itemId, updated)
    }
  }

  // Whether the viewer pressed or moved anything while this video was up.
  const touched = React.useRef(false)
  const [ending, setEnding] = React.useState<"countdown" | "ask" | null>(null)
  const [remaining, setRemaining] = React.useState(COUNTDOWN_SECONDS)
  const [countdown, setCountdown] = React.useState(COUNTDOWN_SECONDS)
  // True once the picture itself is over; before that the credits still play.
  const [finished, setFinished] = React.useState(false)
  // The viewer chose to watch the credits: only the real end brings the card back.
  const dismissed = React.useRef(false)

  // Read once per video: the choice saved for it, and the viewer's default.
  const opening = React.useRef({ saved: media.savedSubtitle, enabled: settings.subtitles })

  const save = React.useCallback(() => {
    const video = videoRef.current
    if (video && video.duration > 0) {
      void api.saveProgress(fileId, video.currentTime, video.duration)
    }
  }, [api, fileId])

  const wake = React.useCallback(() => {
    setControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControls(false), CONTROLS_HIDE_MS)
  }, [])

  React.useEffect(() => {
    pauseFrames(true)
    hideTimer.current = setTimeout(() => setControls(false), CONTROLS_HIDE_MS)
    return () => {
      pauseFrames(false)
      clearTimeout(hideTimer.current)
    }
  }, [])

  // Which subtitles exist for this video, and which one to start with. Runs
  // again when one finishes being written, so it joins the list.
  React.useEffect(() => {
    let current = true
    void api.listSubtitles(fileId).then((list) => {
      if (!current) {
        return
      }
      setTracks(list.tracks)
      setPictureTracks(list.pictureTracks)
      if (!written) {
        const { saved, enabled } = opening.current
        setTrackId(pickTrack(list.tracks, saved, enabled))
      }
    })
    return () => {
      current = false
    }
  }, [api, fileId, written])

  React.useEffect(() => {
    let current = true
    const load = trackId === "off" ? Promise.resolve([]) : api.loadSubtitle(fileId, trackId)
    void load.then((loaded) => {
      if (current) {
        setCues(loaded)
      }
    })
    return () => {
      current = false
    }
  }, [api, fileId, trackId])

  // A subtitle being written arrives a stretch at a time.
  const showingAuto = trackId === "auto"
  React.useEffect(
    () =>
      api.onEvent((event) => {
        if (event.type !== "subtitle-cues" || event.fileId !== fileId) {
          return
        }
        setTracks((list) =>
          list.some((track) => track.id === "auto")
            ? list
            : [...list, { id: "auto", kind: "auto", label: "Gerada pelo Binger" }]
        )
        if (showingAuto) {
          setCues((existing) => [...existing, ...event.cues])
        }
      }),
    [api, fileId, showingAuto]
  )

  // The caption follows the picture frame by frame, not the slower time event.
  React.useEffect(() => {
    let frame = 0
    const tick = () => {
      const now = videoRef.current?.currentTime ?? 0
      let text = ""
      for (const cue of cues) {
        if (cue.start > now) {
          break
        }
        if (cue.end > now) {
          text = text ? `${text}\n${cue.text}` : cue.text
        }
      }
      setCaption(text)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [cues])

  const style = SUBTITLE_STYLES.find((entry) => entry.id === settings.subtitleStyle)!
  const size = SUBTITLE_SIZES.find((entry) => entry.id === settings.subtitleSize)!
  const rows: PanelRow[] = [
    { id: "off", label: "Desligada", checked: trackId === "off" },
    ...tracks.map((track) => ({
      id: track.id,
      label: track.label,
      detail: trackSource(track),
      checked: trackId === track.id,
    })),
  ]
  if (writing) {
    rows.push({ id: "cancel", label: jobStatus(writing), detail: "Enter cancela" })
  } else if (!tracks.some((track) => track.id === "auto")) {
    rows.push({
      id: "generate",
      label: "Escrever legenda ouvindo o vídeo",
      detail:
        job?.fileId === fileId && job.status === "error"
          ? jobStatus(job)
          : "Leva alguns minutos; a legenda aparece conforme fica pronta",
    })
  }
  rows.push(
    { id: "style", label: `Estilo: ${style.name}`, detail: "Enter troca" },
    { id: "size", label: `Tamanho: ${size.name}`, detail: "Enter troca" }
  )
  const activeRow = Math.min(rowIndex, rows.length - 1)

  const activate = (row: PanelRow) => {
    if (row.id === "style") {
      void api.setSettings({ subtitleStyle: cycle(SUBTITLE_STYLES, style.id).id })
    } else if (row.id === "size") {
      void api.setSettings({ subtitleSize: cycle(SUBTITLE_SIZES, size.id).id })
    } else if (row.id === "generate") {
      void api.generateSubtitles([fileId])
      void api.chooseSubtitle(fileId, "auto")
      setCues([])
      setTrackId("auto")
      void api.setSettings({ subtitles: true })
    } else if (row.id === "cancel") {
      void api.cancelSubtitles()
    } else {
      setTrackId(row.id)
      void api.chooseSubtitle(fileId, row.id)
      // The choice carries on to the next videos: off stays off, on stays on.
      void api.setSettings({ subtitles: row.id !== "off" })
    }
  }

  const introRows: { id: "enabled" | "start" | "end"; label: string; detail: string }[] = [
    {
      id: "enabled",
      label: `Pular intro: ${intro.enabled ? "ligado" : "desligado"}`,
      detail:
        intro.end > intro.start
          ? "Enter liga ou desliga. Vale para todos os episódios desta série."
          : "Defina o início e o fim abaixo para ela poder pular.",
    },
    {
      id: "start",
      label: `Começa em ${formatClock(intro.start)}`,
      detail: "Setas ajustam 1 s. Enter usa o ponto onde o vídeo está.",
    },
    {
      id: "end",
      label: `Termina em ${formatClock(intro.end)}`,
      detail: "Setas ajustam 1 s. Enter usa o ponto onde o vídeo está.",
    },
  ]

  /** Changes a row of the intro panel; a step moves the time one second. */
  const adjustIntro = (id: "enabled" | "start" | "end", step: number) => {
    const video = videoRef.current
    if (id === "enabled") {
      changeIntro({ enabled: !intro.enabled })
    } else if (step === 0) {
      changeIntro({ [id]: Math.floor(video?.currentTime ?? 0) })
    } else {
      changeIntro({ [id]: Math.max(0, intro[id] + step) })
    }
  }

  const advance = () => onNext(touched.current ? 0 : unattended + 1)

  /** Puts the next-video card up, counting down what is left of the video up to 10 s. */
  const begin = (left: number) => {
    const length = Math.max(1, Math.min(COUNTDOWN_SECONDS, Math.ceil(left)))
    setCountdown(length)
    setRemaining(length)
    setPanel(false)
    setEnding(!touched.current && unattended + 1 >= UNATTENDED_LIMIT ? "ask" : "countdown")
  }

  /** Where on the bar the pointer is, as a point in the video. */
  const seekTo = (event: React.PointerEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !(video.duration > 0)) {
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const share = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    video.currentTime = share * video.duration
    setTime(video.currentTime)
  }

  const onKey = (event: KeyboardEvent) => {
    touched.current = true
    const video = videoRef.current
    if (!video) {
      return
    }
    const key = event.key
    if (ending) {
      if (key === "Escape" || key === "Backspace") {
        onExit()
      } else if (key === "ArrowLeft" || key === "ArrowRight") {
        moveFocus(key === "ArrowLeft" ? "left" : "right")
      } else if (
        (key === "Enter" || key === " ") &&
        !(document.activeElement instanceof HTMLButtonElement)
      ) {
        // Focus was lost to a click on the picture: Enter still means go on.
        advance()
      } else {
        // Enter and Space press the button in focus.
        return
      }
      event.preventDefault()
      return
    }
    if (introPanel) {
      const row = introRows[introRow]
      if (key === "ArrowDown") {
        setIntroRow(Math.min(introRows.length - 1, introRow + 1))
      } else if (key === "ArrowUp") {
        setIntroRow(Math.max(0, introRow - 1))
      } else if ((key === "ArrowLeft" || key === "ArrowRight") && row.id !== "enabled") {
        adjustIntro(row.id, key === "ArrowLeft" ? -1 : 1)
      } else if (key === "Enter") {
        adjustIntro(row.id, 0)
      } else if (key === "Escape" || key === "Backspace" || key.toLowerCase() === "i") {
        setIntroPanel(false)
      } else {
        return
      }
    } else if (panel) {
      if (key === "ArrowDown") {
        setRowIndex(Math.min(rows.length - 1, activeRow + 1))
      } else if (key === "ArrowUp") {
        setRowIndex(Math.max(0, activeRow - 1))
      } else if (key === "Enter") {
        activate(rows[activeRow])
      } else if (key === "Escape" || key === "Backspace" || key.toLowerCase() === "l") {
        setPanel(false)
      } else {
        return
      }
    } else if (key === "Escape" || key === "Backspace") {
      save()
      onExit()
    } else if (key === " " || key === "Enter" || key === "k") {
      if (video.paused) {
        void video.play()
      } else {
        video.pause()
      }
    } else if (key === "ArrowRight") {
      video.currentTime = Math.min(video.duration, video.currentTime + SEEK_SECONDS)
    } else if (key === "ArrowLeft") {
      video.currentTime = Math.max(0, video.currentTime - SEEK_SECONDS)
    } else if (key.toLowerCase() === "l") {
      setRowIndex(Math.max(0, rows.findIndex((row) => row.checked)))
      setPanel(true)
    } else if (key.toLowerCase() === "i" && itemId) {
      setIntroRow(0)
      setIntroPanel(true)
    } else if (key.toLowerCase() === "o") {
      video.pause()
      void api.openExternal(fileId)
    } else if (key.toLowerCase() === "f") {
      void api.toggleFullscreen()
    } else if (key.toLowerCase() === "n" && next) {
      save()
      advance()
    } else {
      return
    }
    event.preventDefault()
    wake()
  }
  // The listener is attached once; it always calls the handler of this render.
  const onKeyRef = React.useRef(onKey)
  const advanceRef = React.useRef(advance)
  React.useEffect(() => {
    onKeyRef.current = onKey
    advanceRef.current = advance
  })
  React.useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyRef.current(event)
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [])

  /** A control on screen: clicking it does what its key does. */
  const press = React.useCallback((key: string) => {
    onKeyRef.current(new KeyboardEvent("keydown", { key, cancelable: true }))
  }, [])

  // The next video starts by itself once the count runs out.
  React.useEffect(() => {
    if (ending !== "countdown") {
      return
    }
    const timer = setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1)
      } else {
        advanceRef.current()
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [ending, remaining])

  React.useEffect(() => {
    if (ending) {
      focusFirst()
    }
  }, [ending])

  return (
    <div
      data-slot="player"
      data-controls={controls || !playing || failed || panel || introPanel || !!ending}
      onPointerMove={(event) => {
        if (event.movementX || event.movementY) {
          touched.current = true
          wake()
        }
      }}
    >
      <video
        ref={videoRef}
        src={media.src}
        autoPlay
        onLoadedMetadata={(event) => {
          const video = event.currentTarget
          setDuration(video.duration)
          if (media.resumeAt) {
            video.currentTime = media.resumeAt
          }
        }}
        onTimeUpdate={(event) => {
          const video: ChromiumVideo = event.currentTarget
          setTime(video.currentTime)
          if (Math.abs(video.currentTime - lastSaved.current) >= SAVE_EVERY_SECONDS) {
            lastSaved.current = video.currentTime
            save()
          }
          if (
            !silent &&
            video.currentTime > AUDIO_CHECK_SECONDS &&
            video.webkitAudioDecodedByteCount === 0
          ) {
            setSilent(true)
          }
          // The opening of a series is skipped, once, when the setting is on.
          if (
            intro.enabled &&
            !introPanel &&
            !skipped.current &&
            intro.end > intro.start &&
            video.currentTime >= intro.start &&
            video.currentTime < intro.end - 0.5
          ) {
            skipped.current = true
            video.currentTime = intro.end
            setSkipNote(true)
            setTimeout(() => setSkipNote(false), 2500)
          }
          // The credits roll: the count to the next video starts now.
          if (next && !ending && !dismissed.current && video.duration > 0) {
            const left = video.duration - video.currentTime
            if (left <= Math.min(CREDITS_SECONDS, video.duration * CREDITS_SHARE)) {
              begin(left)
            }
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false)
          save()
        }}
        onEnded={() => {
          save()
          if (!next) {
            onExit()
            return
          }
          setFinished(true)
          if (ending === "countdown") {
            advance()
          } else if (!ending) {
            begin(COUNTDOWN_SECONDS)
          }
        }}
        onError={() => setFailed(true)}
        onDoubleClick={() => void api.toggleFullscreen()}
        onClick={(event) => {
          const video = event.currentTarget
          if (ending) {
            return
          }
          if (video.paused) {
            void video.play()
          } else {
            video.pause()
          }
        }}
      />

      {!ending && (
        <Subtitle text={caption} style={settings.subtitleStyle} size={settings.subtitleSize} />
      )}

      {ending && next && (
        <div
          data-slot="player-next"
          data-over={finished}
          role="dialog"
          aria-labelledby="player-next-heading"
        >
          <div data-slot="player-next-thumb">
            {next.frame && <img src={next.frame} alt="" draggable={false} />}
            {ending === "countdown" && (
              <span
                data-slot="player-next-timer"
                style={{ animationDuration: `${countdown}s` }}
              />
            )}
          </div>
          <div data-slot="player-next-body">
            <h2 id="player-next-heading">
              {ending === "ask"
                ? "Você ainda está assistindo?"
                : `${next.heading} em ${remaining} s`}
            </h2>
            <p>{ending === "ask" ? `A seguir: ${next.title}` : next.title}</p>
            <div data-slot="actions">
              <Button data-nav data-nav-default onClick={advance}>
                <PlayIcon data-icon="inline-start" />
                {ending === "ask" ? "Continuar assistindo" : "Assistir agora"}
              </Button>
              {!finished && (
                <Button
                  variant="outline"
                  data-nav
                  onClick={() => {
                    dismissed.current = true
                    setEnding(null)
                  }}
                >
                  Ver créditos
                </Button>
              )}
              <Button variant="outline" data-nav onClick={onExit}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {failed && (
        <div data-slot="player-note" role="alert">
          <strong>O Binger não conseguiu tocar este vídeo.</strong>
          <span>
            O arquivo pode estar danificado ou usar um formato que o Binger
            ainda não toca. <Kbd>O</Kbd> abre no player do sistema,{" "}
            <Kbd>Esc</Kbd> volta.
          </span>
        </div>
      )}
      {silent && !failed && !ending && (
        <div data-slot="player-note" role="status">
          <strong>Sem som?</strong>
          <span>
            Este arquivo usa um formato de áudio que o Binger ainda não toca.{" "}
            <Kbd>O</Kbd> abre no player do sistema.
          </span>
        </div>
      )}

      {skipNote && !ending && (
        <div data-slot="player-note" role="status">
          <strong>Intro pulada</strong>
        </div>
      )}

      {introPanel && (
        <div data-slot="player-panel" role="menu" aria-label="Pular intro">
          <h2>Pular intro</h2>
          {introRows.map((row, index) => (
            <button
              key={row.id}
              type="button"
              role="menuitem"
              data-slot="panel-row"
              data-active={index === introRow}
              onClick={() => {
                setIntroRow(index)
                adjustIntro(row.id, 0)
              }}
            >
              <span data-slot="panel-mark">
                {row.id === "enabled" && intro.enabled && <CheckIcon />}
              </span>
              <span data-slot="panel-label">{row.label}</span>
              <span data-slot="panel-detail">{row.detail}</span>
            </button>
          ))}
          <p>
            Ache o começo da intro, abra este painel e marque o início; vá até o
            fim dela e marque o fim. Depois ligue.
          </p>
        </div>
      )}

      {panel && (
        <div data-slot="player-panel" role="menu" aria-label="Legendas">
          <h2>Legendas</h2>
          {rows.map((row, index) => (
            <button
              key={row.id}
              type="button"
              role="menuitemradio"
              aria-checked={!!row.checked}
              data-slot="panel-row"
              data-active={index === activeRow}
              onClick={() => {
                setRowIndex(index)
                activate(row)
              }}
            >
              <span data-slot="panel-mark">{row.checked && <CheckIcon />}</span>
              <span data-slot="panel-label">{row.label}</span>
              {row.detail && <span data-slot="panel-detail">{row.detail}</span>}
            </button>
          ))}
          {pictureTracks > 0 && (
            <p>
              Este vídeo também traz legenda guardada como imagem, que o Binger
              ainda não mostra.
            </p>
          )}
        </div>
      )}

      <div data-slot="player-bar" hidden={!!ending}>
        <p data-slot="player-title">{title}</p>
        <div
          data-slot="player-track"
          role="progressbar"
          aria-label="Posição no vídeo. Clique para ir a outro ponto."
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          onPointerDown={(event) => {
            touched.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            seekTo(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              seekTo(event)
            }
          }}
        >
          <span style={{ width: `${duration > 0 ? (time / duration) * 100 : 0}%` }} />
        </div>
        <div data-slot="player-meta">
          <span>
            {formatClock(time)} / {formatClock(duration)}
          </span>
          {writing && <span>{jobStatus(writing)}</span>}
          <KeyButton press="Enter" onPress={press}>
            <Kbd>Espaço</Kbd> {playing ? "Pausar" : "Tocar"}
          </KeyButton>
          <KeyButton press="ArrowLeft" onPress={press}>
            <Kbd>
              <ArrowLeftIcon aria-hidden="true" />
            </Kbd>{" "}
            Voltar 10 s
          </KeyButton>
          <KeyButton press="ArrowRight" onPress={press}>
            <Kbd>
              <ArrowRightIcon aria-hidden="true" />
            </Kbd>{" "}
            Avançar 10 s
          </KeyButton>
          <KeyButton press="l" onPress={press}>
            <Kbd>L</Kbd> Legendas
          </KeyButton>
          <KeyButton press="f" onPress={press}>
            <Kbd>F</Kbd> Tela cheia
          </KeyButton>
          {itemId && (
            <KeyButton press="i" onPress={press}>
              <Kbd>I</Kbd> Intro
            </KeyButton>
          )}
          {next && (
            <KeyButton press="n" onPress={press}>
              <Kbd>N</Kbd> Próximo
            </KeyButton>
          )}
          <KeyButton press="Escape" onPress={press}>
            <Kbd>Esc</Kbd> Voltar
          </KeyButton>
        </div>
      </div>
    </div>
  )
}
