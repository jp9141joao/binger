// Directional focus for a screen driven from the couch: arrow keys move real
// DOM focus to the nearest control in that direction.

export type Direction = "up" | "down" | "left" | "right"

function candidates(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-nav]")].filter(
    (element) =>
      !element.hasAttribute("disabled") && element.getClientRects().length > 0
  )
}

const stillness = window.matchMedia("(prefers-reduced-motion: reduce)")

export function focusElement(element: HTMLElement, smooth = true): void {
  const behavior = smooth && !stillness.matches ? "smooth" : "instant"
  element.focus({ preventScroll: true })

  const shelf = element.closest<HTMLElement>("[data-slot=shelf]")
  const row = element.closest<HTMLElement>("[data-slot=shelf-row]")
  if (!shelf || !row) {
    element.scrollIntoView({ block: "nearest", inline: "nearest", behavior })
    return
  }

  // In the catalog the focused shelf always sits at the top of the list, so
  // the row above never lingers half cut under the stage.
  shelf.parentElement?.scrollTo({ top: shelf.offsetTop, behavior })

  const margin = parseFloat(getComputedStyle(row).scrollPaddingLeft) || 0
  const bounds = row.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  if (rect.left < bounds.left + margin) {
    row.scrollBy({ left: rect.left - bounds.left - margin, behavior })
  } else if (rect.right > bounds.right - margin) {
    row.scrollBy({ left: rect.right - bounds.right + margin, behavior })
  }
}

/** Focuses the control with this id, else the view's default, else the first. */
export function focusFirst(navId?: string): void {
  const all = candidates()
  const target =
    (navId && all.find((element) => element.dataset.navId === navId)) ||
    all.find((element) => element.hasAttribute("data-nav-default")) ||
    all[0]
  if (target) {
    focusElement(target, false)
  }
}

export function moveFocus(direction: Direction): boolean {
  const active = document.activeElement
  const all = candidates()
  if (!(active instanceof HTMLElement) || !all.includes(active)) {
    focusFirst()
    return true
  }

  const from = active.getBoundingClientRect()
  const horizontal = direction === "left" || direction === "right"

  let best: HTMLElement | null = null
  let bestScore = Infinity
  // Vertical moves stay on the nearest row, however far across its items sit.
  const scored: {
    element: HTMLElement
    gap: number
    across: number
    sameColumn: boolean
  }[] = []

  for (const element of all) {
    if (element === active) {
      continue
    }
    const rect = element.getBoundingClientRect()
    const gap =
      direction === "right"
        ? rect.left - from.right
        : direction === "left"
          ? from.left - rect.right
          : direction === "down"
            ? rect.top - from.bottom
            : from.top - rect.bottom
    if (gap < -2) {
      continue
    }
    const overlap = horizontal
      ? Math.min(from.bottom, rect.bottom) - Math.max(from.top, rect.top)
      : Math.min(from.right, rect.right) - Math.max(from.left, rect.left)
    const across = horizontal
      ? Math.abs(rect.top + rect.height / 2 - (from.top + from.height / 2))
      : Math.abs(rect.left + rect.width / 2 - (from.left + from.width / 2))

    if (horizontal) {
      // Sideways moves stay on the row. A control on another row counts only
      // when it is close by; otherwise Left and Right would leap up the page.
      if (overlap <= 0 && across > from.height * 2.5) {
        continue
      }
      const score = overlap > 0 ? gap : gap + across * 4 + 100_000
      if (score < bestScore) {
        bestScore = score
        best = element
      }
    } else {
      scored.push({ element, gap, across, sameColumn: overlap > 0 })
    }
  }

  if (!horizontal) {
    // Up and Down keep to the column they are in when it continues, so a
    // list beside another list never hands focus across by accident.
    const inColumn = scored.filter((entry) => entry.sameColumn)
    const pool = inColumn.length > 0 ? inColumn : scored
    const nearestGap = Math.min(...pool.map((entry) => entry.gap))
    const tolerance = from.height * 0.25
    for (const entry of pool) {
      if (entry.gap <= nearestGap + tolerance && entry.across < bestScore) {
        bestScore = entry.across
        best = entry.element
      }
    }
  }

  if (!best) {
    return false
  }
  focusElement(best)
  return true
}
