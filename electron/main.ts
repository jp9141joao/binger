import { randomBytes } from "node:crypto"
import { createReadStream, cpSync, existsSync, renameSync } from "node:fs"
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { basename, extname, join } from "node:path"
import { Readable } from "node:stream"
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell } from "electron"
import type {
  Catalog,
  BingerEvent,
  IntroSkip,
  Item,
  Probe,
  Progress,
  Settings,
  Snapshot,
  VideoFile,
} from "../shared/types.ts"
import { scanLibrary, type RawFile, type Scan } from "./library.ts"
import { naturalCompare } from "./names.ts"
import { createSubtitles } from "./subtitles.ts"

// The app used to be called "cinemax": carry its library over to the data folder
// of the new name once, so nobody loses progress, covers or the speech model.
{
  const current = app.getPath("userData")
  const previous = join(app.getPath("appData"), "cinemax")
  if (!existsSync(current) && existsSync(previous)) {
    try {
      cpSync(previous, current, { recursive: true })
      const oldDb = join(current, "cinemax.json")
      if (existsSync(oldDb)) {
        renameSync(oldDb, join(current, "binger.json"))
      }
    } catch {
      // A failed copy just means starting with an empty library.
    }
  }
}

// The speech model is large; it stays in the real data folder even when a
// test run points everything else somewhere else.
const modelDir = join(app.getPath("userData"), "models")

// A separate data folder keeps test runs away from the real library.
if (process.env.BINGER_DATA_DIR) {
  app.setPath("userData", process.env.BINGER_DATA_DIR)
}

// A test run keeps its window off the screen, so nobody takes it for the real
// app, while the page still renders as if it were in full view.
const offscreen = !!process.env.BINGER_OFFSCREEN
if (offscreen) {
  app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion")
  app.commandLine.appendSwitch("disable-renderer-backgrounding")
  app.commandLine.appendSwitch("disable-backgrounding-occluded-windows")
}

type MediaEntry = Probe & {
  /** Size and modified time; a changed file drops its stored frame. */
  sig: string
  frame?: string
  probed?: boolean
  progress?: Progress
  subtitle?: string
}

type Db = {
  roots: string[]
  settings: Settings
  media: Record<string, MediaEntry>
  covers: Record<string, string>
  catalogs: Catalog[]
  intros: Record<string, IntroSkip>
}

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".bmp"])
const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".ogv": "video/ogg",
  ".3gp": "video/3gpp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
}
/** Window colour before the page paints, so a launch never flashes white. */
const BACKGROUND = "#0a0a0a"
/** Watched far enough to count as seen. */
const DONE_RATIO = 0.92

const dataDir = app.getPath("userData")
const dbPath = join(dataDir, "binger.json")
const coversDir = join(dataDir, "covers")
const subtitlesDir = join(dataDir, "subtitles")

let db: Db = {
  roots: [],
  settings: {
    fullscreen: false,
    subtitles: true,
    subtitleStyle: "classica",
    subtitleSize: "m",
  },
  media: {},
  covers: {},
  catalogs: [],
  intros: {},
}
let scan: Scan = {
  roots: [],
  shelves: [],
  items: new Map(),
  filePaths: new Map(),
  fileItem: new Map(),
}
let scanning = false
let win: BrowserWindow | null = null
let saveTimer: NodeJS.Timeout | null = null

async function loadDb(): Promise<void> {
  try {
    const stored = JSON.parse(await readFile(dbPath, "utf8")) as Partial<Db>
    db = { ...db, ...stored, settings: { ...db.settings, ...stored.settings } }
  } catch {
    // First launch, or an unreadable file: start from the defaults.
  }
}

async function writeDb(): Promise<void> {
  await mkdir(dataDir, { recursive: true })
  const temp = `${dbPath}.tmp`
  await writeFile(temp, JSON.stringify(db))
  await rename(temp, dbPath)
}

function saveDb(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => void writeDb(), 400)
}

