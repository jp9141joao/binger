import * as React from "react"
import { CheckIcon, FolderIcon, LibraryIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { Snapshot, VideoFile } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { filesOf } from "@/lib/catalog"
import { focusFirst } from "@/lib/nav"

const CATALOG_SHELF = "catalogs"

type Source = { id: string; title: string; isCatalog: boolean; files: VideoFile[] }

function buildSources(library: Snapshot): Source[] {
  const byName = (a: VideoFile, b: VideoFile) =>
    a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" })
  const folders: Source[] = library.shelves
    .filter((shelf) => shelf.id !== CATALOG_SHELF)
    .map((shelf) => ({
      id: shelf.id,
      title: shelf.title,
      isCatalog: false,
      files: shelf.itemIds
        .flatMap((id) => (library.items[id] ? filesOf(library.items[id]) : []))
        .sort(byName),
    }))
  const catalogs: Source[] = library.catalogs.map((catalog) => ({
    id: `catalog:${catalog.id}`,
    title: catalog.name,
    isCatalog: true,
    files: library.items[`cat-${catalog.id}`] ? filesOf(library.items[`cat-${catalog.id}`]) : [],
  }))
  return [...folders, ...catalogs]
}

/** What the chosen files are called in common: a first guess at a name. */
function commonName(files: VideoFile[]): string {
  if (files.length === 0) {
    return ""
  }
  let prefix = files[0].name
  for (const file of files) {
    while (prefix && !file.name.toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1)
    }
  }
  // "Chapolin" and "Chaves" share "Cha", which names nothing: keep whole words.
  if (/[a-zà-ú]/i.test(files[0].name.charAt(prefix.length))) {
    prefix = prefix.slice(0, prefix.lastIndexOf(" ") + 1)
  }
  return prefix
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[._]+/g, " ")
    .replace(/[\s\-–—([#]*(s\d*|e\d*|ep|\d+)?[\s\-–—([#]*$/i, "")
    .trim()
}

export function Organize({
  library,
  initialSource,
}: {
  library: Snapshot
  initialSource?: string
}) {
  const api = window.binger
  const sources = React.useMemo(() => buildSources(library), [library])
  const [sourceId, setSourceId] = React.useState(initialSource ?? sources[0]?.id)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [naming, setNaming] = React.useState<"create" | "rename" | null>(null)
  const [name, setName] = React.useState("")

  const source = sources.find((entry) => entry.id === sourceId) ?? sources[0]
  const chosen = source ? source.files.filter((file) => selected.has(file.id)) : []
  const catalogs = sources.filter((entry) => entry.isCatalog)
  const catalogId = source?.isCatalog ? source.id.slice("catalog:".length) : null

  // Leaving the name field puts focus back on the list.
  React.useEffect(() => {
    if (naming === null) {
      focusFirst(sourceId ? `source-${sourceId}` : undefined)
    }
  }, [naming, sourceId])

  const pick = (id: string) => {
    setSourceId(id)
    setSelected(new Set())
    setNaming(null)
  }

  const toggle = (fileId: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(fileId)) {
        next.add(fileId)
      }
      return next
    })
  }

  const confirmName = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    if (naming === "create") {
      void api.createCatalog(trimmed, [...selected])
      toast.add({
        title: `Catálogo criado: ${trimmed}`,
        description: `${selected.size} vídeos. Ele aparece na prateleira Catálogos do Início.`,
        timeout: 4000,
      })
      setSelected(new Set())
    } else if (catalogId) {
      void api.renameCatalog(catalogId, trimmed)
    }
    setNaming(null)
  }

  if (!source) {
    return (
      <div data-slot="organize-empty">
        <h1 data-slot="view-title">Organizar</h1>
        <p>Escolha uma pasta de vídeos no Início antes de montar catálogos.</p>
      </div>
    )
  }

  return (
    <div data-slot="organize">
      <header data-slot="organize-head">
        <h1 data-slot="view-title">Organizar</h1>
        <p data-slot="organize-help">
          <strong>{source.title}.</strong>{" "}
          {source.isCatalog
            ? "Um catálogo toca na ordem dos nomes dos arquivos. Tirar um vídeo daqui o devolve à pasta de origem; nenhum arquivo é movido ou apagado."
            : "Marque os vídeos que são da mesma série e junte em um catálogo. Os arquivos continuam onde estão no computador."}
        </p>
      </header>
      <aside data-slot="organize-sources">
        <h2>Pastas</h2>
        {sources
          .filter((entry) => !entry.isCatalog)
          .map((entry) => (
            <button
              key={entry.id}
              type="button"
              data-slot="pick"
              data-nav
              data-nav-id={`source-${entry.id}`}
              aria-current={entry.id === source.id}
              onClick={() => pick(entry.id)}
            >
              <FolderIcon />
              <span data-slot="pick-name">{entry.title}</span>
              <span data-slot="pick-meta">{entry.files.length}</span>
            </button>
          ))}
        <h2>Catálogos</h2>
        {catalogs.length === 0 && (
          <p>
            Nenhum ainda. Marque vídeos de uma pasta e junte em um catálogo.
          </p>
        )}
        {catalogs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            data-slot="pick"
            data-nav
            data-nav-id={`source-${entry.id}`}
            aria-current={entry.id === source.id}
            onClick={() => pick(entry.id)}
          >
            <LibraryIcon />
            <span data-slot="pick-name">{entry.title}</span>
            <span data-slot="pick-meta">{entry.files.length}</span>
          </button>
        ))}
      </aside>

      <section data-slot="organize-main" aria-label={source.title}>
        {naming ? (
          <form
            data-slot="actions"
            onSubmit={(event) => {
              event.preventDefault()
              confirmName()
            }}
          >
            <Input
              autoFocus
              data-nav
              aria-label="Nome do catálogo"
              placeholder="Nome do catálogo"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit" data-nav disabled={!name.trim()}>
              {naming === "create" ? "Criar catálogo" : "Salvar nome"}
            </Button>
            <Button type="button" variant="outline" data-nav onClick={() => setNaming(null)}>
              Cancelar
            </Button>
          </form>
        ) : source.isCatalog ? (
          <div data-slot="actions">
            <Button
              data-nav
              disabled={chosen.length === 0}
              onClick={() => {
                void api.removeFromCatalog(chosen.map((file) => file.id))
                setSelected(new Set())
              }}
            >
              {chosen.length > 0 ? `Tirar ${chosen.length} do catálogo` : "Tirar do catálogo"}
            </Button>
            <Button
              variant="outline"
              data-nav
              onClick={() => {
                setName(source.title)
                setNaming("rename")
              }}
            >
              <PencilIcon data-icon="inline-start" />
              Mudar o nome
            </Button>
            <Button
              variant="outline"
              data-nav
              onClick={() => {
                if (catalogId) {
                  void api.deleteCatalog(catalogId)
                  pick(sources[0].id)
                }
              }}
            >
              <Trash2Icon data-icon="inline-start" />
              Desfazer catálogo
            </Button>
          </div>
        ) : (
          <div data-slot="actions">
            <Button
              data-nav
              disabled={chosen.length === 0}
              onClick={() => {
                setName(commonName(chosen))
                setNaming("create")
              }}
            >
              {chosen.length === 1
                ? "Criar catálogo com 1 marcado"
                : `Criar catálogo com ${chosen.length || "os"} marcados`}
            </Button>
            {catalogs.map((entry) => (
              <Button
                key={entry.id}
                variant="secondary"
                data-nav
                disabled={chosen.length === 0}
                onClick={() => {
                  void api.addToCatalog(
                    entry.id.slice("catalog:".length),
                    chosen.map((file) => file.id)
                  )
                  setSelected(new Set())
                }}
              >
                Juntar a {entry.title}
              </Button>
            ))}
            <Button
              variant="outline"
              data-nav
              onClick={() =>
                setSelected(
                  chosen.length === source.files.length
                    ? new Set()
                    : new Set(source.files.map((file) => file.id))
                )
              }
            >
              {chosen.length === source.files.length ? "Desmarcar todos" : "Marcar todos"}
            </Button>
          </div>
        )}

        <div data-slot="organize-files">
          {source.files.map((file) => (
            <button
              key={file.id}
              type="button"
              data-slot="pick"
              data-nav
              role="checkbox"
              aria-checked={selected.has(file.id)}
              onClick={() => toggle(file.id)}
            >
              <span data-slot="pick-box">{selected.has(file.id) && <CheckIcon />}</span>
              <span data-slot="pick-thumb">
                {file.frame && <img src={file.frame} alt="" loading="lazy" draggable={false} />}
              </span>
              <span data-slot="pick-name">{file.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
