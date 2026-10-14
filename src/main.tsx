import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { Toaster } from "@/components/ui/toast"
import { LibraryProvider } from "@/state/library"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LibraryProvider>
      <Toaster>
        <App />
      </Toaster>
    </LibraryProvider>
  </StrictMode>
)