function send(event: BingerEvent): void {
  win?.webContents.send("cx:event", event)
}

function coverUrl(name: string): string {
  return `media://c/${name}`
}

function toFile(raw: RawFile): VideoFile {
  const entry = db.media[raw.id]
  return {
    id: raw.id,
    name: raw.name,
    title: raw.title,
    ext: raw.ext,
    size: raw.size,
    mtimeMs: raw.mtimeMs,
    playable: raw.playable,
    season: raw.season,
    episode: raw.episode,
    duration: entry?.duration,
    width: entry?.width,
    height: entry?.height,
    frame: entry?.frame ? coverUrl(entry.frame) : undefined,
    probed: entry?.probed ?? false,
    progress: entry?.progress,
    subtitle: entry?.subtitle,
  }
}

function toItem(id: string): Item | null {
  const raw = scan.items.get(id)
  if (!raw) {
    return null
  }
  return {
    ...raw,
    cover: db.covers[id] ? coverUrl(db.covers[id]) : undefined,
    seasons: raw.seasons.map((season) => ({
      name: season.name,
      files: season.files.map(toFile),
    })),
  }
}

function snapshot(): Snapshot {
  const items: Record<string, Item> = {}
  for (const id of scan.items.keys()) {
    const item = toItem(id)
    if (item) {
      items[id] = item
    }
  }
  return {
    roots: scan.roots,
    shelves: scan.shelves,
    items,
    catalogs: db.catalogs,
    intros: db.intros,
    settings: db.settings,
    scanning,
  }
}

function sendSnapshot(): void {
  send({ type: "snapshot", snapshot: snapshot() })
}

function sendItem(itemId: string | undefined): void {
  const item = itemId ? toItem(itemId) : null
  if (item) {
    send({ type: "item", item })
  }
}

async function rescan(): Promise<void> {
  scanning = true
  sendSnapshot()
  const next = await scanLibrary(db.roots, db.catalogs)

  for (const item of next.items.values()) {
    for (const season of item.seasons) {
      for (const file of season.files) {
        const sig = `${file.size}:${Math.round(file.mtimeMs)}`
        if (db.media[file.id]?.sig !== sig) {
          db.media[file.id] = { sig }
        }
      }
    }
  }

  scan = next
  scanning = false
  saveDb()
  sendSnapshot()
}

async function addRoots(paths: string[]): Promise<void> {
  const known = new Set(db.roots.map((root) => root.toLowerCase()))
  for (const path of paths) {
    if (!known.has(path.toLowerCase())) {
      db.roots.push(path)
      known.add(path.toLowerCase())
    }
  }
  await rescan()
}

/** Takes these videos out of every catalog; a catalog left empty goes too. */
function releaseFromCatalogs(fileIds: string[]): void {
  const leaving = new Set(fileIds)
  for (const catalog of db.catalogs) {
    catalog.fileIds = catalog.fileIds.filter((id) => !leaving.has(id))
  }
  db.catalogs = db.catalogs.filter((catalog) => catalog.fileIds.length > 0)
}

/** A catalog plays in filename order, like a folder would. */
function sortCatalog(catalog: Catalog): void {
  const name = (id: string) => basename(scan.filePaths.get(id) ?? id)
  catalog.fileIds.sort((a, b) => naturalCompare(name(a), name(b)))
}

async function catalogsChanged(): Promise<void> {
  saveDb()
  await rescan()
}

function resolveMedia(url: URL): string | undefined {
  const name = decodeURIComponent(url.pathname.slice(1))
  if (url.host === "f") {
    return scan.filePaths.get(name)
  }
  if (url.host === "c" && /^[\w.-]+$/.test(name)) {
    return join(coversDir, name)
  }
  return undefined
}

