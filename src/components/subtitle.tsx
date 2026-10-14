import type { SubtitleSize, SubtitleStyle } from "@shared/types"

/** One caption on screen, drawn in the viewer's chosen style and size. */
export function Subtitle({
  text,
  style,
  size,
}: {
  text: string
  style: SubtitleStyle
  size: SubtitleSize
}) {
  if (!text) {
    return null
  }
  return (
    <p data-slot="subtitle" data-style={style} data-size={size}>
      {text.split("\n").map((line, index) => (
        <span key={index}>{line}</span>
      ))}
    </p>
  )
}
