import * as React from "react"
import { FolderOpenIcon } from "lucide-react"
import type { Item, Snapshot } from "@shared/types"
import { Stage } from "@/components/catalog/stage"
import { Tile } from "@/components/catalog/tile"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { lastWatchedAt, stateOf } from "@/lib/catalog"
import { focusFirst } from "@/lib/nav"

type ShelfView = { id: string; title: string; items: Item[] }

function buildShelves(library: Snapshot): ShelfView[] {
  const shelves: ShelfView[] = library.shelves.map((shelf) => ({
    id: shelf.id,
    title: shelf.title,
    items: shelf.itemIds.map((id) => library.items[id]).filter(Boolean),
  }))
  const continuing = Object.values(library.items)
    .filter((item) => stateOf(item) === "progress")
    .sort((a, b) => lastWatchedAt(b) - lastWatchedAt(a))
  if (continuing.length > 0) {
    shelves.unshift({ id: "continue", title: "Continuar assistindo", items: continuing })
  }
  return shelves
}

function Welcome({ onAddFolder }: { onAddFolder: () => void }) {
  return (
    <Empty data-slot="welcome">
      <EmptyHeader>
        <EmptyTitle>Onde ficam os seus vídeos?</EmptyTitle>
        <EmptyDescription>
          Escolha uma pasta do computador. O Binger mostra só o que está nela:
          cada subpasta vira uma prateleira, e episódios numerados viram séries
          que tocam na ordem.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button data-nav data-nav-default onClick={onAddFolder}>
          <FolderOpenIcon data-icon="inline-start" />
          Escolher pasta
        </Button>
        <EmptyDescription>
          Com o mouse, também dá para arrastar uma pasta para esta janela.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  )
}

function NoVideos({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Empty data-slot="welcome">
      <EmptyHeader>
        <EmptyTitle>Nenhum vídeo nas pastas escolhidas</EmptyTitle>
        <EmptyDescription>
          O Binger procura arquivos de vídeo como MP4 e MKV, inclusive dentro
          de subpastas. Confira se a pasta certa está na lista ou se o disco
          está conectado.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button data-nav data-nav-default onClick={onOpenSettings}>
          Ver pastas
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function Loading() {
  return (
    <div data-slot="home" aria-busy="true">
      <div data-slot="stage" />
      <div data-slot="shelves">
        <div data-slot="shelf-row">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} data-slot="tile-skeleton" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Home({
  library,
  focusId,
  onFocusId,
  onOpen,
  onOpenSettings,
}: {
  library: Snapshot | null
  focusId: string | undefined
  onFocusId: (navId: string) => void
  onOpen: (item: Item) => void
  onOpenSettings: () => void
}) {
  const shelves = React.useMemo(() => (library ? buildShelves(library) : []), [library])
  const [stageId, setStageId] = React.useState<string>()
  const ready = shelves.length > 0

  // Lands on the tile the viewer left from, or the first one.
  React.useEffect(() => {
    if (library) {
      focusFirst(focusId)
    }
    // Runs when the view first has something to focus, not on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library === null, ready])

  if (!library) {
    return <Loading />
  }
  if (library.roots.length === 0) {
    return <Welcome onAddFolder={() => void window.binger.addFolder()} />
  }
  if (!ready) {
    return library.scanning ? <Loading /> : <NoVideos onOpenSettings={onOpenSettings} />
  }

  const staged = (stageId && library.items[stageId]) || shelves[0].items[0]
  const stagedShelf = library.shelves.find((shelf) => shelf.id === staged.shelfId)

  return (
    <div data-slot="home">
      <Stage item={staged} shelfTitle={stagedShelf?.title ?? ""} />
      <div data-slot="shelves">
        {shelves.map((shelf, shelfIndex) => (
          <section key={shelf.id} data-slot="shelf">
            <header data-slot="shelf-head">
              <h2 data-slot="shelf-title">{shelf.title}</h2>
              <span data-slot="shelf-count">{shelf.items.length}</span>
            </header>
            <div data-slot="shelf-row">
              {shelf.items.map((item, itemIndex) => (
                <Tile
                  key={item.id}
                  item={item}
                  navId={`${shelf.id}:${item.id}`}
                  isDefault={shelfIndex === 0 && itemIndex === 0}
                  onOpen={onOpen}
                  onFocus={(focused, navId) => {
                    setStageId(focused.id)
                    onFocusId(navId)
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
