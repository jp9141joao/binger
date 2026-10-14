import { contextBridge, ipcRenderer, webUtils } from "electron"
import type { BingerApi, BingerEvent } from "../shared/types.ts"

const call =
  (channel: string) =>
  (...args: unknown[]) =>
    ipcRenderer.invoke(`cx:${channel}`, ...args)

const api: BingerApi = {
  getSnapshot: call("getSnapshot"),
  addFolder: call("addFolder"),
  addPaths: call("addPaths"),
  removeRoot: call("removeRoot"),
  rescan: call("rescan"),
  saveFrame: call("saveFrame"),
  saveProgress: call("saveProgress"),
  markDone: call("markDone"),
  markFileDone: call("markFileDone"),
  chooseCover: call("chooseCover"),
  clearCover: call("clearCover"),
  setSettings: call("setSettings"),
  toggleFullscreen: call("toggleFullscreen"),
  openExternal: call("openExternal"),
  showInFolder: call("showInFolder"),
  setIntro: call("setIntro"),
  listSubtitles: call("listSubtitles"),
  loadSubtitle: call("loadSubtitle"),
  chooseSubtitle: call("chooseSubtitle"),
  generateSubtitles: call("generateSubtitles"),
  cancelSubtitles: call("cancelSubtitles"),
  getSubtitleJob: call("getSubtitleJob"),
  createCatalog: call("createCatalog"),
  addToCatalog: call("addToCatalog"),
  removeFromCatalog: call("removeFromCatalog"),
  renameCatalog: call("renameCatalog"),
  deleteCatalog: call("deleteCatalog"),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onEvent: (listener) => {
    const handler = (_event: unknown, payload: BingerEvent) => listener(payload)
    ipcRenderer.on("cx:event", handler)
    return () => {
      ipcRenderer.removeListener("cx:event", handler)
    }
  },
}

contextBridge.exposeInMainWorld("binger", api)
