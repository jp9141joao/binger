// Turns file and folder names into titles, years and episode numbers.

const STRONG_TAG =
  /(?:^|\s)(480p|576p|720p|1080[pi]|2160p|4k|uhd|blu-?ray|b[dr]rip|bdremux|remux|web-?dl|webrip|hdtv|hdrip|dvdrip|dvdscr|x26[45]|h\s?26[45]|hevc|xvid|divx|10bit|aac|e?ac3|dts|truehd|atmos|dublado|legendado|dual\s?[aá]udio|pt-?br)(?=\s|$)/i

const SMALL_WORDS = new Set(
  "a o as os e de da do das dos em no na nos nas um uma com por para the of and in on to for".split(
    " "
  )
)

function normalize(raw: string): string {
  return raw
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function fixCase(title: string): string {
  if (title !== title.toLowerCase() && title !== title.toUpperCase()) {
    return title
  }
  return title
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ")
}

export function cleanTitle(raw: string): { title: string; year?: number } {
  const text = normalize(raw) || raw.trim()
  let cut = text.length
  let year: number | undefined

  // The last year in the name is the release year; an earlier one is usually
  // part of the title ("Blade Runner 2049 2017").
  for (const match of text.matchAll(/\(?\b(19\d{2}|20\d{2})\b\)?/g)) {
    if (match.index > 0) {
      year = Number(match[1])
      cut = match.index
    }
  }

  const tag = STRONG_TAG.exec(text)
  if (tag && tag.index > 0) {
    cut = Math.min(cut, tag.index)
  }

  const title = text
    .slice(0, cut)
    .replace(/[\s\-–—(]+$/, "")
    .trim()

  return { title: fixCase(title || text), year }
}

type EpisodeInfo = {
  season?: number
  episode?: number
  title?: string
  /** The name written before the episode number, when there is one. */
  series?: string
}

const EPISODE_PATTERNS: [RegExp, (match: RegExpExecArray) => EpisodeInfo][] = [
  [
    /\bS(\d{1,2})\s*-?\s*E(\d{1,3})\b/i,
    (m) => ({ season: Number(m[1]), episode: Number(m[2]) }),
  ],
  [
    /\b(\d{1,2})x(\d{2,3})\b/i,
    (m) => ({ season: Number(m[1]), episode: Number(m[2]) }),
  ],
  [
    /\b(?:epis[oó]dio|episode|cap[ií]tulo|aula|parte|part|eps?|cap)\s*[#-]?\s*(\d{1,3})\b/i,
    (m) => ({ episode: Number(m[1]) }),
  ],
  [/\s-\s(\d{1,3})(?:v\d)?(?=\s|$)/, (m) => ({ episode: Number(m[1]) })],
  [/^(\d{1,3})(?=\s|$|[)-])/, (m) => ({ episode: Number(m[1]) })],
  // "Bleach 012": a name that simply ends in its number.
  [/\s(\d{1,3})$/, (m) => ({ episode: Number(m[1]) })],
]

export function parseEpisode(nameWithoutExt: string): EpisodeInfo | null {
  const text = normalize(nameWithoutExt)
  for (const [pattern, read] of EPISODE_PATTERNS) {
    const match = pattern.exec(text)
    if (!match) {
      continue
    }
    const rest = text
      .slice(match.index + match[0].length)
      .replace(/^[\s\-–—:)]+/, "")
    const title = rest ? cleanTitle(rest).title : ""
    const before = text.slice(0, match.index).replace(/[\s\-–—:(]+$/, "")
    return {
      ...read(match),
      title: title || undefined,
      series: before ? cleanTitle(before).title : undefined,
    }
  }
  return null
}

/** True when most files in a folder read as numbered parts of one thing. */
export function isEpisodic(namesWithoutExt: string[]): boolean {
  const total = namesWithoutExt.length
  if (total < 2) {
    return false
  }
  const matched = namesWithoutExt.filter((name) => parseEpisode(name)).length
  if (matched / total >= 0.6) {
    return true
  }
  if (total < 3) {
    return false
  }
  // Fallback: names that only differ in their digits ("Aula 1", "Aula 2").
  const skeletons = new Map<string, number>()
  for (const name of namesWithoutExt) {
    const skeleton = normalize(name).replace(/\d+/g, "#")
    if (skeleton.includes("#")) {
      skeletons.set(skeleton, (skeletons.get(skeleton) ?? 0) + 1)
    }
  }
  return Math.max(0, ...skeletons.values()) / total >= 0.6
}

export function seasonNumber(folderName: string): number | undefined {
  const text = normalize(folderName)
  const match =
    /\b(?:temporada|season|temp|s)\s*(\d{1,2})\b/i.exec(text) ??
    /(\d{1,2})\s*[ªaº]?\s*temporada/i.exec(text)
  return match ? Number(match[1]) : undefined
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" })
}
