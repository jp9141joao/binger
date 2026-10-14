import * as React from "react"
import type { Item } from "@shared/types"
import { Legend, Topbar, type Section } from "@/components/shell"
import { toast, useToastManager } from "@/components/ui/toast"
import { episodeLabel, filesOf, following, ownTitle } from "@/lib/catalog"
import { moveFocus, type Direction } from "@/lib/nav"
import { useLibrary } from "@/state/library"
import { Detail } from "@/views/detail"
import { Home } from "@/views/home"
import { Organize } from "@/views/organize"
import { Player, type Media, type UpNext } from "@/views/player"
import { SettingsView } from "@/views/settings"

type View =
  | { name: "home" }
  | { name: "settings" }
  | { name: "organize"; source?: string }
  | { name: "detail"; itemId: string }
  | { name: "player"; itemId: string; fileId: string; resume: boolean }

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
}

const CHOOSE: [string, string][] = [
  ["Setas", "Navegar"],
  ["Enter", "Escolher"],
  ["Esc", "Voltar"],
]

const HINTS: Record<View["name"], [string, string][]> = {
  home: [
    ["Setas", "Navegar"],
    ["Enter", "Abrir"],
    ["F11", "Tela cheia"],
  ],
  detail: [
    ["Setas", "Navegar"],
    ["Enter", "Escolher"],
    ["V", "Marcar episódio como visto"],
    ["Esc", "Voltar"],
  ],
  settings: CHOOSE,
  organize: [
    ["Setas", "Navegar"],
    ["Enter", "Marcar"],
    ["Esc", "Voltar"],
  ],
  player: [],
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

/** Turns a file of the library into something the player can open. */
function mediaFor(item: Item, fileId: string, resume: boolean): Media | null {
  const file = filesOf(item).find((candidate) => candidate.id === fileId)
  if (!file) {
    return null
  }
  const progress = file.progress
  return {
    title:
      item.kind === "series"
        ? [item.title, episodeLabel(file), ownTitle(file)].filter(Boolean).join(" · ")
        : item.title,
    src: `media://f/${file.id}`,
    fileId,
    resumeAt: resume && progress && !progress.done ? progress.position : undefined,
    savedSubtitle: file.subtitle,
  }
}

export function App() {
  const library = useLibrary()
  const [stack, setStack] = React.useState<View[]>([{ name: "home" }])
  const [homeFocus, setHomeFocus] = React.useState<string>()
  // Videos that ended one after another with nobody touching anything.
  const [unattended, setUnattended] = React.useState(0)
  const view = stack[stack.length - 1]

  const back = React.useCallback(() => {
    // Back from a top-level section other than the catalog lands on the catalog.
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : [{ name: "home" }]))
  }, [])

  React.useEffect(() => {
    const root = document.documentElement
    const onKey = (event: KeyboardEvent) => {
      // Keys hide the pointer until the mouse really moves again.
      root.dataset.input = "keys"
      if (view.name === "player" || event.defaultPrevented) {
        return
      }
      const typing = isTyping(event.target)
      const direction = ARROWS[event.key]
      if (direction) {
        if (typing && (direction === "left" || direction === "right")) {
          // Inside a text field the arrows move the caret; they leave it only
          // from its edge.
          const field = event.target as HTMLInputElement
          const atEdge =
            direction === "left"
              ? field.selectionEnd === 0
              : field.selectionStart === field.value.length
          if (!atEdge) {
            return
          }
        }
        moveFocus(direction)
        event.preventDefault()
      } else if (event.key === "Escape" || (event.key === "Backspace" && !typing)) {
        back()
        event.preventDefault()
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (event.movementX || event.movementY) {
        root.dataset.input = "pointer"
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointermove", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointermove", onPointer)
    }
  }, [view.name, back])

  // Dropping folders or videos on the window adds them to the library.
  React.useEffect(() => {
    const onDragOver = (event: DragEvent) => event.preventDefault()
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      const paths = [...(event.dataTransfer?.files ?? [])]
        .map((file) => window.binger.pathForFile(file))
        .filter(Boolean)
      if (paths.length > 0) {
        void window.binger.addPaths(paths)
      }
    }
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("drop", onDrop)
    }
  }, [])

  // A notice belongs to the screen that raised it: leaving the screen closes it.
  const { toasts } = useToastManager()
  const toastsRef = React.useRef(toasts)
  React.useEffect(() => {
    toastsRef.current = toasts
  })
  const place = `${view.name}:${"itemId" in view ? view.itemId : ""}`
  React.useEffect(() => {
    for (const entry of toastsRef.current) {
      toast.close(entry.id)
    }
  }, [place])

  const item = "itemId" in view ? library?.items[view.itemId] : undefined
  const shelfTitle =
    library?.shelves.find((shelf) => shelf.id === item?.shelfId)?.title ?? ""

  // Read once when the player opens: later progress must not restart it.
  const playing = view.name === "player" ? `${view.fileId}:${view.resume}` : ""
  const media = React.useMemo(
    () =>
      view.name === "player" && item ? mediaFor(item, view.fileId, view.resume) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playing]
  )

  if (media && library) {
    const after = item && following(library, item, media.fileId)
    const next: UpNext | undefined = after && {
      heading: after.item.kind === "series" ? "Próximo episódio" : "Próximo vídeo",
      // An episode named only by its number is told apart by its series.
      title:
        after.item.kind === "series"
          ? `${ownTitle(after.file) ? "" : `${after.item.title} · `}${[
              episodeLabel(after.file),
              ownTitle(after.file),
            ]
              .filter(Boolean)
              .join(" · ")}`
          : after.item.title,
      frame: after.file.frame,
    }
    return (
      <Player
        key={media.fileId}
        media={media}
        settings={library.settings}
        itemId={item && item.kind === "series" ? item.id : undefined}
        intro={item ? library.intros[item.id] : undefined}
        next={next}
        unattended={unattended}
        onNext={(count) => {
          if (!after) {
            return
          }
          setUnattended(count)
          // The page underneath follows along, so Esc lands on what is playing.
          setStack((current) => [
            ...current
              .slice(0, -1)
              .map((entry) =>
                entry.name === "detail" ? { ...entry, itemId: after.item.id } : entry
              ),
            { name: "player", itemId: after.item.id, fileId: after.file.id, resume: true },
          ])
        }}
        onExit={back}
      />
    )
  }

  const top = stack[0].name
  const section: Section =
    top === "settings" || top === "organize" ? top : "home"

  return (
    <div data-slot="app">
      <Topbar section={section} onNavigate={(next) => setStack([{ name: next }])} />
      <main data-slot="view">
        {view.name === "detail" && item ? (
          <Detail
            item={item}
            shelfTitle={shelfTitle}
            onPlay={(fileId, resume) => {
              setUnattended(0)
              setStack((current) => [
                ...current,
                { name: "player", itemId: item.id, fileId, resume },
              ])
            }}
            onOrganize={(source) => setStack([{ name: "organize", source }])}
          />
        ) : view.name === "settings" && library ? (
          <SettingsView library={library} />
        ) : view.name === "organize" && library ? (
          <Organize library={library} initialSource={view.source} />
        ) : (
          <Home
            library={library}
            focusId={homeFocus}
            onFocusId={setHomeFocus}
            onOpen={(opened) =>
              setStack((current) => [...current, { name: "detail", itemId: opened.id }])
            }
            onOpenSettings={() => setStack([{ name: "settings" }])}
          />
        )}
      </main>
      <Legend hints={HINTS[view.name]} />
    </div>
  )
}

export default App
