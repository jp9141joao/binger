import * as React from "react"
import {
  CaptionsIcon,
  CheckIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  ImageIcon,
  LibraryIcon,
  PlayIcon,
  RotateCcwIcon,
} from "lucide-react"
import type { Item, VideoFile } from "@shared/types"
import { Sequence } from "@/components/catalog/sequence"
import { factsOf } from "@/components/catalog/stage"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import {
  coverOf,
  episodeLabel,
  fileState,
  filesOf,
  nextUp,
  stateOf,
} from "@/lib/catalog"
import { formatClock, formatDuration } from "@/lib/format"
import { focusFirst } from "@/lib/nav"
import { jobStatus } from "@/lib/subtitles"
import { useSubtitleJob } from "@/state/library"

/** Below this, resuming is not worth offering. */
const RESUME_MIN_SECONDS = 5

function resumePoint(file: VideoFile): number | null {
  const progress = file.progress
  return progress && !progress.done && progress.position > RESUME_MIN_SECONDS
    ? progress.position
    : null
}

function EpisodeRow({
  file,
  onPlay,
  onToggleSeen,
}: {
  file: VideoFile
  onPlay: (file: VideoFile) => void
  onToggleSeen: (file: VideoFile) => void
}) {
  const state = fileState(file)
  return (
    <button
      type="button"
      data-slot="row"
      data-nav
      data-nav-id={file.id}
      data-state={state}
      onClick={() => onPlay(file)}
      onKeyDown={(event) => {
        // V marks this one episode as seen, or takes the mark back.
        if (event.key.toLowerCase() === "v") {
          event.preventDefault()
          onToggleSeen(file)
        }
      }}
    >
      <span data-slot="row-number">{file.episode}</span>
      <span data-slot="row-thumb">
        {file.frame && <img src={file.frame} alt="" loading="lazy" draggable={false} />}
        {state === "progress" && file.progress && (
          <span
            data-slot="tile-progress"
            style={
              {
                "--progress": file.progress.position / file.progress.duration,
              } as React.CSSProperties
            }
          />
        )}
      </span>
      <span data-slot="row-title">{file.title}</span>
      <span data-slot="row-meta">
        {state === "progress" && file.progress
          ? `parou em ${formatClock(file.progress.position)}`
          : formatDuration(file.duration)}
      </span>
      <span
        data-slot="row-mark"
        role="button"
        aria-label={state === "done" ? "Tirar a marca de visto" : "Marcar como visto"}
        title={state === "done" ? "Visto. Clique ou tecle V para desmarcar" : "Marcar como visto (V)"}
        onClick={(event) => {
          // Only this episode: the click must not also start it.
          event.stopPropagation()
          onToggleSeen(file)
        }}
      >
        <CheckIcon aria-hidden="true" />
      </span>
    </button>
  )
}

