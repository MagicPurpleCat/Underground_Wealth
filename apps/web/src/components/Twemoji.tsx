import { useMemo } from 'react'
import { cn } from '@/lib/utils'

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg'

/** Convert emoji grapheme → twemoji SVG codepoint path (skips VS16). */
export function emojiToCodePoint(emoji: string): string {
  const cps: number[] = []
  for (const ch of emoji) {
    const cp = ch.codePointAt(0)
    if (cp == null) continue
    if (cp === 0xfe0f) continue
    cps.push(cp)
  }
  return cps.map((c) => c.toString(16)).join('-')
}

export function twemojiUrl(emoji: string): string {
  return `${TWEMOJI_BASE}/${emojiToCodePoint(emoji)}.svg`
}

type TwemojiProps = {
  emoji: string
  size?: number
  className?: string
  alt?: string
  title?: string
}

export function Twemoji({ emoji, size = 20, className, alt = '', title }: TwemojiProps) {
  const src = useMemo(() => twemojiUrl(emoji), [emoji])
  return (
    <img
      src={src}
      alt={alt || emoji}
      title={title}
      width={size}
      height={size}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={cn('inline-block shrink-0 align-[-0.15em] select-none', className)}
      style={{ width: size, height: size }}
    />
  )
}