/** Serves library files and covers, with byte ranges so video can seek. */
async function serveMedia(request: Request): Promise<Response> {
  const path = resolveMedia(new URL(request.url))
  const info = path ? await stat(path).catch(() => null) : null
  if (!path || !info) {
    return new Response(null, { status: 404 })
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": MIME[extname(path).toLowerCase()] ?? "application/octet-stream",
    // Lets the page draw video frames to a canvas when it builds covers.
    "Access-Control-Allow-Origin": "*",
  })
  if (info.size === 0) {
    return new Response(null, { status: 200, headers })
  }

  let start = 0
  let end = info.size - 1
  let status = 200
  const range = /bytes=(\d*)-(\d*)/.exec(request.headers.get("range") ?? "")
  if (range && (range[1] || range[2])) {
    if (range[1]) {
      start = Number(range[1])
      end = range[2] ? Math.min(Number(range[2]), end) : end
    } else {
      start = Math.max(0, info.size - Number(range[2]))
    }
    if (start > end) {
      headers.set("Content-Range", `bytes */${info.size}`)
      return new Response(null, { status: 416, headers })
    }
    status = 206
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`)
  }
  headers.set("Content-Length", String(end - start + 1))

  const stream = Readable.toWeb(createReadStream(path, { start, end }))
  return new Response(stream as unknown as ReadableStream, { status, headers })
}

const subtitles = createSubtitles({
  // Resolved by hand: bundling the package would break the path it computes.
  ffmpeg: join(
    app.getAppPath(),
    "node_modules/ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
  ),
  dir: subtitlesDir,
  modelDir,
  workerPath: join(app.getAppPath(), "electron/transcribe-worker.mjs"),
  pathOf: (fileId) => scan.filePaths.get(fileId),
  onJob: (job) => send({ type: "subtitle-job", job }),
  onCues: (fileId, cues) => send({ type: "subtitle-cues", fileId, cues }),
  onDone: (fileId) => {
    // A freshly written subtitle is what the viewer asked for: turn it on.
    const entry = db.media[fileId]
    if (entry) {
      entry.subtitle = "auto"
      saveDb()
      sendItem(scan.fileItem.get(fileId))
    }
  },
})

function registerIpc(): void {
  ipcMain.handle("cx:getSnapshot", () => snapshot())

  ipcMain.handle("cx:addFolder", async () => {
    if (!win) {
      return
    }
    const result = await dialog.showOpenDialog(win, {
      title: "Escolher pasta de vídeos",
      buttonLabel: "Usar esta pasta",
      properties: ["openDirectory", "multiSelections"],
    })
    if (!result.canceled) {
      await addRoots(result.filePaths)
    }
  })

  ipcMain.handle("cx:addPaths", (_event, paths: string[]) => addRoots(paths))

  ipcMain.handle("cx:removeRoot", async (_event, path: string) => {
    db.roots = db.roots.filter((root) => root !== path)
    await rescan()
  })

  ipcMain.handle("cx:rescan", () => rescan())

  ipcMain.handle(
    "cx:saveFrame",
    async (_event, fileId: string, jpeg: ArrayBuffer | null, probe: Probe) => {
      const entry = db.media[fileId]
      if (!entry) {
        return
      }
      if (jpeg) {
        await mkdir(coversDir, { recursive: true })
        const name = `${fileId}-${Date.now().toString(36)}.jpg`
        await writeFile(join(coversDir, name), Buffer.from(jpeg))
        if (entry.frame) {
          void rm(join(coversDir, entry.frame), { force: true })
        }
        entry.frame = name
      }
      Object.assign(entry, probe, { probed: true })
      saveDb()
      sendItem(scan.fileItem.get(fileId))
    }
  )

  ipcMain.handle(
    "cx:saveProgress",
    (_event, fileId: string, position: number, duration: number) => {
      const entry = db.media[fileId]
      if (!entry || !(duration > 0)) {
        return
      }
      entry.progress = {
        position,
        duration,
        updatedAt: Date.now(),
        done: position / duration >= DONE_RATIO,
      }
      saveDb()
      sendItem(scan.fileItem.get(fileId))
    }
  )

  ipcMain.handle("cx:markFileDone", (_event, fileId: string, done: boolean) => {
    const entry = db.media[fileId]
    if (!entry) {
      return
    }
    const duration = entry.duration ?? entry.progress?.duration ?? 1
    entry.progress = done
      ? { position: duration, duration, updatedAt: Date.now(), done: true }
      : undefined
    saveDb()
    sendItem(scan.fileItem.get(fileId))
  })

  ipcMain.handle("cx:markDone", (_event, itemId: string, done: boolean) => {
    const item = scan.items.get(itemId)
    if (!item) {
      return
    }
    for (const season of item.seasons) {
      for (const file of season.files) {
        const entry = db.media[file.id]
        if (!entry) {
          continue
        }
        const duration = entry.duration ?? entry.progress?.duration ?? 1
        entry.progress = done
          ? { position: duration, duration, updatedAt: Date.now(), done: true }
          : undefined
      }
    }
    saveDb()
    sendItem(itemId)
  })

  ipcMain.handle("cx:chooseCover", async (_event, itemId: string) => {
    if (!win || !scan.items.has(itemId)) {
      return
    }
    const result = await dialog.showOpenDialog(win, {
      title: "Escolher imagem de capa",
      buttonLabel: "Usar como capa",
      properties: ["openFile"],
      filters: [{ name: "Imagens", extensions: [...IMAGE_EXT].map((ext) => ext.slice(1)) }],
    })
    const source = result.filePaths[0]
    const ext = source ? extname(source).toLowerCase() : ""
    if (result.canceled || !IMAGE_EXT.has(ext)) {
      return
    }
    await mkdir(coversDir, { recursive: true })
    // Copied in, so the cover survives the original image being moved.
    const name = `m-${itemId}-${Date.now().toString(36)}${ext}`
    await copyFile(source, join(coversDir, name))
    if (db.covers[itemId]) {
      void rm(join(coversDir, db.covers[itemId]), { force: true })
    }
    db.covers[itemId] = name
    saveDb()
    sendItem(itemId)
  })

  ipcMain.handle("cx:clearCover", (_event, itemId: string) => {
    if (db.covers[itemId]) {
      void rm(join(coversDir, db.covers[itemId]), { force: true })
      delete db.covers[itemId]
      saveDb()
      sendItem(itemId)
    }
  })

  ipcMain.handle("cx:setSettings", (_event, settings: Partial<Settings>) => {
    db.settings = { ...db.settings, ...settings }
    if (settings.fullscreen !== undefined && win?.isFullScreen() !== settings.fullscreen) {
      win?.setFullScreen(settings.fullscreen)
    }
    saveDb()
    sendSnapshot()
  })

  ipcMain.handle("cx:toggleFullscreen", () => {
    win?.setFullScreen(!win.isFullScreen())
  })

  ipcMain.handle("cx:openExternal", (_event, fileId: string) => {
    const path = scan.filePaths.get(fileId)
    return path ? shell.openPath(path) : undefined
  })

  ipcMain.handle("cx:showInFolder", (_event, fileId: string) => {
    const path = scan.filePaths.get(fileId)
    if (path) {
      shell.showItemInFolder(path)
    }
  })

  ipcMain.handle("cx:setIntro", (_event, itemId: string, intro: IntroSkip) => {
    if (!scan.items.has(itemId)) {
      return
    }
    const start = Math.max(0, Number(intro.start) || 0)
    const end = Math.max(0, Number(intro.end) || 0)
    db.intros[itemId] = { enabled: !!intro.enabled, start, end }
    saveDb()
    sendSnapshot()
  })

  ipcMain.handle("cx:listSubtitles",(_event, fileId: string) => subtitles.list(fileId))

  ipcMain.handle("cx:loadSubtitle", (_event, fileId: string, trackId: string) =>
    subtitles.load(fileId, trackId)
  )

  ipcMain.handle("cx:chooseSubtitle", (_event, fileId: string, trackId: string) => {
    const entry = db.media[fileId]
    if (entry) {
      entry.subtitle = trackId
      saveDb()
      sendItem(scan.fileItem.get(fileId))
    }
  })

  ipcMain.handle("cx:generateSubtitles", async (_event, fileIds: string[]) => {
    await mkdir(subtitlesDir, { recursive: true })
    subtitles.generate(fileIds.filter((id) => scan.filePaths.has(id)))
  })

  ipcMain.handle("cx:cancelSubtitles", () => subtitles.cancel())

  ipcMain.handle("cx:getSubtitleJob", () => subtitles.job())

  ipcMain.handle("cx:createCatalog", (_event, name: string, fileIds: string[]) => {
    const wanted = fileIds.filter((id) => scan.filePaths.has(id))
    if (!name.trim() || wanted.length === 0) {
      return
    }
    releaseFromCatalogs(wanted)
    const catalog = { id: randomBytes(6).toString("hex"), name: name.trim(), fileIds: wanted }
    sortCatalog(catalog)
    db.catalogs.push(catalog)
    return catalogsChanged()
  })

  ipcMain.handle("cx:addToCatalog", (_event, catalogId: string, fileIds: string[]) => {
    const wanted = fileIds.filter((id) => scan.filePaths.has(id))
    releaseFromCatalogs(wanted)
    const catalog = db.catalogs.find((entry) => entry.id === catalogId)
    if (!catalog) {
      return
    }
    catalog.fileIds.push(...wanted)
    sortCatalog(catalog)
    return catalogsChanged()
  })

  ipcMain.handle("cx:removeFromCatalog", (_event, fileIds: string[]) => {
    releaseFromCatalogs(fileIds)
    return catalogsChanged()
  })

  ipcMain.handle("cx:renameCatalog", (_event, catalogId: string, name: string) => {
    const catalog = db.catalogs.find((entry) => entry.id === catalogId)
    if (catalog && name.trim()) {
      catalog.name = name.trim()
      return catalogsChanged()
    }
  })

  ipcMain.handle("cx:deleteCatalog", (_event, catalogId: string) => {
    db.catalogs = db.catalogs.filter((entry) => entry.id !== catalogId)
    return catalogsChanged()
  })
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 540,
    title: "Binger",
    backgroundColor: BACKGROUND,
    fullscreen: db.settings.fullscreen && !offscreen,
    ...(offscreen && { x: -20000, y: -20000, show: false, skipTaskbar: true }),
    webPreferences: {
      preload: join(import.meta.dirname, "preload.mjs"),
      backgroundThrottling: !offscreen,
    },
  })
  if (offscreen) {
    win.showInactive()
  }

  const persistFullscreen = (fullscreen: boolean) => {
    if (db.settings.fullscreen !== fullscreen) {
      db.settings.fullscreen = fullscreen
      saveDb()
      sendSnapshot()
    }
  }
  win.on("enter-full-screen", () => persistFullscreen(true))
  win.on("leave-full-screen", () => persistFullscreen(false))
  win.on("closed", () => {
    win = null
  })

  // The menu bar is gone, so the shortcuts it carried are handled here.
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") {
      return
    }
    if (input.key === "F11") {
      win?.setFullScreen(!win.isFullScreen())
      event.preventDefault()
    } else if (!app.isPackaged && input.key === "F12") {
      win?.webContents.toggleDevTools()
      event.preventDefault()
    } else if (!app.isPackaged && input.control && input.key.toLowerCase() === "r") {
      win?.webContents.reload()
      event.preventDefault()
    }
  })

  // Set by vite-plugin-electron while the dev server is running.
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    win.loadURL(devServerUrl)
  } else {
    win.loadFile(join(import.meta.dirname, "../dist/index.html"))
  }
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (win?.isMinimized()) {
      win.restore()
    }
    win?.focus()
  })

  // A subtitle still being written must not outlive the app.
  app.on("before-quit", () => subtitles.cancel())

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null)
    protocol.handle("media", serveMedia)
    await loadDb()
    registerIpc()
    createWindow()
    void rescan()
  })
}