export function Detail({
  item,
  shelfTitle,
  onPlay,
  onOrganize,
}: {
  item: Item
  shelfTitle: string
  onPlay: (fileId: string, resume: boolean) => void
  onOrganize: (source: string) => void
}) {
  const cover = coverOf(item)
  const file = nextUp(item)
  const resume = resumePoint(file)
  const done = stateOf(item) === "done"
  const isSeries = item.kind === "series"
  const api = window.binger
  const job = useSubtitleJob()
  const playable = filesOf(item).filter((entry) => entry.playable)
  const writing =
    job && job.status !== "done" && playable.some((entry) => entry.id === job.fileId)
      ? job
      : null

  /** Queues every video of this item that has no subtitle of any kind yet. */
  const writeSubtitles = async () => {
    const lists = await Promise.all(playable.map((entry) => api.listSubtitles(entry.id)))
    const missing = playable.filter((_, index) => lists[index].tracks.length === 0)
    if (missing.length === 0) {
      toast.add({
        title: isSeries ? "Todos os episódios já têm legenda" : "Este vídeo já tem legenda",
        timeout: 3000,
      })
      return
    }
    void api.generateSubtitles(missing.map((entry) => entry.id))
  }

  React.useEffect(() => {
    focusFirst()
  }, [item.id])

  const play = (target: VideoFile, wantsResume: boolean) => {
    if (target.playable) {
      onPlay(target.id, wantsResume)
    } else {
      void api.openExternal(target.id)
    }
  }

  const playLabel = isSeries
    ? `${resume ? "Continuar" : "Assistir"} ${episodeLabel(file)}`
    : resume
      ? `Continuar · ${formatClock(resume)}`
      : "Assistir"

  return (
    <div data-slot="detail" data-kind={item.kind}>
      <aside data-slot="detail-side">
        <div data-slot="detail-cover" data-cover={cover ? "image" : "none"}>
          {cover ? (
            <img src={cover} alt="" draggable={false} />
          ) : (
            <span data-slot="tile-face">
              <span data-slot="tile-face-title">{item.title}</span>
            </span>
          )}
        </div>
        <div data-slot="actions">
          <Button variant="outline" data-nav onClick={() => void api.chooseCover(item.id)}>
            <ImageIcon data-icon="inline-start" />
            Trocar capa
          </Button>
          {item.cover && (
            <Button variant="outline" data-nav onClick={() => void api.clearCover(item.id)}>
              <RotateCcwIcon data-icon="inline-start" />
              Capa automática
            </Button>
          )}
          {playable.length > 0 &&
            (writing ? (
              <Button variant="outline" data-nav onClick={() => void api.cancelSubtitles()}>
                <CaptionsIcon data-icon="inline-start" />
                Parar de escrever legendas
              </Button>
            ) : (
              <Button variant="outline" data-nav onClick={() => void writeSubtitles()}>
                <CaptionsIcon data-icon="inline-start" />
                {isSeries ? "Escrever legendas que faltam" : "Escrever legenda"}
              </Button>
            ))}
          {item.catalogId && (
            <Button
              variant="outline"
              data-nav
              onClick={() => onOrganize(`catalog:${item.catalogId}`)}
            >
              <LibraryIcon data-icon="inline-start" />
              Editar catálogo
            </Button>
          )}
          {file.playable && (
            <Button variant="outline" data-nav onClick={() => void api.openExternal(file.id)}>
              <ExternalLinkIcon data-icon="inline-start" />
              Abrir fora do Binger
            </Button>
          )}
          <Button variant="outline" data-nav onClick={() => void api.showInFolder(file.id)}>
            <FolderOpenIcon data-icon="inline-start" />
            Mostrar na pasta
          </Button>
        </div>
        {writing && (
          <p data-slot="detail-status" role="status">
            {jobStatus(writing)}
            {writing.waiting > 0 && ` · mais ${writing.waiting} na fila`}
          </p>
        )}
      </aside>

      <div data-slot="detail-main">
        <h1 data-slot="detail-title">{item.title}</h1>
        <dl data-slot="stage-facts">
          {factsOf(item, shelfTitle).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {!file.playable && (
          <Alert>
            <AlertTitle>
              O Binger ainda não toca arquivos {file.ext.slice(1).toUpperCase()}
            </AlertTitle>
            <AlertDescription>
              Este vídeo abre no player padrão do Windows.
            </AlertDescription>
          </Alert>
        )}

        <div data-slot="actions">
          <Button data-nav data-nav-default onClick={() => play(file, resume !== null)}>
            {file.playable ? (
              <PlayIcon data-icon="inline-start" />
            ) : (
              <ExternalLinkIcon data-icon="inline-start" />
            )}
            {file.playable ? playLabel : "Abrir no player do sistema"}
          </Button>
          {resume !== null && file.playable && (
            <Button variant="secondary" data-nav onClick={() => play(file, false)}>
              Do início
            </Button>
          )}
          <Button
            variant="outline"
            data-nav
            onClick={() => void api.markDone(item.id, !done)}
          >
            <CheckIcon data-icon="inline-start" />
            {isSeries
              ? done
                ? "Desmarcar todos"
                : "Marcar todos como vistos"
              : done
                ? "Marcar como não visto"
                : "Marcar como visto"}
          </Button>
        </div>

        {isSeries && (
          <>
            <Sequence item={item} />
            <div data-slot="episodes">
              {item.seasons.map((season) => (
                <React.Fragment key={season.name}>
                  {season.name && <h2 data-slot="season">{season.name}</h2>}
                  {season.files.map((episode) => (
                    <EpisodeRow
                      key={episode.id}
                      file={episode}
                      onPlay={(target) => play(target, resumePoint(target) !== null)}
                      onToggleSeen={(target) =>
                        void api.markFileDone(target.id, fileState(target) !== "done")
                      }
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
