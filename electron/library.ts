// Reads the user's folders and turns them into shelves, films and series.
// The folder is the source of truth: a folder of unrelated videos becomes a
// shelf, a run of numbered parts becomes a series that plays in order.

import { createHash } from "node:crypto"
import { readdir, stat } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import type { Catalog, Root } from "../shared/types.ts"
import {
  cleanTitle,
  isEpisodic,
  naturalCompare,
  parseEpisode,
  seasonNumber,
} from "./names.ts"

/** Containers Chromium can open; the rest go to the system player. */
const PLAYABLE = new Set([".mp4", ".m4v", ".mov", ".webm", ".mkv", ".ogv", ".3gp"])
const VIDEO = new Set([
  ...PLAYABLE,
  ".avi",
  ".wmv",
  ".flv",
  ".mpg",
  ".mpeg",
  ".ts",
  ".m2ts",
  ".vob",
  ".rmvb",
])
const SKIPPED_FOLDER = /^(\.|\$)|^(system volume information|node_modules|samples?)$/i
const MAX_DEPTH = 8
const SAMPLE_MAX_BYTES = 150 * 1024 * 1024
export const CATALOG_SHELF = "catalogs"

export type RawFile = {
  id: string
  path: string
  name: string
  title: string
  ext: string
  size: number
  mtimeMs: number
  playable: boolean
  season?: number
  episode?: number
}

type RawSeason = { name: string; files: RawFile[] }

export type RawItem = {
  id: string
  kind: "film" | "series"
  title: string
  year?: number
  shelfId: string
  addedAt: number
  catalogId?: string
  seasons: RawSeason[]
}

export type RawShelf = { id: string; title: string; itemIds: string[] }

export type Scan = {
  roots: Root[]
  shelves: RawShelf[]
  items: Map<string, RawItem>
  /** File id to absolute path; the renderer only ever sees ids. */
  filePaths: Map<string, string>
  fileItem: Map<string, string>
}

type Dir = { path: string; name: string; videos: RawFile[]; dirs: Dir[]; total: number }
type Group = { title: string; files: RawFile[] }

export function idFor(path: string): string {
  return createHash("sha1").update(path.toLowerCase()).digest("hex").slice(0, 16)
}

export function stem(name: string): string {
  return name.slice(0, name.length - extname(name).length)
}

async function readVideo(path: string): Promise<RawFile | null> {
  const ext = extname(path).toLowerCase()
  if (!VIDEO.has(ext)) {
    return null
  }
  const info = await stat(path).catch(() => null)
  if (!info?.isFile()) {
    return null
  }
  const name = basename(path)
  if (/\bsample\b/i.test(name) && info.size < SAMPLE_MAX_BYTES) {
    return null
  }
  return {
    id: idFor(path),
    path,
    name,
    title: cleanTitle(stem(name)).title,
    ext,
    size: info.size,
    mtimeMs: info.mtimeMs,
    playable: PLAYABLE.has(ext),
  }
}

async function readDir(path: string, depth: number): Promise<Dir> {
  const dir: Dir = { path, name: basename(path) || path, videos: [], dirs: [], total: 0 }
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) {
      if (depth < MAX_DEPTH && !SKIPPED_FOLDER.test(entry.name)) {
        const child = await readDir(full, depth + 1)
        if (child.total > 0) {
          dir.dirs.push(child)
        }
      }
    } else if (entry.isFile()) {
      const video = await readVideo(full)
      if (video) {
        dir.videos.push(video)
      }
    }
  }
  dir.videos.sort((a, b) => naturalCompare(a.name, b.name))
  dir.dirs.sort((a, b) => naturalCompare(a.name, b.name))
  dir.total = dir.videos.length + dir.dirs.reduce((sum, child) => sum + child.total, 0)
  return dir
}

/**
 * Sorts a folder's videos by the series name in each filename. A name shared
 * by two or more numbered files is a series; everything else is left over.
 */
function splitBySeries(videos: RawFile[]): { groups: Group[]; rest: RawFile[] } {
  const named = new Map<string, Group>()
  const rest: RawFile[] = []
  for (const video of videos) {
    const series = parseEpisode(stem(video.name))?.series
    if (!series) {
      rest.push(video)
      continue
    }
    const key = series.toLowerCase()
    const group = named.get(key) ?? { title: series, files: [] }
    group.files.push(video)
    named.set(key, group)
  }
  const groups: Group[] = []
  for (const group of named.values()) {
    if (group.files.length >= 2) {
      groups.push(group)
    } else {
      rest.push(...group.files)
    }
  }
  rest.sort((a, b) => naturalCompare(a.name, b.name))
  return { groups, rest }
}

/** A folder holding exactly one run of episodes, named or just numbered. */
function isOneSeries(dir: Dir): boolean {
  const { groups, rest } = splitBySeries(dir.videos)
  if (groups.length === 1 && rest.length === 0) {
    return true
  }
  return groups.length === 0 && isEpisodic(dir.videos.map((video) => stem(video.name)))
}

function firstVideo(dir: Dir): RawFile {
  return dir.videos[0] ?? firstVideo(dir.dirs[0])
}

/** A folder whose videos all live in one-series folders: its seasons. */
function isSeasonsFolder(dir: Dir): boolean {
  return (
    dir.videos.length === 0 &&
    dir.dirs.every((child) => isOneSeries(child) && child.dirs.length === 0)
  )
}

function asSeason(videos: RawFile[], name: string, folderName: string): RawSeason {
  const folderSeason = seasonNumber(folderName)
  const files = videos.map((video, index) => {
    const parsed = parseEpisode(stem(video.name))
    const episode = parsed?.episode ?? index + 1
    return {
      ...video,
      season: parsed?.season ?? folderSeason,
      episode,
      title: parsed?.title ?? `Episódio ${episode}`,
    }
  })
  files.sort(
    (a, b) =>
      (a.season ?? 0) - (b.season ?? 0) ||
      a.episode - b.episode ||
      naturalCompare(a.name, b.name)
  )
  return { name, files }
}

