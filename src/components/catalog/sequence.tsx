import * as React from "react"
import type { Item, VideoFile } from "@shared/types"
import { filesOf, seenCount } from "@/lib/catalog"

/** How much of a file was watched, 0 to 1. */
function seen(file: VideoFile): number {
  const progress = file.progress
  if (!progress) {
    return 0
  }
  return progress.done ? 1 : Math.min(1, progress.position / progress.duration)
}

/**
 * The whole run at a glance: one segment per episode, as long as the episode
 * lasts, filled by how much of it was watched.
 */
export function Sequence({ item }: { item: Item }) {
  const files = filesOf(item)
  return (
    <div
      data-slot="sequence"
      role="img"
      aria-label={`${seenCount(item)} de ${files.length} episódios vistos`}
    >
      {files.map((file) => (
        <span
          key={file.id}
          style={{ "--len": file.duration ?? 1, "--seen": seen(file) } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
