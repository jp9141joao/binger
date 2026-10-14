import type { Item, Snapshot, VideoFile } from "@shared/types"

const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000

export type ItemState = "done" | "progress" | "new" | "idle"

export function filesOf(item: Item): VideoFile[] {
  return item.seasons.flatMap((season) => season.files)
}

function started(file: VideoFile): boolean {
  return !!file.progress && !file.progress.done && file.progress.position > 0
}

/** The file to play next: the one in progress, else the first not yet seen. */
export function nextUp(item: Item): VideoFile {
  const files = filesOf(item)
  return (
    files.find(started) ?? files.find((file) => !file.progress?.done) ?? files[0]
  )
}

/**
 * What plays when this file ends: the next video of the same folder. Inside
 * a series that is the next episode; after a loose film, the next loose film
 * on its shelf. A series does not run on into something else.
 */
export function following(
  library: Snapshot,
  item: Item,
  fileId: string
): { item: Item; file: VideoFile } | undefined {
  const files = filesOf(item)
  const index = files.findIndex((file) => file.id === fileId)
  const later = files.slice(index + 1).find((file) => file.playable)
  if (later) {
    return { item, file: later }
  }
  if (item.kind !== "film") {
    return undefined
  }
  const ids = library.shelves.find((shelf) => shelf.id === item.shelfId)?.itemIds ?? []
  const position = ids.indexOf(item.id)
  if (position < 0) {
    return undefined
  }
  for (const id of ids.slice(position + 1)) {
    const candidate = library.items[id]
    const file = candidate?.kind === "film" ? filesOf(candidate)[0] : undefined
    if (candidate && file?.playable) {
      return { item: candidate, file }
    }
  }
  return undefined
}

export function coverOf(item: Item): string | undefined {
  return (
    item.cover ??
    nextUp(item).frame ??
    filesOf(item).find((file) => file.frame)?.frame
  )
}

export function stateOf(item: Item): ItemState {
  const files = filesOf(item)
  if (files.every((file) => file.progress?.done)) {
    return "done"
  }
  if (files.some((file) => file.progress)) {
    return "progress"
  }
  return Date.now() - item.addedAt < NEW_FOR_MS ? "new" : "idle"
}

export function fileState(file: VideoFile): "done" | "progress" | "idle" {
  if (file.progress?.done) {
    return "done"
  }
  return started(file) ? "progress" : "idle"
}

/** Share of the item already watched, 0 to 1. */
export function progressOf(item: Item): number {
  const files = filesOf(item)
  const watched = files.reduce((sum, file) => {
    if (!file.progress) {
      return sum
    }
    return (
      sum +
      (file.progress.done ? 1 : file.progress.position / file.progress.duration)
    )
  }, 0)
  return Math.min(1, watched / files.length)
}

export function seenCount(item: Item): number {
  return filesOf(item).filter((file) => file.progress?.done).length
}

export function totalDuration(item: Item): number | undefined {
  const known = filesOf(item)
    .map((file) => file.duration)
    .filter((duration): duration is number => !!duration)
  return known.length > 0 ? known.reduce((sum, d) => sum + d, 0) : undefined
}

export function lastWatchedAt(item: Item): number {
  return Math.max(0, ...filesOf(item).map((file) => file.progress?.updatedAt ?? 0))
}

/** The episode's own title, when its file name carries more than a number. */
export function ownTitle(file: VideoFile): string | undefined {
  return /^Episódio \d+$/.test(file.title) ? undefined : file.title
}

export function episodeLabel(file: VideoFile): string {
  const season = file.season ? `T${file.season} ` : ""
  return `${season}E${file.episode ?? 1}`
}