function addedAt(files: RawFile[]): number {
  return Math.max(...files.map((file) => file.mtimeMs))
}

function register(scan: Scan, shelf: RawShelf, item: RawItem): void {
  scan.items.set(item.id, item)
  shelf.itemIds.push(item.id)
  for (const season of item.seasons) {
    for (const file of season.files) {
      scan.filePaths.set(file.id, file.path)
      scan.fileItem.set(file.id, item.id)
    }
  }
}

function collect(dir: Dir, scan: Scan): void {
  const shelf: RawShelf = { id: idFor(`shelf:${dir.path}`), title: dir.name, itemIds: [] }
  scan.shelves.push(shelf)
  const add = (item: RawItem) => register(scan, shelf, item)

  const film = (file: RawFile, name: string): RawItem => ({
    id: file.id,
    kind: "film",
    ...cleanTitle(name),
    shelfId: shelf.id,
    addedAt: file.mtimeMs,
    seasons: [{ name: "", files: [file] }],
  })

  const series = (id: string, name: string, seasons: RawSeason[]): RawItem => ({
    id,
    kind: "series",
    ...cleanTitle(name),
    shelfId: shelf.id,
    addedAt: addedAt(seasons.flatMap((season) => season.files)),
    seasons,
  })

  /** A folder that is one series, with any sub-folders as further seasons. */
  const folderSeries = (source: Dir): RawItem => {
    const seasons = [asSeason(source.videos, "", source.name)]
    for (const child of source.dirs) {
      if (child.videos.length > 0) {
        seasons.push(asSeason(child.videos, child.name, child.name))
      }
    }
    return series(idFor(source.path), source.name, seasons)
  }

  if (isOneSeries(dir)) {
    // The chosen folder is itself one run of episodes.
    add(folderSeries(dir))
    return
  }

  // Several series can share a folder; their filenames tell them apart.
  const { groups, rest } = splitBySeries(dir.videos)
  for (const group of groups) {
    const id = idFor(`${dir.path}::${group.title.toLowerCase()}`)
    add(series(id, group.title, [asSeason(group.files, "", "")]))
  }
  for (const video of rest) {
    add(film(video, stem(video.name)))
  }

  for (const child of dir.dirs) {
    if (child.total === 1) {
      add(film(firstVideo(child), child.name))
    } else if (isOneSeries(child)) {
      add(folderSeries(child))
    } else if (isSeasonsFolder(child)) {
      const seasons = child.dirs.map((season) =>
        asSeason(season.videos, season.name, season.name)
      )
      add(series(idFor(child.path), child.name, seasons))
    } else {
      collect(child, scan)
    }
  }
}

/**
 * Moves the videos of each hand-made catalog out of where the folders put
 * them and into a series of their own, on a shelf ahead of the folders.
 */
function applyCatalogs(scan: Scan, catalogs: Catalog[]): void {
  const taken = new Map<string, RawFile>()
  const wanted = new Set(catalogs.flatMap((catalog) => catalog.fileIds))
  if (wanted.size === 0) {
    return
  }

  for (const item of [...scan.items.values()]) {
    for (const season of item.seasons) {
      for (const file of season.files) {
        if (wanted.has(file.id)) {
          taken.set(file.id, file)
        }
      }
      season.files = season.files.filter((file) => !wanted.has(file.id))
    }
    item.seasons = item.seasons.filter((season) => season.files.length > 0)
    if (item.seasons.length === 0) {
      scan.items.delete(item.id)
      for (const shelf of scan.shelves) {
        shelf.itemIds = shelf.itemIds.filter((id) => id !== item.id)
      }
    }
  }

  const shelf: RawShelf = { id: CATALOG_SHELF, title: "Catálogos", itemIds: [] }
  for (const catalog of catalogs) {
    const files = catalog.fileIds
      .map((id) => taken.get(id))
      .filter((file): file is RawFile => !!file)
    if (files.length === 0) {
      continue
    }
    register(scan, shelf, {
      id: `cat-${catalog.id}`,
      kind: "series",
      title: catalog.name,
      shelfId: shelf.id,
      addedAt: addedAt(files),
      catalogId: catalog.id,
      seasons: [asSeason(files, "", "")],
    })
  }
  if (shelf.itemIds.length > 0) {
    scan.shelves.unshift(shelf)
  }
}

export async function scanLibrary(rootPaths: string[], catalogs: Catalog[]): Promise<Scan> {
  const scan: Scan = {
    roots: [],
    shelves: [],
    items: new Map(),
    filePaths: new Map(),
    fileItem: new Map(),
  }

  for (const path of rootPaths) {
    const info = await stat(path).catch(() => null)
    scan.roots.push({ path, name: basename(path) || path, missing: !info })
    if (!info) {
      continue
    }
    if (info.isDirectory()) {
      collect(await readDir(path, 0), scan)
    } else {
      // A single video dropped in on its own.
      const video = await readVideo(path)
      if (video) {
        const lone: Dir = { path, name: "Avulsos", videos: [video], dirs: [], total: 1 }
        collect(lone, scan)
      }
    }
  }

  applyCatalogs(scan, catalogs)

  scan.shelves = scan.shelves.filter((shelf) => shelf.itemIds.length > 0)
  const title = (id: string) => scan.items.get(id)?.title ?? ""
  for (const shelf of scan.shelves) {
    shelf.itemIds.sort((a, b) => naturalCompare(title(a), title(b)))
  }
  return scan
}
