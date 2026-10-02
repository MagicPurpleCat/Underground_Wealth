import { useEffect, useState } from 'react'
import { useFx } from '@/game/FxContext'
import { useGame } from '@/game/GameContext'

type Floater = { id: number; x: number; y: number; src: string }

export function DigParticles() {
  const { digBurst, events } = useFx()
  const { player, mines } = useGame()
  const [floaters, setFloaters] = useState<Floater[]>([])
  const mine = mines.find((m) => m.id === player?.mineId) ?? mines[0]
  const oreSrc = mine?.oreAsset ?? '/ores/ore-copper.jpg'

  useEffect(() => {
    if (!digBurst) return
    const batch: Floater[] = Array.from({ length: 5 }, (_, i) => ({
      id: digBurst * 10 + i,
      x: 38 + Math.random() * 24,
      y: 46 + Math.random() * 14,
      src: oreSrc,
    }))
    setFloaters((prev) => [...prev, ...batch])
    const t = window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => !batch.some((b) => b.id === f.id)))
    }, 650)
    return () => clearTimeout(t)
  }, [digBurst, oreSrc])

  const shaking = events.some((e) => e.kind === 'dig' && Date.now() - e.at < 220)
  const hitting = events.some((e) => e.kind === 'hit' && Date.now() - e.at < 280)

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${shaking ? 'anim-mine-punch' : ''} ${hitting ? 'anim-boss-shake' : ''}`}
      aria-hidden
    >
      {floaters.map((f) => (
        <img
          key={f.id}
          src={f.src}
          alt=""
          className="anim-float-ore absolute h-8 w-8 rounded-full object-cover shadow-md shadow-black/40"
          style={{ left: `${f.x}%`, top: `${f.y}%` }}
        />
      ))}
    </div>
  )
}
