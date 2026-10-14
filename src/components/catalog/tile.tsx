import * as React from "react"
import { CheckIcon } from "lucide-react"
import type { Item } from "@shared/types"
import { coverOf, progressOf, stateOf, totalDuration } from "@/lib/catalog"
import { formatDuration } from "@/lib/format"

function metaOf(item: Item): string {
  if (item.kind === "series") {
    const count = item.seasons.reduce((sum, season) => sum + season.files.length, 0)
    return `${count} episódios`
  }
  return [item.year, formatDuration(totalDuration(item))].filter(Boolean).join(" · ")
}

/** The shared shell of a tile: image or title card, then name and a line. */
export function TileFrame({
  navId,
  title,
  meta,
  image,
  isDefault,
  state = "idle",
  progress = 0,
  onOpen,
  onFocus,
}: {
  navId: string
  title: string
  meta: string
  image?: string
  /** Where focus lands when the view first opens. */
  isDefault?: boolean
  state?: "done" | "progress" | "new" | "idle"
  progress?: number
  onOpen: () => void
  onFocus?: () => void
}) {
  return (
    <button
      type="button"
      data-slot="tile"
      data-nav
      data-nav-id={navId}
      data-nav-default={isDefault ? "" : undefined}
      data-cover={image ? "image" : "none"}
      data-state={state}
      style={{ "--progress": progress } as React.CSSProperties}
      onClick={onOpen}
      onFocus={onFocus}
      onPointerMove={(event) => {
        // A real pointer move takes focus; a row scrolling under a parked
        // pointer does not.
        if (event.movementX || event.movementY) {
          event.currentTarget.focus({ preventScroll: true })
        }
      }}
    >
      <span data-slot="tile-media">
        {image ? (
          <img src={image} alt="" loading="lazy" decoding="async" draggable={false} />
        ) : (
          <span data-slot="tile-face">
            <span data-slot="tile-face-title">{title}</span>
          </span>
        )}
        {state === "new" && <span data-slot="tile-sticker">Novo</span>}
        {state === "progress" && <span data-slot="tile-progress" />}
      </span>
      <span data-slot="tile-label">
        <span data-slot="tile-title">{title}</span>
        <span data-slot="tile-meta">{meta}</span>
        {state === "done" && (
          <span data-slot="tile-mark">
            <CheckIcon aria-label="Visto" />
          </span>
        )}
      </span>
    </button>
  )
}

export function Tile({
  item,
  navId,
  isDefault,
  onOpen,
  onFocus,
}: {
  item: Item
  navId: string
  isDefault?: boolean
  onOpen: (item: Item) => void
  onFocus: (item: Item, navId: string) => void
}) {
  return (
    <TileFrame
      navId={navId}
      title={item.title}
      meta={metaOf(item)}
      image={coverOf(item)}
      isDefault={isDefault}
      state={stateOf(item)}
      progress={progressOf(item)}
      onOpen={() => onOpen(item)}
      onFocus={() => onFocus(item, navId)}
    />
  )
}
