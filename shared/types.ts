export type SubtitleStyle = "classica" | "amarela" | "caixa" | "sombra"
export type SubtitleSize = "p" | "m" | "g"

export type Progress = {
  position: number
  duration: number
  updatedAt: number
  done: boolean
}

export type VideoFile = {
  id: string
  name: string
  title: string
  ext: string
  size: number
  mtimeMs: number
  /** False for containers the built-in player cannot open (AVI, WMV…). */
  playable: boolean
  season?: number
  episode?: number
  duration?: number
  width?: number
  height?: number
  /** URL of the frame taken from the video, once extracted. */
  frame?: string
  /** True once frame extraction was attempted, even if it failed. */
  probed: boolean
  progress?: Progress
  /** The subtitle the viewer last chose for this file, or "off". */
  subtitle?: string
}

export type Season = { name: string; files: VideoFile[] }

export type Item = {
  id: string
  kind: "film" | "series"
  title: string
  year?: number
  shelfId: string
  addedAt: number
  /** URL of a cover the user picked by hand; wins over the video frame. */
  cover?: string
  /** Set when the viewer built this item by hand in Organizar. */
  catalogId?: string
  /** A film is one season holding one file. */
  seasons: Season[]
}

export type Shelf = { id: string; title: string; itemIds: string[] }

export type Root = { path: string; name: string; missing: boolean }

/** A series the viewer put together by hand, from videos of any folder. */
export type Catalog = { id: string; name: string; fileIds: string[] }

export type Settings = {
  fullscreen: boolean
  /** Turn subtitles on by themselves when a video has any. */
  subtitles: boolean
  subtitleStyle: SubtitleStyle
  subtitleSize: SubtitleSize
}

/** The opening of a series, in seconds, skipped on every episode when on. */
export type IntroSkip = { enabled: boolean; start: number; end: number }

export type Snapshot = {
  roots: Root[]
  shelves: Shelf[]
  items: Record<string, Item>
  catalogs: Catalog[]
  /** Intro skipping chosen per series, by item id. */
  intros: Record<string, IntroSkip>
  settings: Settings
  scanning: boolean
}

export type Probe = { duration?: number; width?: number; height?: number }

export type Cue = { start: number; end: number; text: string }

export type SubtitleTrack = {
  id: string
  /** Where it comes from: a file beside the video, inside it, or generated. */
  kind: "file" | "embedded" | "auto"
  label: string
  /** Two-letter language when it could be told, e.g. "pt". */
  language?: string
}

export type SubtitleList = {
  tracks: SubtitleTrack[]
  /** Subtitles stored as pictures, which cannot be shown as text. */
  pictureTracks: number
}

export type SubtitleJob = {
  fileId: string
  status: "queued" | "loading" | "downloading" | "transcribing" | "done" | "error"
  /** 0 to 1: the model download, then how much of the video was heard. */
  progress: number
  language?: string
  /** How many videos wait behind this one. */
  waiting: number
  message?: string
}

export type BingerEvent =
  | { type: "snapshot"; snapshot: Snapshot }
  | { type: "item"; item: Item }
  | { type: "subtitle-job"; job: SubtitleJob | null }
  | { type: "subtitle-cues"; fileId: string; cues: Cue[] }

export interface BingerApi {
  getSnapshot(): Promise<Snapshot>
  addFolder(): Promise<void>
  addPaths(paths: string[]): Promise<void>
  removeRoot(path: string): Promise<void>
  rescan(): Promise<void>
  saveFrame(fileId: string, jpeg: ArrayBuffer | null, probe: Probe): Promise<void>
  saveProgress(fileId: string, position: number, duration: number): Promise<void>
  markDone(itemId: string, done: boolean): Promise<void>
  /** Marks one episode (or film file) as seen or not seen, leaving the others alone. */
  markFileDone(fileId: string, done: boolean): Promise<void>
  chooseCover(itemId: string): Promise<void>
  clearCover(itemId: string): Promise<void>
  setSettings(settings: Partial<Settings>): Promise<void>
  toggleFullscreen(): Promise<void>
  openExternal(fileId: string): Promise<void>
  showInFolder(fileId: string): Promise<void>
  setIntro(itemId: string, intro: IntroSkip): Promise<void>

  listSubtitles(fileId: string): Promise<SubtitleList>
  loadSubtitle(fileId: string, trackId: string): Promise<Cue[]>
  /** Remembers the viewer's choice for this file; "off" turns them off. */
  chooseSubtitle(fileId: string, trackId: string): Promise<void>
  /** Queues videos to have subtitles written by listening to them. */
  generateSubtitles(fileIds: string[]): Promise<void>
  cancelSubtitles(): Promise<void>
  getSubtitleJob(): Promise<SubtitleJob | null>

  createCatalog(name: string, fileIds: string[]): Promise<void>
  addToCatalog(catalogId: string, fileIds: string[]): Promise<void>
  removeFromCatalog(fileIds: string[]): Promise<void>
  renameCatalog(catalogId: string, name: string): Promise<void>
  deleteCatalog(catalogId: string): Promise<void>

  pathForFile(file: File): string
  onEvent(listener: (event: BingerEvent) => void): () => void
}
