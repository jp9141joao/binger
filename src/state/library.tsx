import * as React from "react"
import type { Item, Snapshot, SubtitleJob } from "@shared/types"
import { filesOf, nextUp } from "@/lib/catalog"
import { requestFrames } from "@/lib/frames"

const LibraryContext = React.createContext<Snapshot | null>(null)
const SubtitleJobContext = React.createContext<SubtitleJob | null>(null)

/** Queues cover building: the file each tile shows first, then the rest. */
function queueFrames(snapshot: Snapshot): void {
  const items: Item[] = snapshot.shelves.flatMap((shelf) =>
    shelf.itemIds.map((id) => snapshot.items[id])
  )
  const pending = (item: Item, coverOnly: boolean) =>
    (coverOnly ? [nextUp(item)] : filesOf(item))
      .filter((file) => file.playable && !file.probed)
      .map((file) => ({ fileId: file.id, url: `media://f/${file.id}` }))

  requestFrames(items.flatMap((item) => pending(item, true)))
  requestFrames(items.flatMap((item) => pending(item, false)))
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null)
  const [job, setJob] = React.useState<SubtitleJob | null>(null)

  React.useEffect(() => {
    const receive = (next: Snapshot) => {
      setSnapshot(next)
      queueFrames(next)
    }
    void window.binger.getSnapshot().then(receive)
    void window.binger.getSubtitleJob().then(setJob)
    return window.binger.onEvent((event) => {
      if (event.type === "snapshot") {
        receive(event.snapshot)
      } else if (event.type === "item") {
        setSnapshot(
          (current) =>
            current && {
              ...current,
              items: { ...current.items, [event.item.id]: event.item },
            }
        )
      } else if (event.type === "subtitle-job") {
        setJob(event.job)
      }
    })
  }, [])

  return (
    <LibraryContext value={snapshot}>
      <SubtitleJobContext value={job}>{children}</SubtitleJobContext>
    </LibraryContext>
  )
}

/** The library as last read from disk; null until the first read lands. */
export function useLibrary(): Snapshot | null {
  return React.use(LibraryContext)
}

/** The subtitle being written right now, if any. */
export function useSubtitleJob(): SubtitleJob | null {
  return React.use(SubtitleJobContext)
}
