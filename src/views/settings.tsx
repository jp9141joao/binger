import * as React from "react"
import { FolderPlusIcon, RefreshCwIcon } from "lucide-react"
import type { Snapshot, SubtitleSize, SubtitleStyle } from "@shared/types"
import { Subtitle } from "@/components/subtitle"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { coverOf, lastWatchedAt } from "@/lib/catalog"
import { focusFirst } from "@/lib/nav"
import { SUBTITLE_SIZES, SUBTITLE_STYLES } from "@/lib/subtitles"

export function SettingsView({ library }: { library: Snapshot }) {
  const api = window.binger

  React.useEffect(() => {
    focusFirst()
  }, [])

  // The sample caption stands on a real frame: the last thing watched, if any.
  const backdrop = React.useMemo(
    () =>
      Object.values(library.items)
        .sort((a, b) => lastWatchedAt(b) - lastWatchedAt(a))
        .map(coverOf)
        .find(Boolean),
    [library.items]
  )

  return (
    <div data-slot="settings">
      <h1 data-slot="view-title">Ajustes</h1>

      <FieldSet>
        <FieldLegend>Pastas da biblioteca</FieldLegend>
        {library.roots.length > 0 ? (
          <ItemGroup>
            {library.roots.map((root) => (
              <Item key={root.path} variant="outline">
                <ItemContent>
                  <ItemTitle>{root.name}</ItemTitle>
                  <ItemDescription>
                    {root.missing
                      ? `${root.path} · indisponível. Confira se o disco está conectado.`
                      : root.path}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="outline"
                    data-nav
                    onClick={() => void api.removeRoot(root.path)}
                  >
                    Tirar da biblioteca
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <FieldDescription>Nenhuma pasta escolhida ainda.</FieldDescription>
        )}
        <div data-slot="actions">
          <Button data-nav data-nav-default onClick={() => void api.addFolder()}>
            <FolderPlusIcon data-icon="inline-start" />
            Adicionar pasta
          </Button>
          <Button
            variant="secondary"
            data-nav
            disabled={library.scanning}
            onClick={() => void api.rescan()}
          >
            {library.scanning ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <RefreshCwIcon data-icon="inline-start" />
            )}
            Atualizar biblioteca
          </Button>
        </div>
        <FieldDescription>
          O Binger mostra só os vídeos destas pastas. Tirar uma pasta da
          biblioteca não apaga nenhum arquivo.
        </FieldDescription>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Legendas</FieldLegend>
        <div data-slot="subtitle-preview">
          {backdrop && <img src={backdrop} alt="" draggable={false} />}
          <Subtitle
            text={"Assim a legenda aparece na tela.\nNo sofá, de longe, dá para ler?"}
            style={library.settings.subtitleStyle}
            size={library.settings.subtitleSize}
          />
        </div>
        <ToggleGroup
          variant="outline"
          aria-label="Estilo da legenda"
          value={[library.settings.subtitleStyle]}
          onValueChange={(value) => {
            const next = value[0] as SubtitleStyle | undefined
            if (next) {
              void api.setSettings({ subtitleStyle: next })
            }
          }}
        >
          {SUBTITLE_STYLES.map((entry) => (
            <ToggleGroupItem key={entry.id} value={entry.id} data-nav>
              {entry.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          aria-label="Tamanho da legenda"
          value={[library.settings.subtitleSize]}
          onValueChange={(value) => {
            const next = value[0] as SubtitleSize | undefined
            if (next) {
              void api.setSettings({ subtitleSize: next })
            }
          }}
        >
          {SUBTITLE_SIZES.map((entry) => (
            <ToggleGroupItem key={entry.id} value={entry.id} data-nav>
              {entry.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="subtitles">Ligar legenda sozinha</FieldLabel>
            <FieldDescription>
              Quando o vídeo traz legenda, ela já começa ligada. Em português,
              se houver. Fica salva: se você desligar a legenda no player, os
              próximos vídeos começam sem ela até você ligar de novo (tecla L).
            </FieldDescription>
          </FieldContent>
          <Switch
            id="subtitles"
            data-nav
            checked={library.settings.subtitles}
            onCheckedChange={(subtitles) => void api.setSettings({ subtitles })}
          />
        </Field>
      </FieldSet>

      <FieldGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="fullscreen">Tela cheia</FieldLabel>
            <FieldDescription>
              O Binger lembra a escolha e abre assim da próxima vez.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="fullscreen"
            data-nav
            checked={library.settings.fullscreen}
            onCheckedChange={(fullscreen) => void api.setSettings({ fullscreen })}
          />
        </Field>
      </FieldGroup>
    </div>
  )
}
