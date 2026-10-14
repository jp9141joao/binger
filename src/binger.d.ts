import type { BingerApi } from "@shared/types"

declare global {
  interface Window {
    /** Bridge to the Electron main process; absent in a plain browser. */
    binger: BingerApi
  }
}
