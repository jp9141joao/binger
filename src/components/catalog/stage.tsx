import type { Item } from "@shared/types"
import { Sequence } from "@/components/catalog/sequence"
import {
  coverOf,
  filesOf,
  nextUp,
  seenCount,
  stateOf,
  totalDuration,
} from "@/lib/catalog"
import {
  formatClock,
  formatDuration,
  formatResolution,
  formatSize,
} from "@/lib/format"

/** What the catalog knows about an item, as label and value pairs. */
export function factsOf(item: Item, shelfTitle: string): [string, string][] {
  const files = filesOf(item)
  const file = nextUp(item)
  const facts: [string, string][] = []

  if (item.year) {
    facts.push(["Ano", String(item.year)])
  }
  if (item.kind === "series") {
    facts.push(["Episódios", String(files.length)])
  }
  const duration = formatDuration(totalDuration(item))
  if (duration) {
    facts.push(["Duração", duration])
  }
  facts.push(["Pasta", shelfTitle])
  if (item.kind === "film") {
    const format = [
      file.ext.slice(1).toUpperCase(),
      formatResolution(file.height),
      formatSize(file.size),
    ]
    facts.push(["Arquivo", format.filter(Boolean).join(" · ")])
  }

  const state = stateOf(item)
  if (item.kind === "series") {
    facts.push(["Vistos", `${seenCount(item)} de ${files.length}`])
  } else if (state === "done") {
    facts.push(["Visto", "Sim"])
  } else if (state === "progress" && file.progress) {
    facts.push(["Parou em", formatClock(file.progress.position)])
  }
  return facts
}

export function Facts({ facts }: { facts: [string, string][] }) {
  return (
    <dl data-slot="stage-facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Stage({ item, shelfTitle }: { item: Item; shelfTitle: string }) {
  const cover = coverOf(item)
  return (
    <section data-slot="stage">
      <div data-slot="stage-media">
        {cover ? (
          <img src={cover} alt="" draggable={false} />
        ) : (
          <span data-slot="tile-face">
            <span data-slot="tile-face-title">{item.title}</span>
          </span>
        )}
      </div>
      <div data-slot="stage-body">
        <h1 data-slot="stage-title">{item.title}</h1>
        <Facts facts={factsOf(item, shelfTitle)} />
        {item.kind === "series" && <Sequence item={item} />}
      </div>
    </section>
  )
}
