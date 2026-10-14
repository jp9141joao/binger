import * as React from "react"
import { Kbd } from "@/components/ui/kbd"

export type Section = "home" | "organize" | "settings"

function Clock() {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 20_000)
    return () => clearInterval(timer)
  }, [])
  return (
    <time data-slot="clock" dateTime={now.toISOString()}>
      {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </time>
  )
}

export function Topbar({
  section,
  onNavigate,
}: {
  section: Section
  onNavigate: (section: Section) => void
}) {
  const links: [Section, string][] = [
    ["home", "Início"],
    ["organize", "Organizar"],
    ["settings", "Ajustes"],
  ]
  return (
    <header data-slot="topbar">
      <span data-slot="wordmark">Binger</span>
      <nav data-slot="nav" aria-label="Seções">
        {links.map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-slot="nav-item"
            data-nav
            data-nav-id={`nav-${id}`}
            aria-current={section === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <Clock />
    </header>
  )
}

export function Legend({ hints }: { hints: [string, string][] }) {
  return (
    <footer data-slot="legend">
      {hints.map(([key, action]) => (
        <span key={key}>
          <Kbd>{key}</Kbd> {action}
        </span>
      ))}
    </footer>
  )
}
